# /autopm → /autodev Handoff — 2026-10-08

**Board health:** Needs Attention (owner-blocked; no stall)
**Audit:** docs/planning/autopm/2026-10-08.md

## Ready-for-dev issues (for /autodev to pick up)
- #134 feat(006 US1) T018 section shells — P2 — area: src/app/settings/sections/ (new files only)
- #135 docs(006 US1) T013 FR-001..007 audit — P2 — area: specs/006-profile-settings/
- #131, #132 (006 US1 T020/T019) — carried; avoid SettingsClient.tsx (PR #129 open)
- #127 (PR #129 open), #107 (PR #122), #106 (PR #109) — skip; #101, #96 need env

## Held for human (no auto-ok)
- #111, #108, #97, #83, #82, #61, #60, #47; built PRs #90–#94, #98, #99, #105, #109, #122, #129. Dependabot: none open.

## /autodev routing
- #134, #135, #131, #132 touch disjoint areas — parallel-safe.
