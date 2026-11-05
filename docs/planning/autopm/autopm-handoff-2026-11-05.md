# /autopm → /autodev Handoff — 2026-11-05

**Run time:** ~09:00 UTC
**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-11-05.md

## Ready-for-dev issues (for /autodev to pick up)
- #249 DashboardRow component (T052 UI) — P2 — src/components/sadhana (new file); #243 merged, unblocked
- #253 SC-010 return-card composed test (T045) — P2 — tests/unit/sadhana (new file)
- #254 re-entry offer in ReturnCard (T041) — P2 — src/components/sadhana/ReturnCard.tsx
- #61 002 US3 cohort roster UI — P3 — body rewritten 10-23; no billing/RLS; browser validation needed, solo
- #218 RUM error triage — P3 — skip the Datadog part

## Held for human (no auto-ok)
- PR #227 (browser), PR #199 (draft, RLS), #47, #60, #97, #111, #176, #177

## /autodev routing
- Parallel: #249, #253, #254 (disjoint files). #61 sequential, alone.
- Dependabot: none open. Sync: use `checkout main` + `pull --ff-only`; `reset --hard` is blocked.
