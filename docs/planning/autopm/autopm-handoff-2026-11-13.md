# /autopm → /autodev Handoff — 2026-11-13

**Run time:** ~08:40 UTC (after 08:13 autoobs)
**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-11-13.md

## Ready-for-dev issues (for /autodev to pick up)
- #289 test(003 US6a T074): the signed-out pose read path imports no Supabase client. P1. Area: `tests/unit/pose-library/` (new) + a tick in `specs/003-pose-library/tasks.md`
- #292 chore(006 US4 T041/T045): reconcile tasks.md. P2. Area: `specs/006-profile-settings/tasks.md`
- #290 docs(guardrails §1.3): no user-entered strings in data-testid. P2. Area: `docs/krama-guardrails.md`
- #291 chore(autodev.md): npm@11 install rule + post-`--ours` diff rule. P2. Area: `.claude/commands/tools/02_development/autodev.md` (prompt markdown only; not settings/hooks)

## Held for human (no auto-ok)
- #286, #287 (e2e-qa authoring; owner rule pending in #38), #61 (e2e-qa + #60), #220 / PR #227 (browser validation), PR #199 (005 C1 schema + RLS), #273, #47, #60 (owner branch exists, don't touch), #258, #263, #111, #176, #177, #97, #218

## /autodev routing
- All four are parallel-safe. They touch distinct files and none touches app code.
- Use `npx -y npm@11` for any install (npm 10.9.9 arborist crash).
- No Dependabot PRs open.
- Do not author or extend anything under `tests/e2e-qa/`.
