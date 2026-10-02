# /autopm → /autodev Handoff — 2026-10-02

**Board health:** Needs Attention (owner-blocked; no stall)
**Audit:** docs/planning/autopm/2026-10-02.md

## Ready-for-dev issues
- #107 feat(004 US5): drag gap + seam hover/tier — P2 — area: src/app/compose/, globals.css (auto-ok)
- #108 feat(004 US8): inline depth escalation — P3 — area: src/app/compose/ (auto-ok; after #107)

## Held for human (no auto-ok)
- #111 (settings.json), #96 datadog:apply, #101 db-types regen (PR #90), #97/#82/#83/#47, #60/#61
- Built PRs awaiting owner: #90–#94, #98, #99, #105, #109. Dependabot: none open.

## /autodev routing
- Sequential: #107 -> #108 (same area). Note both need browser validation (known friction).
- Connector-independent supply is exhausted (scans clean, no Dependabot, 004 complete); only 2 truly buildable auto-ok issues remain (<3 target).
