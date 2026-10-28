# /autopm → /autodev Handoff — 2026-10-28

**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-10-28.md

## Ready-for-dev issues (for /autodev to pick up)
- #205 milestone card — P2 — PR #209 already open with CI green; merge it, don't rebuild
- #212 005 US3 ReturnCard (T039/T040) — P2 — src/components/sadhana
- #213 005 US4 SharingPill UI (T046-T048) — P2 — src/components/sadhana
- #214 005 US6 GuidanceCard (T063) — P2 — src/components/sadhana
- #200 005 T007 guidance-tone draft — P2 — specs/005 docs
- #83 003 US5 theme taxonomy close — P1 — pose library UI
- #61 002 US3 cohort roster UI — billing-adjacent; check body

## Held for human (no auto-ok)
- #111, #176 (settings.json), #177, #97 (close), #60, #47 (RLS), PR #199 (005 C1 RLS, draft)

## /autodev routing
- #212, #213, #214 are separate files under src/components/sadhana, so they are parallel-safe. #200 (docs), #83 and #61 are independent. Dependabot: none open.
