# /autopm → /autodev Handoff — 2026-11-02

**Run time:** 09:20 UTC
**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-11-02.md

## Ready-for-dev issues (for /autodev to pick up)
- #230 dashboard roster filter (T056) — P2 — src/lib/sadhana
- #235 boundary caption (T055) — P2 — src/components/sadhana
- #236 undo toast (T050) — P2 — src/components/sadhana
- #237 status pill (T053) — P2 — src/components/sadhana
- #218 RUM error triage — P3 — needs Datadog access; skip if not reachable
- #61 002 US3 cohort roster UI — P3 — check body for billing/RLS first
- #220 — superseded by held PR #227; do not rebuild

## Held for human (no auto-ok)
- PR #227 (browser validation), PR #199 (draft, RLS), #47, #60, #97, #111, #176, #177

## /autodev routing
- #230, #235, #236, #237 touch separate new files; run in parallel. Dependabot: none open.
