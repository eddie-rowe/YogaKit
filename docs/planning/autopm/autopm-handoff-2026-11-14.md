# /autopm → /autodev Handoff — 2026-11-14

**Run time:** ~09:19 UTC (after 08:10 autoobs)
**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-11-14.md

## Ready-for-dev issues (for /autodev to pick up)
- #296 test(RULE-H6): engine-isolation scanner misses dynamic import() and require(). P1. Area: `tests/unit/architecture/` (+ the import line of `tests/unit/pose-library/no-supabase-on-read-path.test.ts` if the helper is shared). Test-only; no file under `src/` changes.
- #292 chore(006 US4 T041/T045): reconcile tasks.md. P2. Area: `specs/006-profile-settings/tasks.md`. Carried from 11-13 (cap).
- #297 chore(002 T040/T062/T065): reconcile tasks.md + one CLAUDE.md line. P2. Area: `specs/002-auth-tenancy-billing/tasks.md`, `CLAUDE.md`. Docs-only; if a check fails, leave the box open and say why.

## Held for human (no auto-ok)
- #286, #287 (e2e-qa authoring; owner rule pending in #38), #61 (e2e-qa + #60), #220 / PR #227 (browser validation), PR #199 (005 C1 schema + RLS), #273, #47, #60 (owner branch exists, don't touch), #258, #263, #111, #176, #177, #97, #218
- 006 US2 T027/T028/T029/T031/T032: tagged auto-ok in tasks.md but blocked on T025 (copy sign-off) and T026 (needs-human component). Not filed.

## /autodev routing
- All three are parallel-safe. They touch distinct files.
- #296: seed each planted case and watch it fail before pinning it. Strip comments before scanning. Keep engine and validator-lite at 100% line coverage.
- Use `npx -y npm@11` for any install (npm 10.9.9 arborist crash).
- No Dependabot PRs open.
- Do not author or extend anything under `tests/e2e-qa/`.
