# /autopm → /autodev Handoff — 2026-10-10

**Board health:** Needs Attention (owner-blocked; no stall)
**Audit:** docs/planning/autopm/2026-10-10.md

## Ready-for-dev issues (for /autodev to pick up)
- #140 feat(006 US6) T050 theme.ts conformance — P2 — area: src/lib/theme.ts
- #141 chore(006 US1) T023 lint:copy over settings strings — P2 — area: src/lib/settings/*, copy-lint scope
- #134, #131, #132 — carried; avoid SettingsClient.tsx (PR #129 open)
- #127, #107, #106 — skip (PRs open); #101, #96 need env

## Held for human (no auto-ok)
- #111, #108, #97, #83, #82, #61, #60, #47; built PRs #90–#94, #98, #99, #105, #109, #122, #129. Dependabot: none open.

## /autodev routing
- #140, #141, #134, #131, #132 touch disjoint areas — parallel-safe.
