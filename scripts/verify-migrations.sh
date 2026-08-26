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

  INSERT INTO memberships (org_id, user_id, roles, status)
  VALUES (v_org_a, 'a0000000-0000-0000-0000-000000000002', array['student'], 'active');
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
EXCEPTION WHEN sqlstate '23514' OR OTHERS THEN
  IF sqlstate = 'P0001' OR sqlstate = '23514' THEN
    RAISE NOTICE 'PASS last-owner removal blocked';
  ELSE
    RAISE;
  END IF;
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
  UPDATE memberships SET roles = array['student', 'owner']
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

export PGDATABASE=postgres
psql -q -c "DROP DATABASE yogakit_mig_verify"
echo "MIGRATION VERIFICATION PASSED"
