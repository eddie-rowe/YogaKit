#!/usr/bin/env bash
# Regenerate src/types/database.ts from the running local Supabase stack.
#
# Why this exists rather than just `npx supabase gen types typescript --local`:
# on macOS that command fails with
#
#   Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
#
# The CLI runs the generator in an ephemeral postgres-meta container and that
# container never receives the database password. Reproduced on CLI 2.113.0,
# 2.115.0 and 2.116.0, so it is not a regression in the current version, and
# `--db-url` is not a way around it (that container is not attached to the
# project network, so every host spelling gives ENOTFOUND). See FRICTION.md.
#
# CI is unaffected and still runs the official `--local` path via
# scripts/db-types-check.sh — do not repoint that script at this one. This is a
# local ergonomics shim, and it produces byte-identical output: the pg-meta
# container the stack already runs is the same generator the CLI would have
# started, queried over HTTP instead of through a broken container hand-off.
set -euo pipefail
cd "$(dirname "$0")/.."

# The stack names its containers and network after the project directory.
META="$(docker ps --filter 'name=supabase_pg_meta_' --format '{{.Names}}' | head -1)"
if [ -z "$META" ]; then
  echo "No running supabase_pg_meta container. Run: npx supabase start" >&2
  exit 1
fi
NETWORK="$(docker inspect "$META" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')"

OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT

# graphql_public is not optional: omitting it silently drops 28 lines the CLI
# emits. detect_one_to_one_relationships matches the CLI's own default.
docker run --rm --network "$NETWORK" curlimages/curl:latest -sS --fail \
  "http://$META:8080/generators/typescript?included_schemas=public,graphql_public&detect_one_to_one_relationships=true" \
  > "$OUT"

# The CLI writes a trailing newline the raw pg-meta response does not. Without
# this the db-types-check job fails on a one-line diff of a blank line.
printf '\n' >> "$OUT"

mv "$OUT" src/types/database.ts
trap - EXIT
echo "Wrote src/types/database.ts ($(wc -l < src/types/database.ts | tr -d ' ') lines)."
