# /autopm → /autodev Handoff — 2026-10-20

**Run time:** ~08:40 UTC
**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-10-20.md

## Ready-for-dev issues (for /autodev to pick up)
- #107 004 US5 drag insertion gap + seam encoding — P1 — composer (pick first)
- #82 003 US4 filter affordances + score explanations — P1 — pose library UI (copy signed off)
- #83 003 US5 theme taxonomy (14 themes) + subheads — P1 — pose library UI/data (copy signed off; follows #82)
- #183 005 T031 practice-state model — P1 — src/lib/sadhana
- #184 005 T033 milestone selection model — P2 — src/lib/sadhana
- #61 002 US3 cohort roster UI — P2 — cohort/invite flow

## Held for human (no auto-ok)
- #111, #176 (settings.json), #177 (SLO assertion), #97, #60, #47 (RLS)

## /autodev routing
- #107, #183, #184, #61 disjoint areas — parallel (#183/#184 different files in src/lib/sadhana). #82 then #83 sequential.
