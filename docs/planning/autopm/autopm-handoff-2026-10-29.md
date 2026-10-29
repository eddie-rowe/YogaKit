# /autopm → /autodev Handoff — 2026-10-29

**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-10-29.md

## Ready-for-dev issues (for /autodev to pick up)
- #218 RUM console/report error triage — P1 — src/ client error paths
- #212 005 US3 ReturnCard (T039/T040) — P2 — src/components/sadhana
- #213 005 US4 SharingPill UI (T046-T048) — P2 — src/components/sadhana
- #214 005 US6 GuidanceCard (T063) — P2 — src/components/sadhana
- #217 005 US1 log-for-yesterday UI (T023) — P2 — src/components/sadhana/CheckinForm.tsx
- #200 005 T007 guidance-tone draft — P2 — specs/005 docs
- #61 002 US3 cohort roster UI — billing-adjacent; check body

## Held for human (no auto-ok)
- #111, #176 (settings.json), #177, #97 (close), #60, #47 (RLS), #216 (Datadog access), PR #199 (005 C1 RLS, draft)

## /autodev routing
- #212, #213, #214, #217: separate component files, parallel-safe (#217 edits CheckinForm only). #218, #200, #61 are independent. Dependabot: none open.
