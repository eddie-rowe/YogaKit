# /autopm → /autodev Handoff — 2026-11-04

**Run time:** ~09:00 UTC
**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-11-04.md

## Ready-for-dev issues (for /autodev to pick up)
- #243 dashboard row view-model (T052 lib) — P2 — src/lib/sadhana
- #248 visibleRoster two-cohort tests (T056) — P2 — src/lib/sadhana/dashboard-roster*
- #247 006 tasks.md audit/reconcile (T013) — P2 — specs/006-profile-settings
- #249 DashboardRow component (T052 UI) — P2 — src/components/sadhana — **after #243**
- #218 RUM error triage — P3 — skip if Datadog needed
- #61 002 US3 cohort roster UI — P3 — check body for billing/RLS first
- #220 — superseded by held PR #227; do not rebuild

## Held for human (no auto-ok)
- PR #227, PR #199 (draft, RLS), #47, #60, #97, #111, #176, #177

## /autodev routing
- Parallel: #243, #247, #248 (disjoint files). Sequential: #249 after #243.
- Dependabot: none open. Sync: use `merge --ff-only`; `reset --hard` is blocked.
