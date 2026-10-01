# /autopm → /autodev Handoff — 2026-10-01

**Run time:** ~UTC morning
**Board health:** Good
**Audit:** docs/planning/autopm/2026-10-01.md

## Ready-for-dev issues (for /autodev to pick up)
- #113 security: bump next 16.3.5→16.3.8 (critical audit) — P0 — area: package.json/lockfile (auto-ok)
- #114 chore(007 T027): exiting trunk guard in autoretro/autodev specs — P2 — area: .claude/commands/ (auto-ok)
- #107 feat(004 US5): drag gap + seam hover/tier — P2 — area: src/app/compose/, globals.css (auto-ok)
- #108 feat(004 US8): inline depth escalation — P3 — area: src/app/compose/ (auto-ok; after #107)
- #106 built as PR #109 awaiting owner — do not redo.

## Held for human (no auto-ok)
- #111 (settings.json write denied), #96 datadog:apply, #101 db types regen
- #90–#94, #98, #99, #105, #109 built PRs; #47/#82/#83/#97
- Dependabot: none open.

## /autodev routing
- Parallel: #113 and #114 are independent of each other and of the compose chain.
- Sequential: #107 -> #108 (src/app/compose/); #107 may rebase on #109.
