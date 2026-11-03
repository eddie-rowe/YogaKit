# /autopm → /autodev Handoff — 2026-11-03

**Run time:** ~09:00 UTC
**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-11-03.md

## Ready-for-dev issues (for /autodev to pick up)
- #237 status pill (T053) — P2 — src/components/sadhana
- #241 initials lib (T068) — P2 — src/lib/account
- #242 sharing-window lib (T051) — P2 — src/lib/sadhana
- #243 dashboard row view-model (T052) — P2 — src/lib/sadhana
- #218 RUM error triage — P3 — needs Datadog access; skip if not reachable
- #61 002 US3 cohort roster UI — P3 — check body for billing/RLS first
- #220 — superseded by held PR #227; do not rebuild

## Held for human (no auto-ok)
- PR #227 (browser validation), PR #199 (draft, RLS), #47, #60, #97, #111, #176, #177

## /autodev routing
- #237, #241, #242, #243 touch separate new files; run in parallel. Dependabot: none open.
- Sync step: use `git merge --ff-only origin/main`; `reset --hard` is classifier-blocked.
