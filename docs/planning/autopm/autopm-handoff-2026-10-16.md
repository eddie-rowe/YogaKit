# /autopm → /autodev Handoff — 2026-10-16

**Run time:** ~08:15 UTC
**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-10-16.md

## Ready-for-dev issues (for /autodev to pick up)
- #106 anchor validator warnings — P1 — codebase area: 004 composer
- #107 drag insertion gap + seam hover — P1 — codebase area: 004 composer
- #165, #166 — implemented in open PR #168 (held needs-human, browser validation); close on merge
- #96 `npm run datadog:apply` — P2 — needs live Datadog creds

## Held for human (no auto-ok)
- #111, #108, #97 (stale-open; closed by #98), #83, #82, #61, #60, #47 — see owner-digest #38 (unchanged)

## Dependabot
- None open. npm audit clean; eslint clean.

## /autodev routing
- #106 → #107 sequential (same area). Start both this run; settings chain is in #168. #96 independent (creds).
