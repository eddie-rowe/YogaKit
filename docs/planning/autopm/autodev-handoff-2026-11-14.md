# /autodev → /autoretro Handoff — 2026-11-14

**Run time:** 10:18 UTC
**Issues worked:** #296, #292, #297 (worked 3 of 3, sequential in one checkout; distinct files)
**Skipped:** none of the three `/autopm` named. #218 carries `ready-for-dev` + `auto-ok` with no `auto/needs-human` label, but the autopm handoff lists it as held, so it was not taken.
**Step 1a (prior PRs):** none eligible. The only prior open PRs are #227 and #199, both `auto/needs-human` and unchanged.
**Step 1b (Dependabot):** none open.
**PRs opened:**
- #298 test(RULE-H6): engine-isolation scanner sees dynamic import() and require(). Branch `autodev/296-engine-isolation-scanner`. **Merged** (squash `edea383`).
- #299 chore(006 US4): tick T041 and T045 with evidence. Branch `autodev/292-006-us4-reconcile`. **Merged** (squash `74f5d93`).
- #300 chore(002): tick T040, T062, T065 with evidence; one CLAUDE.md line. Branch `autodev/297-002-reconcile`. **Merged** (squash `0dd3995`).
**Gate results:** tsc / lint:copy / validate:poses / lint:telemetry / test:coverage exited 0 locally on every branch. #296: 111 files / 1101 tests on the first push, 1105 after the review fix. #292 and #297: 111 / 1094. Coverage 100% lines on all (690/690), friction engine and validator-lite included.
**Browser validation:** no rendered surface on any of the three (one test-only change, two docs-only). `.playwright-available` = 1. `.gh-available` is missing; not needed this run.
**Staleness:** #299 was 0 behind at merge. #298 and #300 were 1 behind (#299's squash, which touches neither's files).
**Reflections:** `docs/planning/retro/2026-11-14-reflection-{292,296,297}.md`

## Held for human (unchanged from autopm)
#286, #287, #61, #220 / PR #227, PR #199 (005 C1 schema + RLS), #273, #47, #60, #258, #263, #111, #176, #177, #97, #218. No new `auto/needs-human` labels were applied this run.

## Decisions the owner may want to reverse
- **T045 (006) is ticked although the resend affordance (T042) has no copy yet.** The line says so. Reason given: resend copy will land under `src/app`, which the blocking `lint:copy` job scans.
- **T062 (002) is ticked for repo-authored copy only.** Supabase's hosted sign-in emails and Stripe-hosted pages are outside any repo scan. The line says so.

## What /autoretro should capture
- **Yesterday's rule was wrong about the tool.** "Strip comments before scanning" shipped in #293 as a regex. The review of #298 showed that regex hides a real import when a comment marker sits inside a string (`'image/*'`, `'//cdn'`). `stripComments` is now a small lexer in `tests/unit/architecture/import-scan.ts`, shared by both guards. The hole was live on `main` in the pose-library guard from #293 until #298.
- **The independent review found a merge-blocker by running inputs, not by reading.** First push met all seven acceptance criteria and would still have weakened the engine guard.
- **A case that cannot go red against the old code needs its own seed.** The `// don't` case passed on the old engine regex, so it was seeded by disabling stripping in the new helper.
- **The 002 plan's Source Code tree has drifted both ways.** Two planned paths were never built, and several built paths are not listed. Recorded on the T065 line; `plan.md` unchanged.
- **Scanner follow-ups, unfiled:** `FETCH` misses `globalThis.fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`; `.js`/`.mjs` files are not walked; non-literal specifiers are invisible to any text scanner.
- **Possible guardrail inconsistency, unchecked:** `docs/krama-guardrails.md` lists `account-menu` beside `account-menu-name`, which reads as a prefix-rule violation.
- **Buildable queue is empty after this sweep.** Everything left `ready-for-dev` is owner-gated.
