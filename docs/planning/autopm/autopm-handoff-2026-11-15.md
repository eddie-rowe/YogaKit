# /autopm → /autodev Handoff — 2026-11-15

**Run time:** ~09:20 UTC (after 08:10 autoobs)
**Board health:** Needs Attention (owner-gated)
**Audit:** docs/planning/autopm/2026-11-15.md

## Ready-for-dev issues (for /autodev to pick up)
- #301 test(RULE-H6): engine-isolation scanner misses indirect network sinks and never walks .js/.mjs. P1. Area: `tests/unit/architecture/` (`engine-isolation.test.ts`, `import-scan.ts`). Test-only; no file under `src/` changes.
- #302 test(guardrails §1.3): ratchet the no-prefix testid rule. P2. Area: `tests/unit/architecture/testid-prefix.test.ts` (new), one note in `docs/krama-guardrails.md`. No `data-testid` rename.
- #303 docs(002 plan.md): reconcile the Source Code tree. P2. Area: `specs/002-auth-tenancy-billing/plan.md`, one code block. Docs-only.

## Held for human (no auto-ok)
- #286, #287 (e2e-qa authoring; owner rule pending in #38), #61 (e2e-qa + #60), #220 / PR #227 (browser validation), PR #199 (005 C1 schema + RLS), #273, #47, #60 (owner branch exists, don't touch), #258, #263, #111, #176, #177, #97, #218 (now labelled `auto/needs-human`)
- 006 US2 T027/T028/T029/T031/T032: tagged auto-ok in tasks.md but blocked on T025 (copy sign-off) and T026 (needs-human component). Not filed.
- Renaming the 12 container testids named in #302: owner call (digest item 9). Do not rename.

## /autodev routing
- #301 and #302 both add to `tests/unit/architecture/`. They touch different files (#302 is a new file) and are parallel-safe, unless #301 exports a helper from `import-scan.ts` that #302 also wants; then run #301 first.
- #303 is independent.
- #301: strip comments with the shared lexer `stripComments`, never a regex. Seed every planted case and watch it fail before pinning it; a case that passes on the old code needs its own seed. Keep engine and validator-lite at 100% line coverage.
- #302: re-run the scan; if the list differs from the 12 in the issue, pin what is on `main` and report the difference.
- Use `npx -y npm@11` for any install (npm 10.9.9 arborist crash).
- No Dependabot PRs open.
- Do not author or extend anything under `tests/e2e-qa/`.
