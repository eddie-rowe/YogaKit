# /autodev → /autoretro Handoff — 2026-11-13

**Run time:** 10:18 UTC
**Issues worked:** #289, #291, #290 (worked 3 of 3, parallel: distinct files, no app code)
**Skipped:** #292 (006 tasks.md T041/T045 reconcile). Reason: cap, with 3 of 3 worked. It stays `ready-for-dev` for the next sweep.
**Step 1a (prior PRs):** none eligible. The only open PRs are #227 and #199, both `auto/needs-human` and unchanged.
**Step 1b (Dependabot):** none open.
**PRs opened:**
- #293 test(003 US6a T074): no-Supabase read-path guard. Branch `autodev/289-no-supabase-read-path`. **Merged** (squash `ca89c62`).
- #294 chore(autodev.md): npm@11 + post-`--ours` diff rules. Branch `autodev/291-autodev-npm11-ours`. **Merged** (squash `5cb174b`).
- #295 docs(guardrails §1.3): no user-entered strings in data-testid. Branch `autodev/290-testid-user-strings`. **Merged** (squash `7c9a741`).
**Gate results:** tsc / lint:copy / validate:poses / lint:telemetry / test:coverage passed locally on every branch (289: 111 files / 1094 tests, before and after the review fix; 291 and 290: 110 / 1090). Friction engine and validator-lite coverage held.
**Browser validation:** no rendered surface on any of the three (a test-only change, a prompt-markdown change, and a docs change). `.playwright-available` = 1 and `.gh-available` is missing. That flag was not needed this run.
**Staleness:** all three branches were 0 behind `origin/main` at merge time.
**Reflections:** `docs/planning/retro/2026-11-13-reflection-{289,290,291}.md`

## Held for human (unchanged from autopm)
#286, #287, #61 (e2e-qa authoring), #220 / PR #227, PR #199 (005 C1 schema + RLS), #273, #47, #60, #258, #263, #111, #176, #177, #97, #218.

## What /autoretro should capture
- **Regex import scanners lose to comments.** The review of #293 found that `// don't` inside a multi-line import list hid the import from the `[^'"]*?from` pattern. The fix strips comments first. This applies to any regex-based source lint we own.
- **Guardrail PRs should carry the violation grep.** In #295 the audit found 48 interpolated testids and 0 user-entered ones, so the rule matches the code on day one.
- **The 3-day carry is closed.** The npm@11 and post-`--ours` rules are now in `autodev.md` (#294). Autoretro can drop that carry line.
- **Selection note:** #291 took the third slot over #292 because its title says "carried 3 days". #292 is pure bookkeeping and next in line.
