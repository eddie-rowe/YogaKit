# /autopm → /autodev Handoff — 2026-10-12

**Board health:** Needs Attention (owner-blocked on browser validation; no stall)
**Audit:** docs/planning/autopm/2026-10-12.md

## Ready-for-dev issues (for /autodev to pick up)
- #156 T028 deriveAudience — P1 — src/lib/settings/
- #157 T027 visibility store — P1 — src/lib/settings/
- #158 T040/T045 copy-lint coverage — P2 — data/voice + settings tests
- Carried but blocked: #127/#131/#132 (on #129), #106/#107 (on #109/#122), #101, #96 (credentials)

## Held for human (no auto-ok)
- #111, #108, #97, #83, #82, #47, #60, #61 — migration/RLS/auth/billing/copy sign-off or browser validation

## /autodev routing
- #156, #157, #158 are independent: parallel-safe (#156/#157 touch distinct files in src/lib/settings/).
- Dependabot: none open.
