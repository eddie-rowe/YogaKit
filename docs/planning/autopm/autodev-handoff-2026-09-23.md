# /autodev → /autoretro Handoff — 2026-09-23

**Run time:** ~19:00 UTC (hand-launched, scheduled slot)
**Issues worked:** #40 (feat(004 US4): decompose ComposeClient into `src/components/compose/`, Phase 6 T043-T049)

## Queue at sweep start

`ready-for-dev` open issues: #40 (`auto-ok`), #41 (`auto/needs-human` — T037 sharing/revoke copy, owner sign-off), #47 (`auto/needs-human` — pose_favourites/pose_notes schema+RLS). Only #40 was eligible; #41 and #47 were already correctly held. No open PRs from a prior sweep to land (Step 1a: none found). No open Dependabot PRs (Step 1b: none found). Cap was 3; 1 issue worked.

## PRs opened

- **#66** — `feat(004 US4): decompose ComposeClient into src/components/compose/ (Phase 6, T043-T049)`, branch `feat/40-decompose-compose-client`. Opened, labeled `ready-for-review`, auto-reviewed, merged (squash) to `main` as `989579d`. Closes #40 (auto-closed on merge).

## Runbooks / reflections written

- `docs/planning/retro/2026-09-23-reflection-40.md` (written by the delegated build agent, covers T043-T049 per-task detail and judgment calls)

## Gate results

tsc / lint:copy / validate:poses / lint:telemetry / test:coverage — **green**, independently re-run and verified by the orchestrating session (not just trusted from the build agent): 540/540 tests, 100%/100%/100%/100% coverage. Bare `npm run lint` also clean, no new warnings.

## Per-task detail (issue #40, T043-T049)

- T043 decomposition: `ComposeClient.tsx` (476 lines) split into an orchestrator plus 7 pieces under `src/components/compose/`; every pre-refactor testid verified byte-identical except the one intentional T047 rename.
- T044 (drag handle + reorder buttons stay siblings): verified, no code change needed.
- T045 (`describeEnergeticDirection`): implemented, tests-first (failing test committed before the fix, confirmed real content-mismatch failure not an import error).
- T046 (sanctioned chakra hue): implemented, same tests-first sequence.
- T047 (testid rename `compose-item-{index}` → `compose-row-{index}`): implemented; `tests/e2e-qa/walk2-compose.spec.ts` and `docs/krama-guardrails.md` §1.3 updated to match (the doc's prior documented-violation paragraph rewritten to describe the resolved state).
- T048 (scroll preservation, FR-035): tests-first surfaced no code change was needed — a button-triggered reorder already preserves scroll (key-stable `item.id` rows, no `scrollTo`/`scrollIntoView` in the reorder path). Smoke test added as a regression guard. The drag-triggered path specifically wasn't verified end-to-end in a real browser (jsdom's PointerSensor doesn't activate) — same reasoning should hold but is inference, not direct observation; flagged in the reflection doc.
- T049 (two `react-hooks` lint errors handed forward from #37): re-verified only — both cited files already lint clean on `main` (resolved by an earlier merged PR before this sweep started). No edit made.

One code-review finding (a stale file-path reference in `src/instrumentation-client.ts`'s RUM-masking rationale comment, left over from the T043 file move) was found, verified, and fixed in a follow-up commit before merge.

## Browser validation

**Deferred/degraded, not skipped.** This PR's Vercel preview deployment is behind Vercel's SSO/deployment-protection wall; this session has no Vercel session or protection-bypass token, so an anonymous `playwright`-driven request can't reach it (confirmed via the redirect chain: `/compose` → `vercel.com/sso-api` → `vercel.com/login`). `TESTING_URL` (production) doesn't carry this PR's code pre-merge, so exercising it wouldn't test these changes either. Fell back to the headless verification path: `tests/unit/compose/ComposeFlowItem.test.tsx` and `tests/unit/compose/scroll-preservation.test.tsx` render the actual production components (not mocks) and assert directly on the T045/T046/T047/T048 behaviors. Noted on the PR before merging. **Follow-up worth a human or a future sweep with credentials**: confirm a Vercel protection-bypass token (or equivalent) could be wired into this environment so future `feat:` PRs get a true live-browser pass against their own preview instead of this fallback.

## CI note (not this PR's failure)

`db-types-check` failed twice on this PR's head with an identical `ghcr.io toomanyrequests` signature — dies during `supabase start`'s Docker image pull, before the actual type-drift check runs. Confirmed not code-related (this PR touches zero schema/migration files) and not blocking (`mergeable_state: unstable`, not `blocked` — not a required status check). No permission to manually re-run (`rerun_failed_jobs` → 403). Commented once on the PR naming the failure and why it wasn't held; merged once the `ci` job (the actual tsc/lint/copy-lint/pose-validate/telemetry/coverage/build gate) went green on the current head. Worth a human's attention if it recurs on future PRs — may indicate the runner pool needs registry auth for `ghcr.io` pulls in PR-triggered contexts specifically.

## What /autoretro should capture

- The composer decomposition (US4, T043-T049) is the last non-owner-gated item on `specs/004-sequencing-composer`'s task list — T037 (owner sign-off, #41) is the only remaining open item in that spec.
- Live-browser validation against Vercel previews is currently a structural gap for this routine, not a one-off: no protection-bypass credentials are wired into the headless environment. Every future `feat:` PR will hit the same SSO wall until that's fixed. Worth a `007-autonomous-operations` or `008` follow-up rather than re-discovering it each sweep.
- `db-types-check`'s `ghcr.io` rate-limit flake pattern is worth watching across the next few PRs — if it recurs, it's an infra issue (registry auth for PR-triggered Actions runs) worth a dedicated fix rather than a per-PR workaround.
