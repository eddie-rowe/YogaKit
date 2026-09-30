# /autopm → /autodev Handoff — 2026-09-30

**Run time:** ~UTC morning
**Board health:** Good
**Audit:** docs/planning/autopm/2026-09-30.md

## Ready-for-dev issues (for /autodev to pick up)
- #107 feat(004 US5): drag gap + seam hover/tier — P2 — area: src/app/compose/, globals.css (auto-ok)
- #108 feat(004 US8): inline depth escalation — P3 — area: src/app/compose/ (auto-ok; after #107)
- #110 test(007 T009): routine-log validator tests + coverage — P2 — area: scripts/, tests/unit/routine-log, vitest.config.ts (auto-ok)
- #111 chore(007 T001-T004): session-end gates .claude/settings.json — P2 — area: .claude/ (auto-ok)
- #106 built as PR #109, awaiting owner nod — do not redo.

## Held for human (no auto-ok)
- #96 datadog:apply (sandbox policy wall), #101 db types regen (no Docker)
- #90–#94, #98, #99, #105, #109 — built PRs awaiting owner; #47/#82/#83/#97 issues
- Dependabot: none open.

## /autodev routing
- Parallel: {#110, #111} are independent of the compose chain and of each other.
- Sequential: #107 -> #108 (both src/app/compose/); #107 rebases on #109 if it merges first.
