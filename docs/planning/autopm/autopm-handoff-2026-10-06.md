# /autopm → /autodev Handoff — 2026-10-06

**Run time:** ~09:30 UTC
**Board health:** Needs Attention (owner-blocked; no stall)
**Audit:** docs/planning/autopm/2026-10-06.md

## Ready-for-dev issues (for /autodev to pick up)
- #127 feat(006 US1): SettingsClient renders from visibleSections (T016) — P2 — area: src/app/settings (new, parallel-safe)
- #126 security: npm audit fix source-map-js — P1 — area: package-lock.json
- #107 feat(004 US5) — area: composer (PR #122 open, awaiting browser validation)
- #106 feat(004 US6) — area: composer (PR #109 open)
- #101 ci: regenerate src/types/database.ts (PR #90) — mechanical
- #96 datadog:apply homepage threshold — needs DD credentials

## Held for human (no auto-ok)
- #111, #108, #97, #83, #82, #61, #60, #47; built PRs #90–#94, #98, #99, #105, #109, #122. Dependabot: none open.

## /autodev routing
- #126 and #127 touch disjoint areas — parallel-safe. #106/#107 already have open PRs — skip.
