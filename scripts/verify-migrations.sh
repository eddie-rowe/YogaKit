#!/usr/bin/env bash
# RLS-assertion CI harness (task T022, docs/design/002-schema.md §A/§D, plan.md
# Verification section). Ported from NextMove's scripts/verify-migrations.sh
# pattern: stub out just enough of Supabase (an `auth` schema, `auth.uid()`,
# and the `authenticated`/`anon`/`service_role` roles) on a bare Postgres, so
# this runs in plain CI without Docker or the Supabase CLI.
#
# Applies every migration from empty in order, then asserts the properties
# that must never regress:
#   - a bare `SELECT count(*) FROM memberships` as `authenticated` does NOT
#     raise 42P17 (infinite recursion) — the cheapest possible regression check
#     for the whole SECURITY DEFINER helper pattern (§A)
#   - a member of Org A gets zero rows from Org B via the RLS-gated tables
#   - removing an org's last owner raises restrict_violation
#   - an admin adding 'owner' to their own membership raises insufficient_privilege
#   - `app_entitlements('<other user>')` raises insufficient_privilege
#
# Later phases (US1-US5) append more DO blocks to this same file as their own
# tasks require (T024, T032, T033, T041, T042, T048, T055) — same pattern as
# tests/e2e-qa/auth-org-invite.spec.ts accumulating scenarios across phases.
#
# Usage: PGHOST=... PGUSER=postgres bash scripts/verify-migrations.sh
#        (creates and drops database yogakit_mig_verify)
set -euo pipefail
cd "$(dirname "$0")/.."

export PGDATABASE=postgres
psql -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS yogakit_mig_verify" \
  -c "CREATE DATABASE yogakit_mig_verify"
export PGDATABASE=yogakit_mig_verify

psql -v ON_ERROR_STOP=1 -q <<'EOF'
CREATE SCHEMA auth;
-- raw_user_meta_data is what app_handle_new_user() derives display_name from
-- (20260831190000_profile_bootstrap.sql); without the column the migration won't apply.
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')::text
$$;
DO $do$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;
GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
-- gen_random_uuid() lives in pgcrypto on a bare Postgres (Supabase ships it
-- pre-loaded); digest() (used by app_accept_invitation) needs it too.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
EOF

for f in $(ls supabase/migrations/*.sql | sort); do
  psql -v ON_ERROR_STOP=1 -q -f "$f"
  echo "OK   $(basename "$f")"
done

psql -v ON_ERROR_STOP=1 -q <<'EOF'
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Two orgs, three users: org A has owner + a plain member, org B has its own owner.
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@example.com', now()),
  ('a0000000-0000-0000-0000-000000000002', 'member-a@example.com', now()),
  ('a0000000-0000-0000-0000-000000000003', 'owner-b@example.com', now());

-- The bootstrap trigger already created these rows; overwrite with the deliberate
-- test names the assertions below refer to.
INSERT INTO profiles (id, display_name, timezone) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Owner A', 'America/Denver'),
  ('a0000000-0000-0000-0000-000000000002', 'Member A', 'America/Denver'),
  ('a0000000-0000-0000-0000-000000000003', 'Owner B', 'America/Denver')
ON CONFLICT (id) DO UPDATE
  SET display_name = excluded.display_name, timezone = excluded.timezone;

SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
SELECT app_create_organization('Org A', array['certifying_body']);
RESET request.jwt.claim.sub;

SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000003';
SELECT app_create_organization('Org B', array['studio']);
RESET request.jwt.claim.sub;

DO $do$
DECLARE
  v_org_a uuid;
  v_org_b uuid;
BEGIN
  SELECT id INTO v_org_a FROM organizations WHERE name = 'Org A';
  SELECT id INTO v_org_b FROM organizations WHERE name = 'Org B';

  -- Role must include 'admin', not just 'student': the self-escalation trigger
  -- test below updates this row as this same user, which only passes
  -- memberships_update_authorized_role's USING clause (owner/admin) if they
  -- already hold one of those roles — a plain student's UPDATE would be
  -- silently filtered to zero rows by RLS before the trigger ever runs.
  INSERT INTO memberships (org_id, user_id, roles, status)
  VALUES (v_org_a, 'a0000000-0000-0000-0000-000000000002', array['admin'], 'active');
END $do$;
EOF

# --- Regression check: bare SELECT on memberships as `authenticated` must not
# raise 42P17 (infinite recursion) — the cheapest check on the whole §A pattern.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
DO $do$ BEGIN
  PERFORM count(*) FROM memberships;
  RAISE NOTICE 'PASS bare SELECT on memberships does not raise 42P17';
EXCEPTION WHEN sqlstate '42P17' THEN
  RAISE EXCEPTION 'REGRESSION: memberships policy recurses (42P17) — see docs/design/002-schema.md §A';
END $do$;
RESET ROLE;
EOF

# --- Cross-org isolation: Org A's owner reads zero rows of Org B's memberships.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
DO $do$
DECLARE
  v_other_org_count int;
BEGIN
  SELECT count(*) INTO v_other_org_count
  FROM memberships
  WHERE org_id NOT IN (SELECT id FROM organizations WHERE name = 'Org A');
  IF v_other_org_count <> 0 THEN
    RAISE EXCEPTION 'RLS leak: Org A owner sees % rows outside Org A', v_other_org_count;
  END IF;
  RAISE NOTICE 'PASS cross-org isolation: Org A owner sees zero Org B membership rows';
END $do$;
RESET ROLE;
EOF

# --- Last-owner removal is blocked with restrict_violation.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
DO $do$
DECLARE
  v_org_a uuid;
BEGIN
  SELECT id INTO v_org_a FROM organizations WHERE name = 'Org A';
  UPDATE memberships SET status = 'suspended'
    WHERE org_id = v_org_a AND user_id = 'a0000000-0000-0000-0000-000000000001';
  RAISE EXCEPTION 'trigger failed to block removing the last owner';
EXCEPTION WHEN restrict_violation THEN
  RAISE NOTICE 'PASS last-owner removal blocked';
END $do$;
RESET ROLE;
EOF

# --- Self-escalation to owner is blocked with insufficient_privilege.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';
DO $do$
DECLARE
  v_org_a uuid;
BEGIN
  SELECT id INTO v_org_a FROM organizations WHERE name = 'Org A';
  UPDATE memberships SET roles = array['admin', 'owner']
    WHERE org_id = v_org_a AND user_id = 'a0000000-0000-0000-0000-000000000002';
  RAISE EXCEPTION 'trigger failed to block self-escalation to owner';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS self-escalation to owner blocked';
END $do$;
RESET ROLE;
EOF

# --- app_entitlements() escalation trap: reading another user's entitlements
# raises insufficient_privilege.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
DO $do$ BEGIN
  PERFORM app_entitlements('a0000000-0000-0000-0000-000000000002');
  RAISE EXCEPTION 'app_entitlements failed to block reading another user''s entitlements';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS app_entitlements() escalation trap blocks cross-user reads';
END $do$;
-- A caller reading their own entitlements must succeed.
DO $do$ BEGIN
  PERFORM app_entitlements('a0000000-0000-0000-0000-000000000001');
  RAISE NOTICE 'PASS app_entitlements() allows a caller to read their own entitlements';
END $do$;
RESET ROLE;
EOF

# --- Solo practitioner (T024): a brand-new user with zero memberships can read/update
# their own profile, and sees zero rows in memberships/organizations — the solo path
# needs no org row to exist at all, not just isolation across orgs.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('a0000000-0000-0000-0000-000000000004', 'solo@example.com', now());
INSERT INTO profiles (id, display_name, timezone) VALUES
  ('a0000000-0000-0000-0000-000000000004', 'Solo Practitioner', 'America/Denver')
ON CONFLICT (id) DO UPDATE
  SET display_name = excluded.display_name, timezone = excluded.timezone;
EOF

psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000004';
DO $do$
DECLARE
  v_own_count int;
  v_membership_count int;
  v_org_count int;
BEGIN
  SELECT count(*) INTO v_own_count FROM profiles WHERE id = (SELECT auth.uid());
  IF v_own_count <> 1 THEN
    RAISE EXCEPTION 'solo user cannot read their own profile row';
  END IF;

  UPDATE profiles SET display_name = 'Solo Practitioner Updated'
    WHERE id = (SELECT auth.uid());

  SELECT count(*) INTO v_membership_count FROM memberships
    WHERE user_id = (SELECT auth.uid());
  SELECT count(*) INTO v_org_count FROM organizations
    WHERE id = ANY (app_org_ids());
  IF v_membership_count <> 0 OR v_org_count <> 0 THEN
    RAISE EXCEPTION 'solo user with no membership rows sees non-zero org/membership counts';
  END IF;

  RAISE NOTICE 'PASS solo practitioner: reads/updates own profile, zero org/membership rows';
END $do$;
RESET ROLE;
EOF

# --- claimed_flows isolation (T030): a second user gets zero rows from another user's
# claimed_flows, same pattern as every other self-scoped table above.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000004';
INSERT INTO claimed_flows (user_id, source_flow_id, payload)
  VALUES ('a0000000-0000-0000-0000-000000000004', 'local-flow-1', '{"id":"local-flow-1"}'::jsonb);
RESET ROLE;
EOF

psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
DO $do$
DECLARE
  v_other_count int;
BEGIN
  SELECT count(*) INTO v_other_count FROM claimed_flows
    WHERE user_id = 'a0000000-0000-0000-0000-000000000004';
  IF v_other_count <> 0 THEN
    RAISE EXCEPTION 'RLS leak: caller sees % rows of another user''s claimed_flows', v_other_count;
  END IF;
  RAISE NOTICE 'PASS claimed_flows isolation: caller sees zero of another user''s rows';
END $do$;
RESET ROLE;
EOF

# --- T032: a member of Org A gets zero rows querying Org B's memberships/invitations.
# Owner B first creates a real invitation on Org B via the RPC, so the isolation check
# below proves something (a non-empty table Org A can't see), not just an empty table.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000003';
SELECT app_create_invitation(
  (SELECT id FROM organizations WHERE name = 'Org B'),
  'invitee-b@example.com',
  array['student']
);
RESET ROLE;
EOF

psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
DO $do$
DECLARE
  v_org_b uuid;
  v_membership_count int;
  v_invitation_count int;
BEGIN
  SELECT id INTO v_org_b FROM organizations WHERE name = 'Org B';

  SELECT count(*) INTO v_membership_count FROM memberships WHERE org_id = v_org_b;
  SELECT count(*) INTO v_invitation_count FROM invitations WHERE org_id = v_org_b;

  IF v_membership_count <> 0 OR v_invitation_count <> 0 THEN
    RAISE EXCEPTION 'RLS leak: Org A member sees % Org B memberships and % Org B invitations',
      v_membership_count, v_invitation_count;
  END IF;
  RAISE NOTICE 'PASS T032 cross-org isolation: Org A member sees zero Org B memberships/invitations';
END $do$;
RESET ROLE;
EOF

# --- T033: an invitation has zero SELECT visibility for any role prior to acceptance —
# including the org owner who created it. invitations has zero policies for any role
# (20260826224201_identity_tenancy.sql) by design; acceptance is a definer RPC keyed on
# the raw token, never a row read.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000003';
DO $do$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM invitations WHERE email = 'invitee-b@example.com';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS leak: invitations has % rows visible via a direct SELECT', v_count;
  END IF;
  RAISE NOTICE 'PASS T033 invitations: zero SELECT visibility for any role, even the creator';
END $do$;
RESET ROLE;
EOF

# --- T034: app_accept_invitation unions roles onto an existing membership rather than
# duplicating. Member A already holds {'admin'} in Org A; invite the same email with a
# disjoint role and confirm the accepted result is the union with no duplicates.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
DO $do$
DECLARE
  v_token text;
BEGIN
  SELECT raw_token INTO v_token FROM app_create_invitation(
    (SELECT id FROM organizations WHERE name = 'Org A'),
    'member-a@example.com',
    array['teacher']
  );
  PERFORM set_config('app.test_token', v_token, false);
END $do$;
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';
DO $do$
DECLARE
  v_roles text[];
BEGIN
  SELECT roles INTO v_roles FROM app_accept_invitation(current_setting('app.test_token'));
  IF NOT ('admin' = ANY(v_roles) AND 'teacher' = ANY(v_roles) AND cardinality(v_roles) = 2) THEN
    RAISE EXCEPTION 'role union incorrect: got %', v_roles;
  END IF;
  RAISE NOTICE 'PASS T034 app_accept_invitation unions roles without duplication: %', v_roles;
END $do$;
RESET ROLE;
EOF

# --- T035: the Phase 2 escalation triggers still fire under Phase 4's new RPC access
# paths (app_set_membership_roles/app_set_membership_status), not just via a raw UPDATE.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
-- A non-owner (admin) is rejected by the RPC's own authorization check, before the
-- trigger even runs.
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';
DO $do$
DECLARE
  v_membership_id uuid;
BEGIN
  SELECT id INTO v_membership_id FROM memberships
    WHERE org_id = (SELECT id FROM organizations WHERE name = 'Org A')
      AND user_id = (SELECT auth.uid());
  BEGIN
    PERFORM app_set_membership_roles(v_membership_id, array['owner']);
    RAISE EXCEPTION 'expected insufficient_privilege from app_set_membership_roles for a non-owner caller';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS T035 app_set_membership_roles rejects a non-owner caller';
  END;
END $do$;
RESET ROLE;

-- The org's sole owner cannot suspend their own (last owner) membership via the RPC —
-- trg_prevent_last_owner_removal still fires underneath app_set_membership_status.
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
DO $do$
DECLARE
  v_membership_id uuid;
BEGIN
  SELECT id INTO v_membership_id FROM memberships
    WHERE org_id = (SELECT id FROM organizations WHERE name = 'Org A')
      AND user_id = (SELECT auth.uid());
  BEGIN
    PERFORM app_set_membership_status(v_membership_id, 'suspended');
    RAISE EXCEPTION 'expected restrict_violation from app_set_membership_status removing the last owner';
  EXCEPTION WHEN restrict_violation THEN
    RAISE NOTICE 'PASS T035 app_set_membership_status still hits the last-owner-removal trigger';
  END;
END $do$;
RESET ROLE;
EOF

# --- Profile bootstrap: an auth.users insert alone must produce the profiles row (and,
# through trg_sync_profile_card, the profile_cards row) — and that user must then be able
# to create an organization with NO manual profiles insert anywhere. That last assertion
# is the actual regression this guards: memberships.user_id references profiles (id), so
# a missing bootstrap makes app_create_organization() raise foreign_key_violation for
# every new account, which is exactly what shipped before 20260831190000.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('a0000000-0000-0000-0000-000000000005', 'Bootstrap.User@example.com', now(), NULL),
  ('a0000000-0000-0000-0000-000000000006', 'oauth@example.com', now(),
   '{"full_name":"OAuth Person"}'::jsonb);

DO $do$
DECLARE
  v_otp_name  text;
  v_otp_tz    text;
  v_oauth_name text;
  v_card      text;
BEGIN
  SELECT display_name, timezone INTO v_otp_name, v_otp_tz
    FROM profiles WHERE id = 'a0000000-0000-0000-0000-000000000005';
  IF v_otp_name IS DISTINCT FROM 'Bootstrap.User' THEN
    RAISE EXCEPTION 'bootstrap did not derive display_name from the email local part: %', v_otp_name;
  END IF;
  IF v_otp_tz IS NULL THEN
    RAISE EXCEPTION 'bootstrap left timezone null, violating the NOT NULL contract';
  END IF;

  SELECT display_name INTO v_oauth_name
    FROM profiles WHERE id = 'a0000000-0000-0000-0000-000000000006';
  IF v_oauth_name IS DISTINCT FROM 'OAuth Person' THEN
    RAISE EXCEPTION 'bootstrap did not prefer raw_user_meta_data full_name: %', v_oauth_name;
  END IF;

  SELECT display_name INTO v_card
    FROM profile_cards WHERE user_id = 'a0000000-0000-0000-0000-000000000006';
  IF v_card IS DISTINCT FROM 'OAuth Person' THEN
    RAISE EXCEPTION 'trg_sync_profile_card did not populate profile_cards from the bootstrapped row';
  END IF;

  RAISE NOTICE 'PASS profile bootstrap creates profiles + profile_cards for both OAuth and OTP users';
END $do$;
EOF

# The whole point: a brand-new user creates an org with no manual profiles insert.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000006';
DO $do$
BEGIN
  PERFORM app_create_organization('Bootstrap Org', array['studio']);
  RAISE NOTICE 'PASS a freshly bootstrapped user can create an organization (no FK violation)';
EXCEPTION WHEN foreign_key_violation THEN
  RAISE EXCEPTION 'REGRESSION: app_create_organization raises foreign_key_violation — the profiles bootstrap is missing';
END $do$;
RESET ROLE;
EOF

# Re-inserting the same auth.users id must not error — sign-in happens many times,
# and the trigger's ON CONFLICT DO NOTHING is what keeps that true.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
DO $do$
DECLARE v_count int;
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
    VALUES ('a0000000-0000-0000-0000-000000000006', 'oauth@example.com', now(), NULL);
    RAISE EXCEPTION 'expected a duplicate auth.users insert to fail on its own primary key';
  EXCEPTION WHEN unique_violation THEN
    NULL;  -- auth.users' own PK rejected it, which is the real-world behaviour
  END;

  SELECT count(*) INTO v_count FROM profiles WHERE id = 'a0000000-0000-0000-0000-000000000006';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly one profiles row after a repeat signup, got %', v_count;
  END IF;
  RAISE NOTICE 'PASS bootstrap is idempotent: repeat signup leaves exactly one profiles row';
END $do$;
EOF

# --- 004 C1 / I1: flow_item_notes has no column a policy could join to an org.
# This is the structural half of Principle VIII and the only assertion here that holds
# against a migration nobody has written yet: I3-I7 prove today's policies behave, this
# proves tomorrow's migration cannot quietly stop them behaving (RULE-V1,
# specs/004-sequencing-composer/contracts/flow-sharing.md I1).
psql -v ON_ERROR_STOP=1 -q <<'EOF'
DO $do$
DECLARE v_bad text;
BEGIN
  SELECT string_agg(column_name, ', ') INTO v_bad
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'flow_item_notes'
     AND (column_name ~ '(org|cohort|team|role|visib|shared|public)');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'flow_item_notes gained a joinable column: % — see contracts/flow-sharing.md I1', v_bad;
  END IF;
  RAISE NOTICE 'PASS I1 flow_item_notes has no org/cohort/role/visibility column';
END $do$;
EOF

# --- 004 C1 / I2: every policy on flow_item_notes is keyed on the caller alone.
# The write policies additionally reach flows.user_id (so a user cannot squat the primary
# key of someone else's item), which is still the caller and still not an org.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
DO $do$
DECLARE
  v_count int;
  v_bad   text;
  v_sel   text;
BEGIN
  SELECT count(*) INTO v_count FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'flow_item_notes';
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'expected exactly 4 policies on flow_item_notes, found %', v_count;
  END IF;

  SELECT string_agg(policyname, ', ') INTO v_bad FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'flow_item_notes'
     AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '(org|cohort|team|role)';
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'a flow_item_notes policy mentions an org/cohort/role: %', v_bad;
  END IF;

  SELECT qual INTO v_sel FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'flow_item_notes' AND cmd = 'SELECT';
  IF v_sel !~ 'user_id' OR v_sel ~ 'flows' THEN
    RAISE EXCEPTION 'the flow_item_notes SELECT policy is not the caller alone: %', v_sel;
  END IF;

  RAISE NOTICE 'PASS I2 flow_item_notes carries four caller-keyed policies and no join path';
END $do$;
EOF

# --- 004 C1: app_save_flow is SECURITY INVOKER. If this ever flips to DEFINER, every
# policy above stops applying inside it and the feature's whole guarantee is gone.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
DO $do$
DECLARE v_def boolean;
BEGIN
  SELECT prosecdef INTO v_def FROM pg_proc WHERE proname = 'app_save_flow';
  IF v_def IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'app_save_flow is SECURITY DEFINER — RLS no longer applies inside it';
  END IF;
  RAISE NOTICE 'PASS app_save_flow is SECURITY INVOKER, so RLS applies to every statement in it';
END $do$;
EOF

# --- 004 C1: app_save_flow shreds a Flow document into four tables in one transaction,
# and a re-save converges rather than accumulating (FR-017).
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
DO $do$
DECLARE
  v_flow uuid := 'f0000000-0000-0000-0000-000000000001';
  v_i1   uuid := 'f1000000-0000-0000-0000-000000000001';
  v_i2   uuid := 'f1000000-0000-0000-0000-000000000002';
  v_p1   uuid := 'f2000000-0000-0000-0000-000000000001';
  v_items int; v_phases int; v_notes int; v_title text; v_measure int;
BEGIN
  PERFORM app_save_flow(jsonb_build_object(
    'id', v_flow, 'title', 'Morning', 'schema_version', '0.1.0',
    'createdAt', now(), 'updatedAt', now(),
    'phases', jsonb_build_array(
      jsonb_build_object('id', v_p1, 'name', 'Opening', 'intentTag', 'samana', 'order', 0)),
    'items', jsonb_build_array(
      jsonb_build_object('id', v_i1, 'poseSlug', 'mountain', 'mode', 'yang',
                         'measure', jsonb_build_object('breaths', 5),
                         'phaseId', v_p1, 'order', 0, 'note', 'left hip stays heavy'),
      jsonb_build_object('id', v_i2, 'poseSlug', 'savasana', 'mode', 'yin',
                         'measure', jsonb_build_object('seconds', 300),
                         'phaseId', null, 'order', 1))));

  SELECT count(*) INTO v_items  FROM flow_items WHERE flow_id = v_flow;
  SELECT count(*) INTO v_phases FROM phases     WHERE flow_id = v_flow;
  SELECT count(*) INTO v_notes  FROM flow_item_notes n JOIN flow_items i ON i.id = n.flow_item_id
   WHERE i.flow_id = v_flow;
  SELECT measure_breaths INTO v_measure FROM flow_items WHERE id = v_i1;
  IF (v_items, v_phases, v_notes, v_measure) IS DISTINCT FROM (2, 1, 1, 5) THEN
    RAISE EXCEPTION 'app_save_flow shred wrong: % items, % phases, % notes, measure %',
      v_items, v_phases, v_notes, v_measure;
  END IF;

  -- Re-save: one item dropped, the note cleared, the title changed. A cleared note must be
  -- a deleted row, because the share query relies on the row's absence, not on its content.
  PERFORM app_save_flow(jsonb_build_object(
    'id', v_flow, 'title', 'Morning, shorter', 'schema_version', '0.1.0',
    'createdAt', now(), 'updatedAt', now(),
    'phases', '[]'::jsonb,
    'items', jsonb_build_array(
      jsonb_build_object('id', v_i1, 'poseSlug', 'mountain', 'mode', 'yang',
                         'measure', jsonb_build_object('breaths', 8),
                         'phaseId', null, 'order', 0))));

  SELECT count(*) INTO v_items  FROM flow_items WHERE flow_id = v_flow;
  SELECT count(*) INTO v_phases FROM phases     WHERE flow_id = v_flow;
  SELECT count(*) INTO v_notes  FROM flow_item_notes WHERE flow_item_id = v_i1;
  SELECT title INTO v_title FROM flows WHERE id = v_flow;
  IF (v_items, v_phases, v_notes, v_title)
     IS DISTINCT FROM (1, 0, 0, 'Morning, shorter') THEN
    RAISE EXCEPTION 're-save did not converge: % items, % phases, % notes, title %',
      v_items, v_phases, v_notes, v_title;
  END IF;

  RAISE NOTICE 'PASS app_save_flow shreds a Flow into four tables and a re-save converges';
END $do$;
RESET ROLE;
EOF

# --- 004 C1: a second account, in a different org, reads zero rows of any of the four
# tables — including the notes table, by a direct select of its own.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000003';
DO $do$
DECLARE v_f int; v_p int; v_i int; v_n int;
BEGIN
  SELECT count(*) INTO v_f FROM flows;
  SELECT count(*) INTO v_p FROM phases;
  SELECT count(*) INTO v_i FROM flow_items;
  SELECT count(*) INTO v_n FROM flow_item_notes;
  IF (v_f, v_p, v_i, v_n) IS DISTINCT FROM (0, 0, 0, 0) THEN
    RAISE EXCEPTION 'RLS leak: another account sees % flows, % phases, % items, % notes',
      v_f, v_p, v_i, v_n;
  END IF;
  RAISE NOTICE 'PASS another account reads zero rows of flows/phases/flow_items/flow_item_notes';
END $do$;
RESET ROLE;
EOF

# --- 004 C1: SECURITY INVOKER, tested rather than asserted. A payload naming someone
# else's flow id writes nothing and leaves the original untouched.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000003';
DO $do$
DECLARE v_flow uuid := 'f0000000-0000-0000-0000-000000000001';
BEGIN
  BEGIN
    PERFORM app_save_flow(jsonb_build_object(
      'id', v_flow, 'title', 'Stolen', 'schema_version', '0.1.0',
      'createdAt', now(), 'updatedAt', now(),
      'phases', '[]'::jsonb, 'items', '[]'::jsonb));
  EXCEPTION WHEN insufficient_privilege OR unique_violation THEN
    NULL;  -- either shape is fine; what matters is the row below
  END;
  IF EXISTS (SELECT 1 FROM flows WHERE user_id = 'a0000000-0000-0000-0000-000000000003') THEN
    RAISE EXCEPTION 'app_save_flow let a caller write a flow they do not own';
  END IF;
  RAISE NOTICE 'PASS app_save_flow writes nothing for a payload naming another account''s flow';
END $do$;
RESET ROLE;
EOF

# The original is unchanged, checked as its owner rather than through the attacker's
# (empty) view.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
DO $do$
DECLARE v_title text;
BEGIN
  SELECT title INTO v_title FROM flows WHERE id = 'f0000000-0000-0000-0000-000000000001';
  IF v_title IS DISTINCT FROM 'Morning, shorter' THEN
    RAISE EXCEPTION 'another account overwrote the owner''s flow title: %', v_title;
  END IF;
  RAISE NOTICE 'PASS the owner''s flow survived the foreign app_save_flow attempt intact';
END $do$;
RESET ROLE;
EOF

# --- 004 C1: the soft delete replicates, and stays the caller's own.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
SET ROLE authenticated;
SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
DO $do$
DECLARE v_deleted timestamptz;
BEGIN
  PERFORM app_delete_flow('f0000000-0000-0000-0000-000000000001');
  SELECT deleted_at INTO v_deleted FROM flows WHERE id = 'f0000000-0000-0000-0000-000000000001';
  IF v_deleted IS NULL THEN
    RAISE EXCEPTION 'app_delete_flow did not set deleted_at';
  END IF;

  -- A later save revives it: the teacher edited the flow, so they still have it.
  PERFORM app_save_flow(jsonb_build_object(
    'id', 'f0000000-0000-0000-0000-000000000001', 'title', 'Morning, back',
    'schema_version', '0.1.0', 'createdAt', now(), 'updatedAt', now(),
    'phases', '[]'::jsonb, 'items', '[]'::jsonb));
  SELECT deleted_at INTO v_deleted FROM flows WHERE id = 'f0000000-0000-0000-0000-000000000001';
  IF v_deleted IS NOT NULL THEN
    RAISE EXCEPTION 'a save on a soft-deleted flow did not revive it';
  END IF;
  RAISE NOTICE 'PASS app_delete_flow soft-deletes and a later save revives';
END $do$;
RESET ROLE;
EOF

# --- 004 C1: the claimed_flows backfill. It ran during the migration loop above against
# an empty table, which proves only that it parses. Seed a claim and re-run the same file:
# it is written to be idempotent, so running it twice is a legitimate test, not a hack.
psql -v ON_ERROR_STOP=1 -q <<'EOF'
INSERT INTO claimed_flows (user_id, source_flow_id, payload) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000009',
  jsonb_build_object(
    'schema_version', '0.1.0', 'exported_at', now(),
    'flow', jsonb_build_object(
      'id', 'c0000000-0000-0000-0000-000000000009', 'title', 'Claimed evening',
      'schema_version', '0.1.0', 'createdAt', now(), 'updatedAt', now(), 'isBuiltIn', false,
      'phases', jsonb_build_array(
        jsonb_build_object('id', 'c2000000-0000-0000-0000-000000000001',
                           'name', 'Settle', 'intentTag', 'langhana', 'order', 0)),
      'items', jsonb_build_array(
        jsonb_build_object('id', 'c1000000-0000-0000-0000-000000000001',
                           'poseSlug', 'butterfly', 'mode', 'yin',
                           'measure', jsonb_build_object('seconds', 180),
                           'phaseId', 'c2000000-0000-0000-0000-000000000001', 'order', 0,
                           'note', 'she prefers a block under the sacrum'),
        jsonb_build_object('id', 'c1000000-0000-0000-0000-000000000002',
                           'poseSlug', 'savasana', 'mode', 'yin',
                           'measure', jsonb_build_object('seconds', 300),
                           'phaseId', null, 'order', 1)))));
-- A claim whose flow id is not a uuid: the audit trail keeps it, the backfill steps over it.
INSERT INTO claimed_flows (user_id, source_flow_id, payload) VALUES (
  'a0000000-0000-0000-0000-000000000002', 'legacy-flow-7',
  jsonb_build_object('schema_version', '0.1.0', 'flow',
    jsonb_build_object('id', 'legacy-flow-7', 'title', 'Unkeyable')));
EOF

psql -v ON_ERROR_STOP=1 -q -f supabase/migrations/20260903091000_backfill_claimed_flows.sql
psql -v ON_ERROR_STOP=1 -q -f supabase/migrations/20260903091000_backfill_claimed_flows.sql

psql -v ON_ERROR_STOP=1 -q <<'EOF'
DO $do$
DECLARE
  v_id uuid := 'c0000000-0000-0000-0000-000000000009';
  v_flows int; v_items int; v_phases int; v_notes int; v_owner uuid; v_note text;
BEGIN
  SELECT count(*) INTO v_flows FROM flows WHERE id = v_id;
  SELECT count(*) INTO v_items  FROM flow_items WHERE flow_id = v_id;
  SELECT count(*) INTO v_phases FROM phases WHERE flow_id = v_id;
  SELECT count(*) INTO v_notes  FROM flow_item_notes n
    JOIN flow_items i ON i.id = n.flow_item_id WHERE i.flow_id = v_id;
  SELECT user_id INTO v_owner FROM flows WHERE id = v_id;
  SELECT note INTO v_note FROM flow_item_notes
   WHERE flow_item_id = 'c1000000-0000-0000-0000-000000000001';

  IF (v_flows, v_items, v_phases, v_notes) IS DISTINCT FROM (1, 2, 1, 1) THEN
    RAISE EXCEPTION 'backfill is not idempotent: % flows, % items, % phases, % notes',
      v_flows, v_items, v_phases, v_notes;
  END IF;
  IF v_owner IS DISTINCT FROM 'a0000000-0000-0000-0000-000000000002'::uuid THEN
    RAISE EXCEPTION 'backfill assigned the wrong owner: %', v_owner;
  END IF;
  IF v_note IS DISTINCT FROM 'she prefers a block under the sacrum' THEN
    RAISE EXCEPTION 'backfill lost the author-only note: %', v_note;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM claimed_flows WHERE source_flow_id = 'legacy-flow-7') THEN
    RAISE EXCEPTION 'the backfill deleted an audit-trail row it could not key';
  END IF;
  RAISE NOTICE 'PASS claimed_flows backfill materializes, keeps the note, and re-runs clean';
END $do$;
EOF

export PGDATABASE=postgres
psql -q -c "DROP DATABASE yogakit_mig_verify"
echo "MIGRATION VERIFICATION PASSED"
