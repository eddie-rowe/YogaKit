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
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
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

INSERT INTO profiles (id, display_name, timezone) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Owner A', 'America/Denver'),
  ('a0000000-0000-0000-0000-000000000002', 'Member A', 'America/Denver'),
  ('a0000000-0000-0000-0000-000000000003', 'Owner B', 'America/Denver');

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
  ('a0000000-0000-0000-0000-000000000004', 'Solo Practitioner', 'America/Denver');
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

export PGDATABASE=postgres
psql -q -c "DROP DATABASE yogakit_mig_verify"
echo "MIGRATION VERIFICATION PASSED"
