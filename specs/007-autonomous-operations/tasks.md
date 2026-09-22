# Tasks: Autonomous Operations Substrate

**Feature**: `007-autonomous-operations` | **Plan**: [plan.md](./plan.md)

Status as of 2026-09-22. Phase 1 (US1) and Phase 1.5 (honesty FRs) are the scope of this
pass. Phases 2-3 (US2/US3) are sequenced but not started. Phase 4 (US4) is deferred to
the ~Nov 2026 launch per `docs/planning/routines.md`. Phase 5 (US5, P3) has no
dependency blocking an early start.

## Phase 1 — US1: a session cannot quietly end on a broken build (P1)

| # | Task | FR | State |
|---|---|---|---|
| T001 | `.claude/settings.json` — define session-end gates: `npx tsc --noEmit`, `npm run lint`, `npm run lint:copy`, `npm run validate:poses`, `npx vitest run --coverage` | FR-001, FR-003 | now |
| T002 | Session-end gate failure surfaces inline with file/line/message, not just a pass/fail count | FR-002 | now |
| T003 | Pre-authorize the command surface an unattended session needs (git, npm, gh) in `.claude/settings.json` | FR-004 | now |
| T004 | Verify session-end gates agree with `ci.yml`'s checks — same commands, same thresholds | FR-003 | now |
| T005 | Acceptance check: introduce a deliberate `tsc` error, end a session, confirm the gate surfaces it before "done" | FR-002, spec.md Acceptance Scenario 2 | now |

## Phase 1.5 — Honesty FRs (FR-030–FR-035), the direct fix for `#48`

| # | Task | FR | State |
|---|---|---|---|
| T006 | `scripts/validate-routine-log.mjs` — parse every `docs/planning/routine-log.md` line; assert each `(date, routine)` run claim has a first-party artifact at the path that routine's spec declares | FR-030, FR-035 | ✅ (merged, `#48`, PR #58) |
| T007 | Wire `validate-routine-log.mjs` into `ci.yml` as a blocking step, no `\|\| true` | FR-030 | ✅ (merged, `#48`, PR #58) |
| T008 | `docs/planning/routines.md` "Shared guardrails" — no routine may attribute shipped work to another routine without that routine's own first-party artifact | FR-030 | ✅ (merged, `#48`) |
| T009 | `tests/unit/routine-log/validate.test.ts` — bring the validator under `vitest.config.ts` `coverage.include`, incl. a seeded-violation case | FR-030 | now |
| T010 | A period in which nothing shipped is reported as a period in which nothing shipped, not omitted from the retro | FR-031 | sequenced (autoretro spec text, not yet audited against this FR) |

## Phase 2 — US2: labelled work-consumption with an owner-gate (P1, sequenced)

| # | Task | FR | State |
|---|---|---|---|
| T011 | Confirm existing labels (`ready-for-dev`, `auto-ok`, `auto/needs-human`) satisfy FR-006's three-classification intent — see plan.md divergence #3 | FR-006 | sequenced |
| T012 | Additive-safe classification limited to no-blast-radius changes (docs, tests, non-schema code) | FR-007 | sequenced |
| T013 | Owner-gated classification includes, at minimum, migrations (DROP/RENAME/backfill), RLS, auth, billing | FR-008 | sequenced (already true of `auto/needs-human` per `routines.md`) |
| T014 | A constitution-bending change is always classified owner-gated, never an exception | FR-009 | sequenced |
| T015 | `.github/ISSUE_TEMPLATE/feature.md` — Acceptance Criteria, Test Requirements, Spec Reference, Codebase Area | FR-010 | sequenced |
| T016 | Build routine never creates a branch/PR/issue outside the labelled, groomed queue | FR-011 | sequenced |
| T017 | Owner-gated blockers aggregate into one idempotent digest issue, never per-issue spam | FR-012 | sequenced (`auto/owner-digest` label already exists) |

## Phase 3 — US3: honest, greppable operating memory (P1, sequenced)

| # | Task | FR | State |
|---|---|---|---|
| T018 | Living operating files: decision log, board, brief — reconcile against `routines.md`'s file layout (see plan.md divergence #2) | FR-013 | sequenced |
| T019 | Exactly one decision log (`DECISIONS.md`); operating files reference it, don't duplicate it | FR-014 | sequenced (`DECISIONS.md` already exists) |
| T020 | Dated outputs — one file per type and date, never overwritten | FR-015 | sequenced (already true per `routines.md`'s Artifacts list) |
| T021 | One master specification per routine that a routine reads before acting | FR-016 | sequenced (the four `.claude/commands/tools/**` specs already serve this) |
| T022 | Every routine idempotent — running twice for the same period is a no-op on the second run | FR-017 | sequenced |
| T023 | Every routine degrades rather than aborts on a missing input | FR-018 | sequenced (already stated in `routines.md`'s Shared guardrails) |
| T024 | Every routine bounded — no polling/busy-wait, time-boxed checks | FR-019 | sequenced |
| T025 | Every routine appends exactly one line per run to `routine-log.md` | FR-020 | sequenced (already the convention; `validate-routine-log.mjs` enforces the shape) |
| T026 | Every routine fully autonomous, never calls an interactive prompt | FR-021 | sequenced (already stated: "Never call `AskUserQuestion`") |
| T027 | Every routine commits only to trunk, verifies branch before acting | FR-022 | sequenced (already stated; guard is currently vacuous — `autoretro.md:54-55`, `autodev.md:223` use `\|\| echo` instead of an exiting guard) |
| T028 | Routine steps run in sequence within one session, no background subagent | FR-023 | sequenced |
| T029 | Routines coupled only through dated handoff files committed to trunk | FR-024 | sequenced |
| T030 | Missing upstream handoff — locate the most recent prior one and note staleness | FR-025 | sequenced |
| T031 | Build routine writes a failing test before the implementation, where a test surface exists | FR-026 | sequenced |
| T032 | Build routine never merges a PR whose checks are not green | FR-027 | sequenced |
| T033 | Build routine lands any already-green open PR before starting new work | FR-028 | sequenced |
| T034 | Build routine takes a small, stated, bounded number of issues per run | FR-029 | sequenced |
| T035 | When the additive-safe queue thins, the loop records that fact rather than inventing work | FR-032 | sequenced |
| T036 | Planning routine reconciles the board against what actually merged, not what was claimed | FR-033 | sequenced |
| T037 | Planning routine sources new work from the standing feature ladder (002→003→004→005→006) | FR-034 | sequenced |
| T038 | Document the owner's pre-flight before any escalation | FR-036 | sequenced |
| T039 | A migration altering an RLS policy is refused on any branch without an explicit owner override | FR-037 | sequenced |
| T040 | PRs touching the friction engine, pose-library schema, or [truncated FR-038 surface] require the matching reviewer/hook from US5 | FR-038 | sequenced (depends on US5) |

## Phase 4 — US4: four routines run unattended (P1, deferred)

| # | Task | FR | State |
|---|---|---|---|
| T041 | Scheduling mechanism (cron or equivalent) for the four routines | FR-015 (partial, per 008's T049) | **deferred to ~Nov 2026** |
| T042 | Owner-digest issue automation, 1/3/7-day escalation ladder | FR-012 | **deferred to ~Nov 2026** |
| T043 | 30-day unattended operating posture, auto-merge-when-green | — | **deferred to ~Nov 2026** |

## Phase 5 — US5: sharper review/migration-safety subagents and hooks (P3, open)

| # | Task | FR | State |
|---|---|---|---|
| T044 | RLS-migration hook that refuses a policy-altering migration outright without owner override | FR-037 | open |
| T045 | Reviewer subagent scoped to friction engine / pose-library schema / RLS surfaces | FR-038 | open |

## Verification (this pass only — T001-T009)

| # | Check | Ref | State |
|---|---|---|---|
| T046 | `npx tsc --noEmit`, `npm run lint` (0 errors), `npm run lint:copy`, `npm run validate:poses` all green | — | now |
| T047 | Seed a fabricated unattributed routine-log line; `validate-routine-log.mjs` fails; remove it, passes | FR-030, FR-035 | ✅ (verified during `#48`) |
| T048 | Introduce a deliberate `tsc` error, confirm `.claude/settings.json`'s session-end gate surfaces it | FR-002 | now |

## Open against another feature

| # | Task | FR | Owner |
|---|---|---|---|
| T049 | RULE-C5 operational-writing checks (P2) | — | `009-voice-and-copy-lint` US3, not started |
