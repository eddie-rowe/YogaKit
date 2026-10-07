# /autopm → /autodev Handoff — 2026-10-07

**Board health:** Needs Attention (owner-blocked; no stall)
**Audit:** docs/planning/autopm/2026-10-07.md

## Ready-for-dev issues (for /autodev to pick up)
- #130 security: npm audit fix sharp — P1 — area: package-lock.json
- #131 feat(006 US1) T020 no auth gate / storage-unavailable defaults — P2 — area: src/app/settings prefs path
- #132 feat(006 US1) T019 role change on next load — P2 — area: src/lib/settings
- #127 (PR #129 open, held needs-human: no browser validation), #107 (PR #122), #106 (PR #109) — skip
- #101 ci types regen (PR #90), #96 datadog:apply — need env/credentials

## Held for human (no auto-ok)
- #111, #108, #97, #83, #82, #61, #60, #47; built PRs #90–#94, #98, #99, #105, #109, #122, #129. Dependabot: none open.

## /autodev routing
- #130, #131, #132 touch disjoint areas — parallel-safe. Avoid editing SettingsClient.tsx (PR #129 open).
