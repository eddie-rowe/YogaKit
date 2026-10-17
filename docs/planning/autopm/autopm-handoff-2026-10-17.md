# /autopm → /autodev Handoff — 2026-10-17

**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-10-17.md

## Ready-for-dev issues (for /autodev to pick up)
- #170 005 C0 research.md + data-model.md — P1 — codebase area: specs/005 (docs)
- #171 005 resolveLocalDay() — P1 — codebase area: src/lib/sadhana
- #172 005 computeStreak() + generated-history tests — P1 — codebase area: src/lib/sadhana, data/sadhana (after #170)
- #107 004 US5 drag insertion gap + seam hover — P1 — codebase area: 004 composer
- #165, #166 — implemented in open PR #168 (held needs-human, browser validation)

## Held for human (no auto-ok)
- #96, #111, #108, #97 (stale-open), #83, #82, #61, #60, #47 — see owner-digest #38 (unchanged)

## Dependabot
- None open. npm audit clean.

## /autodev routing
- #170 → #172 sequential. #171 and #107 parallel to everything (disjoint areas).
