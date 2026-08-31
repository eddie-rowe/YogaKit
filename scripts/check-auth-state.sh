#!/usr/bin/env bash
# Reads back what a real sign-in produced: the auth.users row, the profiles row the
# 20260831190000 trigger should have bootstrapped from it, the profile_cards row
# trg_sync_profile_card mirrors, and any organization/membership created after.
#
# Read-only. Usage: bash scripts/check-auth-state.sh
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.local; set +a
REF="${SUPABASE_PROJECT_REF:-ydvxgjhvblrlnjqysoko}"

q() {
  python3 -c "import json,sys;json.dump({'query':sys.argv[1]},sys.stdout)" "$1" > /tmp/_authchk.json
  echo "── $2"
  curl -sS -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
    --data @/tmp/_authchk.json | python3 -m json.tool
  rm -f /tmp/_authchk.json
}

q "select id, email, created_at, raw_user_meta_data->>'full_name' as google_full_name from auth.users order by created_at" "auth.users"
q "select id, display_name, timezone, created_at from profiles order by created_at" "profiles (bootstrapped by trigger)"
q "select user_id, display_name from profile_cards order by user_id" "profile_cards (mirrored)"
q "select o.id, o.name, o.org_types, m.roles, m.status from organizations o join memberships m on m.org_id = o.id" "organizations + memberships"
