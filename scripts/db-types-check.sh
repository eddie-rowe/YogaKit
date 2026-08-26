#!/usr/bin/env bash
# Drift check for src/types/database.ts (task T016, research.md item 5).
#
# NextMove has no generated types at all — every Supabase query there is
# untyped, which is the gap this task exists to not inherit. Regenerates
# types against the migrations actually applied to a local Supabase instance
# and fails if the committed file doesn't match, so a migration can never
# land without its types.
#
# Requires a running local Supabase (`npx supabase start`) with this
# project's migrations applied (`npx supabase db reset`) — same requirement
# as scripts/verify-migrations.sh's live counterpart, the Supabase CLI path.
set -euo pipefail
cd "$(dirname "$0")/.."

GENERATED="$(mktemp)"
trap 'rm -f "$GENERATED"' EXIT

npx supabase gen types typescript --local > "$GENERATED"

if ! diff -q "$GENERATED" src/types/database.ts > /dev/null 2>&1; then
  echo "src/types/database.ts is out of date with the applied migrations." >&2
  echo "Run: npx supabase gen types typescript --local > src/types/database.ts" >&2
  diff -u src/types/database.ts "$GENERATED" || true
  exit 1
fi

echo "src/types/database.ts matches the applied migrations."
