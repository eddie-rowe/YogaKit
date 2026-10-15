# /autopm → /autodev Handoff — 2026-10-15

**Run time:** 07:00 UTC
**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-10-15.md

## Ready-for-dev issues (auto-ok, unblocked)
- #164 audit settings vs FR-001..007 (T013) — P1 — area: src/app/settings (read-only + doc)
- #165 studio block styling / org-named controls (T017) — P1 — area: src/app/settings
- #166 section shells + reasons for uneditable controls (T018) — P1 — area: src/app/settings/sections
- #106 anchor validator warnings — P1 — area: 004 composer
- #107 drag insertion gap + seam hover — P1 — area: 004 composer
- #96 `npm run datadog:apply` — P2 — needs live Datadog creds

## Held for human (no auto-ok)
- #111, #108, #97, #83, #82, #61, #60, #47 — see owner-digest #38 (unchanged)

## Dependabot
- None open. npm audit clean.

## /autodev routing
- #164 → #165 → #166 sequential (same area). #106/#107 sequential with each other, parallel to the settings chain. #96 independent (creds).
