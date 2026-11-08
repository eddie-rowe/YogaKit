# /autopm → /autodev Handoff — 2026-11-08

**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-11-08.md

## Ready-for-dev issues
- #266 dd-trace 6.15→6.24 (audit high) — P1 — package.json/lockfile, auto-ok
- #267 undici/vite dev-tooling highs — P2 — package.json/lockfile, auto-ok
- #268 copy-lint SCAN_DIRS single source — P3 — scripts/, tests/unit/copy-lint, auto-ok
- #220 005 US1 Today shell — already implemented in PR #227; owner browser pass, skip
- #61 002 US3 cohort roster — solo UI session; #218 needs Datadog access

## Held for human
- #263, #258, PR #227, PR #199, #47, #60, #97, #111, #176, #177

## /autodev routing
- #266 then #267 sequential (shared lockfile); #268 parallel with either. Dependabot: none open. Sync with ff-only.
