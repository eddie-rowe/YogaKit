# /autopm → /autodev Handoff — 2026-10-04

**Board health:** Needs Attention (owner-blocked; no stall)
**Audit:** docs/planning/autopm/2026-10-04.md

## Ready-for-dev issues
- #119 docs: 006 plan.md + tasks.md — P2 — area: specs/006-profile-settings (auto-ok; connector-independent, build first)
- #106 feat(004 US6) anchor warnings — P2 — area: composer (browser validation)
- #107 feat(004 US5) drag gap/seam hover — P2 — area: composer
- #108 feat(004 US8) inline depth escalation — P2 — area: composer
- #101 ci: regenerate src/types/database.ts (PR #90) — mechanical
- #96 datadog:apply homepage threshold — needs DD credentials

## Held for human (no auto-ok)
- #111, #97, #83, #82, #61, #60, #47; built PRs #90–#94, #98, #99, #105, #109. Dependabot: none open.

## /autodev routing
- #119 disjoint from composer work — parallel-safe. #106/#107/#108 touch composer — sequential.
