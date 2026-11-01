# /autopm → /autodev Handoff — 2026-11-01

**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-11-01.md

## Ready-for-dev issues (for /autodev to pick up)
- #231 RUM LCP/INP config audit — P1 — src/instrumentation-client.ts, src/lib/telemetry
- #228 practiced-today lib (T054) — P2 — src/lib/sadhana
- #229 re-entry offer lib (T041) — P2 — src/lib/sadhana
- #230 dashboard roster filter (T056) — P2 — src/lib/sadhana
- #218 RUM error triage — P3 — needs Datadog access; skip if not reachable
- #61 002 US3 cohort roster UI — P3 — check body for billing/RLS first
- #220 — superseded by held PR #227; do not rebuild

## Held for human (no auto-ok)
- PR #227 (browser validation), PR #199 (draft, RLS), #47, #60, #97, #111, #176, #177

## /autodev routing
- #231 solo (telemetry area). #228, #229, #230 are separate new files in src/lib/sadhana and can run in parallel. Dependabot: none open.
