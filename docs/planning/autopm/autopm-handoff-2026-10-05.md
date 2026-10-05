# /autopm → /autodev Handoff — 2026-10-05

**Run time:** ~09:30 UTC
**Board health:** Needs Attention (owner-blocked; no stall)
**Audit:** docs/planning/autopm/2026-10-05.md

## Ready-for-dev issues (for /autodev to pick up)
- #124 feat(006 US1): pure visibleSections + unit tests — P2 — codebase area: src/lib/settings (new files; build first)
- #107 feat(004 US5) drag gap/seam hover — P2 — area: composer (PR #122 open, awaiting browser validation)
- #106 feat(004 US6) anchor warnings — P2 — area: composer (PR #109 open)
- #101 ci: regenerate src/types/database.ts (PR #90) — mechanical
- #96 datadog:apply homepage threshold — needs DD credentials

## Held for human (no auto-ok)
- #111, #108, #97, #83, #82, #61, #60, #47; built PRs #90–#94, #98, #99, #105, #109, #122. Dependabot: none open.

## /autodev routing
- #124 is disjoint from composer work — parallel-safe. #106/#107 touch composer and already have open PRs — sequential, skip if still awaiting validation.
