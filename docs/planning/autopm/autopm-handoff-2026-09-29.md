# /autopm → /autodev Handoff — 2026-09-29

**Run time:** ~09:30 UTC
**Board health:** Good
**Audit:** docs/planning/autopm/2026-09-29.md

## Ready-for-dev issues (for /autodev to pick up)
- #106 feat(004 US6): anchor warnings + per-session dismissal — P2 — area: src/app/compose/ (auto-ok)
- #107 feat(004 US5): drag insertion gap + seam hover/tier — P2 — area: src/app/compose/, globals.css (auto-ok)
- #108 feat(004 US8): inline depth escalation — P3 — area: src/app/compose/ + poses depth component (auto-ok)

## Held for human (no auto-ok)
- #96 datadog:apply — sandbox policy wall (5th sweep; do not retry unchanged)
- #101 db types regen — no Docker in headless session
- #90-#94, #98, #99, #105 — built PRs awaiting owner nod (RLS/auth/copy); #47/#82/#83/#97 issues
- Dependabot: none open.

## /autodev routing
- #106, #107, #108 all touch src/app/compose/ — run SEQUENTIALLY (merge-conflict risk): #106 -> #107 -> #108. Start with #106.
