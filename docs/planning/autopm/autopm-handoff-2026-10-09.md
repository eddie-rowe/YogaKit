# /autopm → /autodev Handoff — 2026-10-09

**Board health:** Needs Attention (owner-blocked; no stall)
**Audit:** docs/planning/autopm/2026-10-09.md

## Ready-for-dev issues (for /autodev to pick up)
- #137 feat(006 US3) T034/T035 claim.ts itemize — P2 — area: src/lib/settings/claim.ts (new)
- #138 feat(006 US6) T052/T053 preferences.ts — P2 — area: src/lib/settings/preferences.ts (new)
- #134, #131, #132 — carried; avoid SettingsClient.tsx (PR #129 open)
- #127, #107, #106 — skip (PRs open); #101, #96 need env

## Held for human (no auto-ok)
- #111, #108, #97, #83, #82, #61, #60, #47; built PRs #90–#94, #98, #99, #105, #109, #122, #129. Dependabot: none open.

## /autodev routing
- #137, #138, #134, #131, #132 touch disjoint areas — parallel-safe.
