# /autopm → /autodev Handoff — 2026-10-11

**Board health:** Needs Attention (owner-blocked; no stall)
**Audit:** docs/planning/autopm/2026-10-11.md

## Ready-for-dev issues (for /autodev to pick up)
- #145 feat(006 US6) T055 presets lib — P2 — area: src/lib/settings/presets.ts (new)
- #146 test(006 US3) T038/T040 claim re-entry — P2 — area: src/lib/storage/claim-decision.ts, src/lib/settings/claim.ts
- #147 test(006 US4) T041/T045 nav conformance — P2 — area: src/components/layout/
- #131, #132 — carried; skip while PR #129 open (SettingsClient.tsx)
- #127, #107, #106 — skip (PRs open); #101, #96 need env

## Held for human (no auto-ok)
- #111, #108, #97, #83, #82, #61, #60, #47; PRs #90–#94, #98, #99, #105, #109, #122, #129. Dependabot: none open.

## /autodev routing
- #145, #146, #147 touch disjoint areas — parallel-safe.
