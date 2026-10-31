# /autopm → /autodev Handoff — 2026-10-31

**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-10-31.md

## Ready-for-dev issues (for /autodev to pick up)
- #218 RUM console/report error triage — P1 — src/ client error paths (solo, first; still unworked)
- #220 005 Today route shell, in-memory — P2 — src/app/today
- #223 005 return-card visibility lib (T042/T043) — P2 — src/lib/sadhana
- #224 lint:copy scope to data/guidance — P2 — scripts/lib/copy-lint.mjs
- #61 002 US3 cohort roster UI — P3 — check body; not billing/RLS, but large

## Held for human (no auto-ok)
- #111, #176 (settings.json), #177, #97 (close), #60, #47 (RLS), PR #199 (draft, RLS)

## /autodev routing
- #218 solo first. #220, #223, #224 touch disjoint areas and can run in parallel. #61 independent. Dependabot: none open.
