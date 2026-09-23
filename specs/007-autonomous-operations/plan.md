# Implementation Plan: Autonomous Operations Substrate

**Branch**: `feat/51-007-plan-tasks` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-autonomous-operations/spec.md`

## Summary

The spec is fully specified — 428 lines, 38 FRs, 5 user stories, 14 SCs, zero
`[NEEDS CLARIFICATION]` markers. Only the scheduler *mechanism* (US4) is deliberately
left open (spec.md's Assumptions section). This plan does not defer 007 as a whole; it
splits it by what is actually blocked on the ~Nov 2026 launch decision
(`docs/planning/routines.md`) versus what is buildable today.

**US1 (session done-gates) and the honesty FRs (FR-030–FR-035) ship now.** US1 is
config, not code — `.claude/settings.json` does not exist in this repo yet, and the
spec's own rationale calls it "the cheapest item in the whole feature… it pays off
immediately for attended sessions too." The honesty FRs already have their first
concrete deliverable merged ahead of this plan: `scripts/validate-routine-log.mjs`
(`#48`, PR #58) implements FR-030 (three-source verification) and FR-035 (a missing run
must be detectable as a gap), wired into `ci.yml` as a blocking step.

**US4 (the four-routine scheduler) stays deferred to ~Nov 2026.** That is the standing
decision in `docs/planning/routines.md`: "No scheduler exists yet… deferred until the
~Nov 2026 launch." This plan does not reverse that decision — it narrows what it covers.
The routines themselves (`autoobs`, `autopm`, `autodev`, `autoretro`) already exist as
hand-launched specs; only the cron/trigger mechanism and the unattended 30-day operating
posture (owner-digest escalation ladder, auto-merge-when-green) are out of scope here.

US2 (labelled work-consumption with an owner-gate) and US3 (operating memory / living
files) are sequenced between the two but not started in this pass — see Phasing.

## Technical Context

**Language/Version**: Node 22 ESM (`.mjs`, matching `validate-poses.mjs` /
`copy-lint.mjs` / `validate-routine-log.mjs`) for tooling; Markdown/JSON for routine
specs, templates, and settings
**Primary Dependencies**: None new. `.claude/settings.json` is native Claude Code
configuration, not an npm dependency. GitHub CLI (`gh`) and labels are already in use.
**Storage**: No database. Operating memory is version-controlled files
(`docs/planning/`, `docs/observation/`) and GitHub issues/labels — see "Where the spec
and the plan diverge" below for the board question.
**Testing**: `scripts/validate-routine-log.mjs` already has a working positive/negative
test performed by hand (seed a fabricated unattributed line, confirm non-zero exit,
remove it, confirm zero). A `tests/unit/routine-log/validate.test.ts` is added by this
plan's tasks to bring it under the same `vitest` coverage discipline as
`datadog-sync.mjs`/`telemetry-check.mjs` in 008.
**Target Platform**: Developer's terminal + CI for the validator; Claude Code sessions
(attended today, headless from US4 onward) for the gates and routines
**Project Type**: Repository tooling + configuration (no application surface touched)
**Constraints**: Constitution v3.0.0 is the ceiling (spec's own framing) — anything the
loop could do that would bend a constitution rule is owner-gated, never an exception
(FR-009). RULE-H6 (no AI call, no DB/network I/O in the friction engine or
validator-lite path) is unaffected — this feature touches no application code.
**Scale/Scope**: One settings file; one CI-gate wiring already merged; four existing
routine specs get no rewrite here beyond what `#48` already changed; the scheduler
mechanism itself (US4's actual cron trigger) is explicitly out of scope for this plan

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against constitution v3.0.0 (`.specify/memory/constitution.md`):

| Principle | Check | Result |
|---|---|---|
| I. Safety is Sovereign | No sequencing/safety logic touched. | PASS (N/A) |
| II. The Teacher Decides | No AI proposal path touched. | PASS (N/A) |
| III. Deterministic Authority, AI Optional | The routine loop is orchestration around Claude Code sessions, not the friction engine or validator-lite. Neither is touched, and nothing in this feature adds an AI call to their path. | PASS (N/A) |
| IV. Embodied Intelligence | No teacher-voice authoring. Routine/digest/brief prose is operational writing (`009` US3's future concern), not product copy. | PASS (N/A) |
| V. Open Data, Sustainable Product | Pose library untouched. | PASS (N/A) |
| VI. Lightweight and Accessible | No client-facing surface touched — this is repository tooling and CI configuration only. | PASS (N/A) |
| VII. Compassion Over Compliance | No lapse/streak copy touched. | PASS (N/A) |
| VIII. Consent-Scoped Visibility | No practice-content table or RLS policy touched. FR-008/FR-009/FR-037 make this principle mechanically enforceable at the loop's write boundary (owner-gate any RLS/auth/billing change, refuse any RLS-altering migration outright) — this is the feature's own contribution to defense-in-depth for this principle, not a risk it introduces. | PASS |

No violations requiring Complexity Tracking justification.

### Where the spec and the plan diverge, and why

1. **007 is phased, not deferred whole.** `docs/planning/routines.md` reads as if all
   of 007 waits for ~Nov 2026. It doesn't — only US4's scheduler mechanism does. US1
   (session done-gates) and the honesty FRs (FR-030–FR-035) are buildable and valuable
   today, independent of whether anything runs unattended. `routines.md`'s deferral
   wording is corrected by this plan to name US4 specifically (already applied).
2. **The board question (`routines.md:52-53` vs. FR-013).** `routines.md` states "There
   is no separate `kanban.md` or `state.md` — GitHub issues and labels are the board."
   FR-013 asks for "a board with a Done column reconciled against merged work." These
   are read as the same thing described at two levels: GitHub issues/labels *are* the
   board's data (Now/Next/Later mapped from labels + milestones), and
   `docs/planning/autopm/YYYY-MM-DD.md`'s audit/board snapshots (already in the File
   layout convention) are the dated reconciliation FR-013 asks for — a snapshot of what
   the GitHub-issues board looked like, reconciled against `git log`, on that date. No
   new `kanban.md` is introduced. `docs/planning/ceo-brief/YYYY-MM-DD.md` (already
   declared) is the "one file to read first" SC-011 asks for.
3. **The three work-consumption labels (FR-006) already exist under different, more
   granular names.** `routines.md`'s Label vocabulary has seven labels, not three:
   `ready-for-dev` (~ "groomed-and-ready"), `auto-ok` (~ "additive-so-the-loop-may-
   build-and-merge"), `auto/needs-human` (~ "owner-gated-so-the-loop-surfaces-but-never-
   builds"), plus four narrower operational labels (`auto/owner-digest`,
   `auto/dev-failure`, `auto/routine-outage`, `auto/observation`) that FR-006 doesn't
   anticipate but don't conflict with it either. This plan keeps the existing seven
   rather than renaming down to three — FR-006's intent (exactly one label per meaning,
   no ambiguity) is already satisfied; renaming working labels with open issues attached
   would be pure churn with no behavior change.
4. **US4's scheduler mechanism is out of scope for this plan**, matching 008's own
   precedent ("Feature 007's full scheduler/digest loop left out"). The routines
   (`autoobs`/`autopm`/`autodev`/`autoretro`) already exist and are hand-launched; this
   plan does not change how they're launched. What ships now from US4's surrounding
   requirements is the honesty discipline (FR-030–035) a scheduler will eventually rely
   on, not the trigger itself.
5. **FR-010 (feature-issue template)** is scoped down to what's missing: the repo has
   no `.github/ISSUE_TEMPLATE/` directory today. This plan adds the template; it does
   not change existing issue-filing habits, which already informally cover most of the
   required sections.

## Project Structure

### Documentation (this feature)

```text
specs/007-autonomous-operations/
├── plan.md              # This file
├── spec.md              # Existing — Status updated to Planned by this plan
└── tasks.md             # Phase 2 output — this plan's companion file
```

No `research.md`/`data-model.md`/`quickstart.md` — the spec has zero
`[NEEDS CLARIFICATION]` markers and this pass touches no data model; a settings file and
a CI-wired script need no schema design phase.

### Source (repository root)

```text
.claude/
└── settings.json                          # NEW — US1: pre-authorized command surface
                                            # (FR-004) + session-end gate hook (FR-001/002)

.github/
└── ISSUE_TEMPLATE/
    └── feature.md                         # NEW — FR-010: Acceptance Criteria, Test
                                            # Requirements, Spec Reference, Codebase Area

scripts/
└── validate-routine-log.mjs               # ALREADY MERGED (#48, PR #58) — FR-030/FR-035

tests/unit/routine-log/
└── validate.test.ts                       # NEW — brings validate-routine-log.mjs under
                                            # the repo's vitest coverage discipline

docs/planning/routines.md                  # ALREADY EDITED (#48 + this plan) — guardrail
                                            # bullet, deferral wording now names US4
specs/007-autonomous-operations/spec.md    # Status: Draft → Planned
```

No changes to `.claude/commands/tools/**` beyond what `#48` already merged — the four
routine specs (`autoobs.md`, `autopm.md`, `autodev.md`, `autoretro.md`) already
implement most of US2/US3's file-layout and label conventions; this plan documents that
they satisfy the relevant FRs rather than rewriting them, and defers new/changed routine
*behavior* (US2's template enforcement, US3's board reconciliation depth) to their own
tasks below.

## Phasing

| Phase | Story | Ships in this pass |
|---|---|---|
| 1 | US1 — a session cannot quietly end on a broken build | ✅ |
| 1.5 | Honesty FRs (FR-030–FR-035), US3's audit-log half | ✅ (FR-030/FR-035 already merged via `#48`) |
| 2 | US2 — labelled work-consumption with an owner-gate | Sequenced, not started (labels already exist; template + grooming enforcement is new work) |
| 3 | US3 — honest, greppable operating memory (the rest: board reconciliation depth, brief delta-or-nothing discipline) | Sequenced, not started (file layout already exists per `routines.md`; reconciliation *behavior* is autopm/autoretro work) |
| 4 | US4 — four scheduled routines run unattended | **Deferred to ~Nov 2026 launch**, per `docs/planning/routines.md`'s standing decision |
| 5 | US5 — sharper review/migration safety (subagents, RLS-migration hook) | P3, not started, no dependency blocking it from starting early if desired |

**Why US1 and the honesty FRs first, not US2/US3 first.** US1 has no dependency on
anything else in the feature and pays off in attended sessions today, before any
loop exists. The honesty FRs are the direct fix for the failure this whole planning
pass grew out of (`#48`) and already shipped ahead of this plan being written — writing
the plan after the fact would mean pretending the sequencing was undecided when it
wasn't. US2/US3 are real, sequenced work but depend on nothing that's blocked, so they
sit in the queue rather than the "now" lane; US4 is the one item with an actual external
gate (the launch date) blocking it.

## Complexity Tracking

No constitutional violations require justification.
