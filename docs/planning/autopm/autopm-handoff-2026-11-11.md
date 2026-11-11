# /autopm → /autodev Handoff — 2026-11-11

**Run time:** ~07:00 UTC (sweep ran after 08:20 autoobs)
**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-11-11.md

## Ready-for-dev issues (for /autodev to pick up)
- PR #277 (closes #276) — P1 — land it: retrigger CI (`update_pull_request_branch` if re-run 403s), merge when green
- #279 chore(security): vitest + @vitest/coverage-v8 → 4.1.12 — P1 — area: `package.json`/lockfile
- #280 feat(006 US6 T054a): Preferences section in /settings — P1 — area: `src/app/settings/`
- #281 feat(006 US6 T054b): compose + pose detail read through `migratePreferences` — P1 — area: `src/app/compose/`, `src/app/poses/`
- #61 002 US3 cohort UI — P2 — area: `src/app/org/` (large; take only with time left)

## Held for human (no auto-ok)
- PR #227 (Today route, browser validation), PR #199 (005 C1 schema + RLS), #273 (nav; waits on #227 + Teach decision), #47, #60, #258, #263, #111, #176, #177, #97, #218 (needs Datadog RUM access)

## /autodev routing
- Parallel-safe: #277, #279, #280, #281 (distinct areas). If both #280 and #281 add a `writePreference` helper to `src/lib/settings/preferences.ts`, run #280 first and rebase #281 on it (or run them sequentially).
- #279 touches the lockfile — merge it before or after the others, not mid-batch, to avoid lockfile conflicts.
- No Dependabot PRs open.
