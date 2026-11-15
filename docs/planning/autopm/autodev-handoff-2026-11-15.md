# /autodev → /autoretro Handoff — 2026-11-15

**Run time:** 10:25 UTC
**Issues worked:** #301, #302, #303 (worked 3 of 3, sequential in one checkout; distinct files)
**Skipped:** none of the three `/autopm` named. The other five `ready-for-dev` issues (#273, #220, #218, #61, #47) all carry `auto/needs-human` and were not taken.
**Step 1a (prior PRs):** none eligible. The only prior open PRs are #227 and #199, both `auto/needs-human` and unchanged.
**Step 1b (Dependabot):** none open.
**PRs opened:**
- #304 test(RULE-H6): engine-isolation scanner reports indirect network sinks and walks .js/.jsx/.mjs. Branch `autodev/301-h6-network-sinks`. **Merged** (squash `6013e0f`).
- #305 test(guardrails §1.3): ratchet the no-prefix testid rule; pin the 12 container ids. Branch `autodev/302-testid-prefix-ratchet`. **Merged** (squash `2e4800e`).
- #306 docs(002 plan.md): reconcile the Source Code tree. Branch `autodev/303-002-plan-tree`. **Merged** (squash `3384bfb`).
**Gate results:** tsc / lint:copy / validate:poses / lint:telemetry / test:coverage exited 0 locally on every branch, at every push. #301: 111 files / 1129 tests on the first push, 1132 after the review fixes. #302: 112 / 1115. #303: 111 / 1105. Coverage 100% lines (690/690), friction engine and validator-lite included.
**Browser validation:** no rendered surface on any of the three (two test-only changes, one docs-only). `.playwright-available` = 1. `.gh-available` is missing; not needed this run.
**Staleness:** #306 was 0 behind at merge. #305 was 1 behind at merge (#306's squash) and #304 was 2 behind (#306's and #305's). Neither squash touches the other's files; the combined `main` was re-checked after the last merge (tsc clean, `tests/unit/architecture` green).
**Reflections:** `docs/planning/retro/2026-11-15-reflection-{301,302,303}.md`

## Held for human (unchanged from autopm)
#286, #287, #61, #220 / PR #227, PR #199 (005 C1 schema + RLS), #273, #47, #60, #258, #263, #111, #176, #177, #97, #218. No new `auto/needs-human` labels were applied this run.

## Decisions the owner may want to reverse
- **#304 matches `fetch` on the bare word**, wider than the issue's three spellings. A method or property merely named `fetch` in the engine path would now fail the guard. Nothing in the tree does.
- **#304 reports a sink name inside a string literal.** Fail-closed, pinned by a test with the reasoning.
- **#305's pin list is checked against a frozen copy of the twelve**, in addition to the list itself. An id cannot be added to the pin list without editing both.
- **#306 added five built paths the issue did not list** (`src/lib/stripe/*`, `src/lib/auth/redirect.ts`, `src/app/onboarding/ClaimFlowsPrompt.tsx`), put real migration file names in place of `<ts>_…`, and left `src/lib/supabase/tracing.ts` out.

## For /autopm to file
- **Live testid prefix collision, not caught by the new check:** `settings-org-${id}` (`src/app/settings/SettingsClient.tsx:128`) against the literal `settings-org-new` (lines 147, 194). `[data-testid^="settings-org-"]` over-matches. Found by #305's review.
- **Template-literal testids are unchecked:** 58 distinct template heads against 147 literals. The `read-item-` incident that motivated §1.3 was a template id.
- **`stripComments` reads a regex literal containing two slashes, or a slash then a star, as a comment**, and JSX text containing `//` the same way. It hides what follows from both import guards and now from sink matching. No instance in the guarded directories. Written in the helper's known limits by #304.
- **`./foo.js` specifiers that resolve to `foo.ts` are not followed** by the engine guard. Carried from 2026-11-14, still open.
- **Small reconciles once #304 and #305 are both on `main`:** point `testid-prefix.test.ts` and `no-supabase-on-read-path.test.ts` at `SOURCE_EXTS` / `isSource`.

## What /autoretro should capture
- **Both independent reviews found something real, again by running inputs.** #304's first push matched the three `fetch` spellings the issue named and missed six others (`(globalThis as any).fetch(`, `window!.fetch(`, `globalThis['fetch'](`, `fetch?.(`, `fetch.call(`, `const f = fetch`). #305's count assertion let a new id take a freed slot.
- **An issue's list of spellings is not the rule.** Where the real tree has no legitimate use of a word, match the bare word.
- **A test of a predicate is not a test of its caller.** #304's first listing tests called `isSource`; reverting `listFiles` left them green. Seed by reverting the caller.
- **A ratchet has to check content, not count.** "At most N" can shrink and can also be refilled.
- **A doc comment closed itself.** An example regex inside a block comment contained a star followed by a slash. The remainder parsed as code, tests stayed green, the gate exited 0, and only an eslint warning showed it. It was on #304's branch for one push and never on `main`. `eslint` warnings do not fail the local gate.
- **Parallel-safe issues should not share a new helper.** #302's first draft imported `isSource` from #301's branch and collected zero tests on `main`. The autopm handoff had flagged the coupling.
- **#305's PR body still describes the superseded "at most 12" assertion.** The review comment on the PR is the correct account.
- **Buildable queue is empty after this sweep.** Everything left `ready-for-dev` is owner-gated.
