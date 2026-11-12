# /autopm → /autodev Handoff — 2026-11-12

**Run time:** ~08:30 UTC (after 08:12 autoobs)
**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-11-12.md

## Ready-for-dev issues (for /autodev to pick up)
- #286 test(006 US6): Playwright hydration regression guard. P1. Area: `tests/e2e-qa/hydration-and-nav.spec.ts`
- #287 test(006 US6 T051): first-paint measurement + Lighthouse. P1. Area: `tests/e2e-qa/theme-first-paint.spec.ts` (new) + `specs/006-profile-settings/tasks.md`
- #285 feat(006 US6 T055): presets UI, local only. P1. Area: `src/app/settings/` + `src/lib/settings/presets.ts`
- #61 002 US3 cohort UI. P2. Area: `src/app/org/` (large; take only with time left)

## Held for human (no auto-ok)
- PR #227 (Today route, browser validation), PR #199 (005 C1 schema + RLS), #273 (nav; waits on #227 + Teach decision), #47, #60 (owner branch `test/60-rls-assertions-us3-us5` exists, don't touch it), #258, #263, #111, #176, #177, #97, #218

## /autodev routing
- Parallel-safe: #285, #286 and #287 touch distinct files.
- #285 and #287 both tick `specs/006-profile-settings/tasks.md` on different lines. Merge one, then rebase the other. After any `--ours` resolution, diff `tasks.md` against `origin/main` (retro 11-11 rule).
- Dependency installs: use `npx -y npm@11` (npm 10.9.9 arborist crash).
- No Dependabot PRs open.
