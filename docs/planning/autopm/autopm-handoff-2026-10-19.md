# /autopm → /autodev Handoff — 2026-10-19

**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-10-19.md

## Ready-for-dev issues (for /autodev to pick up)
- #107 004 US5 drag insertion gap and seam encoding — P1 — composer (pick first)
- #179 005 T020 check-in offline outbox — P1 — src/lib/storage
- #180 005 T059/T060 guidance schema + validator — P2 — scripts/, data/guidance, CI
- #82 003 US4 filter affordances + score explanations — P1 — pose library UI
- #83 003 US5 theme taxonomy (14 themes) + subheads — P1 — pose library UI/data
- #61 002 US3 cohort roster UI — P2 — cohort/invite flow

## Held for human (no auto-ok)
- #111, #176 (settings.json), #177 (SLO assertion), #97, #60, #47

## Dependabot
- None open.

## /autodev routing
- #107 (composer), #179 (storage), #180 (scripts) touch disjoint areas — parallel. #82 and #83 share the pose library — sequential. #61 parallel.
