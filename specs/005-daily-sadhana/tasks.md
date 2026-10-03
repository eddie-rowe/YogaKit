---

description: "Task list for feature 005-daily-sadhana"
---

# Tasks: Daily Sadhana

**Input**: Design documents from `/specs/005-daily-sadhana/`
**Prerequisites**: `spec.md`, `design-input.md` (both exist); `plan.md` (this PR);
`research.md`, `data-model.md`, `contracts/guidance-tone.md` (authored in Phase C0, below)

**Tests**: Included, and non-negotiably so in three places. US2's whole claim is that the
streak never decreases — a claim about "never" with no generated-history test would be
self-refuting (SC-004). US5's dashboard is meaningless without the RULE-V5 proof that a
cohort-teacher-role query against `practice_reflections` returns zero rows or is refused
(SC-016) — `002`'s own schema doc left this assertion as a stub for `005` to fill. And
every user-facing string in this feature is CI-gated by `009`'s copy-lint (FR-025,
RULE-C5) — that gate is not optional review, it already exists and blocks merges.

**Organization**: By phase, and each phase is one PR, per `plan.md`'s Phasing table. The
C1-before-everything-else split is deliberate, for the same reason `004`'s C1 was: a
reviewer looking at a table and a UI in one diff reasons about the UI's conditionals
instead of the table's guarantees.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to US1–US7 from `spec.md`

## Path Conventions

Single Next.js project, per `plan.md`'s Project Structure. Paths below are exact matches
to that section; a handful marked "TBD in research.md" are sketched, not fixed, because
choosing them is Phase C0's job, not this file's.

---

## Phase 1 (B): Planning artifacts and pointer repair

**Purpose**: Give `005` the spec-kit artifacts it never had, and record where each of
`design-input.md`'s 13 open decisions landed before any code is written.

- [X] T001 Author `specs/005-daily-sadhana/plan.md` — technical context, Constitution
  Check against v3.0.0 (explicitly flagging decisions #3 and #6 for owner sign-off),
  the 13-decisions resolution table, phasing
- [X] T002 Author this file
- [X] T003 Repoint `.specify/feature.json` from `specs/004-sequencing-composer` to
  `specs/005-daily-sadhana`
- [X] T004 Update the key-artifacts block in `CLAUDE.md` to name `005`'s plan as the
  current one

**Gate**: none — this phase is the plan itself. Merge waits on owner review of decisions
#3 and #6, not a CI gate, per this issue's own labeling (`ready-for-dev` +
`auto/needs-human`).

---

## Phase 2 (C0): Research, data model, and the held copy contract

**Purpose**: Turn the resolved decisions into an exact schema and an exact set of
resolved technical unknowns, and open (not fill) the copy contract decision #6 owes.

**Independent test**: `research.md` and `data-model.md` exist and every open question they
raise has a stated resolution, not a "TODO." No code changes in this phase.

- [ ] T005 [P] Author `specs/005-daily-sadhana/research.md` — resolve: the local-day
  library choice (decision #1; `Intl.DateTimeFormat` vs. a dependency), whether the
  offline check-in queue is a genuinely new `idb` store or a generalization of `004`'s
  `outbox.ts`, the exact shape of `computeStreak()`'s grace-budget consumption rule, and
  the dashboard route's placement in `src/app/`
- [ ] T006 [P] Author `specs/005-daily-sadhana/data-model.md` — the five tables in full
  (`intentions`, `practice_checkins`, `practice_reflections`, `practice_ritual_state`,
  `practice_milestones`), `practice_guidance_dismissals`, every RLS policy body, and the
  `data/sadhana/grace-budget.json` shape (decision #4)
- [ ] T007 [P] Author `specs/005-daily-sadhana/contracts/guidance-tone.md` **[OWNER
  SIGN-OFF, decision #6]** — a short copy-style note (gentle, pattern-based, per the
  recommended default) that the guidance corpus and its copy-lint entries will be written
  against. This contract is opened, not closed, in this phase — no guidance entry is
  authored until it is signed off, the same deferral `003` used for
  `contracts/theme-taxonomy.md`
- [ ] T008 [P] Record decision #3's resolution (no streak repair, ever) as a one-line
  note in `data-model.md`'s intro rather than a schema element — there is no table for a
  mechanic that does not exist. This is documentation, not implementation, and is listed
  here so the decision is traceable to a concrete artifact rather than only to `plan.md`'s
  prose

**Gate**: Constitution Check in `plan.md` re-verified against the filled-in design, per
the gate's own "re-check after Phase 1 design" instruction.

---

## Phase 3 (C1): Schema, RLS, and the content/signal split

**Purpose**: Give the practitioner's record somewhere to live, with the teacher-visible
boundary structural from the first migration. **Story: foundation for US1, US2, US3, US5.**

**Independent test**: `bash scripts/verify-migrations.sh` passes with the new assertions,
and `npx tsc --noEmit` is clean against the regenerated types. No user-visible change.

- [ ] T009 [US2] New migration `supabase/migrations/<ts>_sadhana.sql` — `intentions`
  (append-only: insert + select policies only, no update, no delete, satisfying FR-026),
  `practice_checkins` (signal: `local_date`, `duration_minutes`, `kind`, `flow_id`),
  `practice_reflections` (content: `mood`, `note`, 1:1 with a check-in), per `data-model.md`
- [ ] T010 [US2] `practice_ritual_state` (self-only: lapse tracking for the return card)
  and `practice_milestones` (self-only + teacher-readable milestone progress, per FR-053)
- [ ] T011 [US6] `practice_guidance_dismissals` (self-only: consumed triggers, FR-040)
- [ ] T012 [US2] RLS: `practice_checkins`, `intentions`, `practice_ritual_state` — self
  policies only, `user_id = (select auth.uid())`, matching `004`'s pattern (`with check`
  on every write policy)
- [ ] T013 [US2] RLS: `practice_reflections` — self policies only, **and no policy of any
  kind referencing a cohort, org, or teacher role** — the absence is the guarantee
  (Principle VIII, RULE-V1/V2)
- [ ] T014 [US5] RLS: `practice_checkins` and `practice_milestones` gain an additional
  `select` policy scoped to `app_visible_student_ids()` (from `002`) — the only two
  sadhana tables a cohort teacher's role may ever query
- [ ] T015 [P] [US5] **The RULE-V5 proof, filling `002`'s stub**: append an assertion to
  `scripts/verify-migrations.sh` proving a cohort-teacher-role query against
  `practice_reflections` and `intentions` for an enrolled student returns zero rows or is
  refused (FR-009, FR-056, SC-016)
- [ ] T016 [P] [US2] Append a `verify-migrations.sh` block proving a second account reads
  zero rows of another's `practice_checkins`, `practice_reflections`, `intentions`, and
  `practice_milestones`
- [ ] T017 [US1] `data/sadhana/grace-budget.json` — `{ "size": N, "periodDays": M }`
  (decision #4). The number is data; no user-facing string may embed it literally (FR-019)
- [ ] T018 [US2] Regenerate `src/types/database.ts` via `scripts/db-types-check.sh`

**Gate**: `bash scripts/verify-migrations.sh` → `MIGRATION VERIFICATION PASSED`, including
the new RULE-V5 assertion (T015).

---

## Phase 4 (C2): The one-tap check-in

**Purpose**: Everything else in this feature is computed from check-ins. **Story: US1.**

**Independent test**: Check in with one tap, confirm the privacy microcopy is present
beside the fields, confirm a second account cannot read the note, confirm an offline
check-in survives a reload and flushes with no user action once online.

- [ ] T019 [US1] `src/lib/sadhana/local-day.ts` — `resolveLocalDay()`, computed from the
  browser's current timezone at submission, never at open (FR-005, decision #1)
- [ ] T020 [US1] `src/lib/storage/checkin-outbox.ts` — the offline queue, per
  `research.md`'s decision on reuse-vs-new (T005); a check-in made offline is never lost
  and never reported in a state the server does not hold (FR-010)
- [ ] T021 [US1] Check-in UI: one-tap mood (3–5 discrete icons, no slider — FR-001),
  duration auto-filled from a just-completed flow and editable (FR-002), note and flow
  link optional and visually secondary (FR-003)
- [ ] T022 [US1] Permanent "only you can see this" microcopy beside the check-in fields,
  not behind a link or in settings (FR-004, UX-002)
- [ ] T023 [US1] The bounded "log for yesterday" affordance: visible only within the short
  window decision #1 describes, gone once the window passes or a newer check-in exists, no
  free-form date entry anywhere (FR-006, FR-007)
- [ ] T024 [US1] A second check-in on the same local day updates the first rather than
  creating a second day or double-advancing any count (FR-008)
- [ ] T025 [P] [US1] `npm run lint:copy` over every new string on this path
- [ ] T026 [P] [US1] `npm run lint:telemetry` over any new call site near the check-in
  component tree — mood and note must never appear as a field name, even indirectly
- [ ] T027 [US1] Playwright: check-in walk (one tap, microcopy present, second account
  denied); a second walk with `context.setOffline(true)` proving the offline case (T020)

**Gate**: check-in walk green; offline check-in walk green; `npm run lint:copy` and
`npm run lint:telemetry` both green on this path's diff.

---

## Phase 5 (C3): The record never turns into a debt

**Purpose**: The feature's primary constitutional surface. **Story: US2.**

**Independent test**: Generate check-in histories with gaps of varying length; the
displayed streak never decreases, rest logs as a distinct state, no screen contains a
countdown, a warning colour, or a missed-day count.

- [ ] T028 [US2] `src/lib/sadhana/streak.ts` — `computeStreak(checkins, graceBudget)`,
  pure, per `research.md`'s consumption rule; a single number that never decreases and
  never shows zero after a first practice (FR-015)
- [ ] T029 [US2] Streak display: no warning colour state, no countdown, anywhere
  (FR-016, FR-017)
- [ ] T030 [US2] "Log rest" — one tap, same visual weight as "Log practice," neither
  smaller nor de-emphasized (FR-013, UX-005)
- [ ] T031 [US2] Practice-state model: practised, rested, silently-absent. Only the first
  two render calendar chips; a silently-absent day renders nothing and produces no notice
  (FR-011, FR-012). Practice takes precedence over rest on a day with both, with no
  double-count (FR-014)
- [ ] T032 [US2] Grace-budget detail: absent from Today (FR-018), stated calmly on request
  from the streak detail, reading sensibly at both zero-used and fully-used (FR-020)
- [ ] T033 [US2] Milestone cards (10/30/90): shown once, forward-invitation framing,
  nothing to defend/protect/maintain/lose, no purchase offered (FR-021, FR-022). Two
  milestones in one day: one card at a time, neither lost (FR-023)
- [ ] T034 [US2] **Decision #3, negative assertion**: a test (or, failing a positive test
  of an absence, a documented manual check recorded in this task's PR) confirming no
  streak-repair, -restore, or -undo affordance exists anywhere in the UI or as an RPC
  (FR-024). This task's "implementation" is the confirmed absence, not a feature
- [ ] T035 [P] [US2] `npm run lint:copy` over every new string on this path — a
  deliberately introduced coercive phrase must fail the build (FR-025, SC-009)
- [ ] T036 [P] [US2] Vitest: generated check-in histories with gaps, asserting the streak
  never decreases and never re-shows zero after a first practice (SC-004)

**Gate**: SC-004, SC-005, SC-006, SC-007, SC-008 asserted by the tests above, not
eyeballed; `npm run lint:copy` green.

---

## Phase 6 (C4): Coming back reads as a return, not a reckoning

**Purpose**: The moment of return either earns the product's stance or abandons it.
**Story: US3.**

**Independent test**: Write an intention, revise it, simulate a gap that began before the
revision, confirm the card quotes the earlier version and offers the three responses.

- [ ] T037 [US3] `intentions` write path: every revision is a new row, no version
  overwritten or deleted (FR-026) — enforced by T009/T012's RLS (no update/delete policy),
  not by application discipline alone
- [ ] T038 [US3] `src/lib/sadhana/return-card.ts` — the version-matched lookup: quote the
  intention active when the lapse *began*, not the newest version (FR-027)
- [ ] T039 [US3] Return card: plain elapsed-time statement, two flat equal-weight actions
  ("keep" / "update"), neither styled as a warning (FR-028, FR-029)
- [ ] T040 [US3] "I'm resting, not stopping" as a third response — the card is never a
  binary between practising and ignoring it (FR-030). Choosing it does not immediately
  re-show the card and frames nothing as a lapse (FR-031)
- [ ] T041 [US3] Re-entry offer: the smallest unit the pose model supports, drawn from the
  intention's original flow (FR-032); no copy proposes catching up (FR-033)
- [ ] T042 [US3] No intention recorded: no return card is shown and nothing is invented in
  its place (FR-034)
- [ ] T043 [US3] A lapse threshold changed mid-lapse takes effect without re-showing a
  card already answered (FR-035)
- [ ] T044 [P] [US3] `npm run lint:copy` over every new string on this path
- [ ] T045 [P] [US3] Vitest: write an intention, revise it, simulate a lapse start before
  the revision, assert the card quotes the pre-revision version (SC-010)

**Gate**: SC-010, SC-011 asserted; `npm run lint:copy` green. Decision #5 (memory-echo)
stays out of scope — see "Deferred, and why" below.

---

## Phase 7 (C5): Sharing signals, and the dashboard that reads them

**Purpose**: The visibility grant is legible and one tap to end; the dashboard that
depends on it structurally cannot see content. **Story: US4, US5.**

**Independent test (US4)**: Enroll one account in two organizations, confirm two
independent controls, revoke one, confirm the other is unaffected and the revoked one is
durably off. **Independent test (US5)**: Run a query with a cohort teacher's credentials
directly against `practice_reflections` for an enrolled student and confirm it returns
nothing or is refused.

- [ ] T046 [US4] Sharing pill: visible on Today whenever an enrollment's `share_signals`
  is true, naming the organization (FR-044). No pill when an account belongs to an org
  with no active enrollment (FR-052)
- [ ] T047 [US4] Tapping the pill opens a sheet listing exactly what is shared, in plain
  language, before a single named "stop sharing with [Org]" action (FR-045)
- [ ] T048 [US4] One control per enrollment, never a single global switch (FR-046);
  stopping one does not affect another (FR-047)
- [ ] T049 [US4] Wire the stop action to `002`'s existing `app_revoke_signal_sharing` RPC
  — a direct single write, no soft flag, no derived permission (FR-048)
- [ ] T050 [US4] **Decision #8**: a single undo toast (5–8s), no blocking confirmation
  dialog (FR-049). **Decision #13**: reuse the existing accent and ≤200ms motion budget —
  no new design token
- [ ] T051 [US4] After the undo window passes, signals are no longer returned to that
  organization, including to an in-progress teacher session (FR-050); sharing does not
  reactivate on any event other than an explicit named grant (FR-051)
- [ ] T052 [US5] Cohort dashboard (route TBD in `research.md`, T005): per student, name,
  status, streak state, days since last check-in, milestone progress (FR-053) — reading
  only `practice_checkins` and `practice_milestones`, never `practice_reflections` or
  `intentions` (FR-055)
- [ ] T053 [US5] Status pill: plain non-punitive vocabulary, no warning colour (FR-054)
- [ ] T054 [US5] **Decision #2**: derived "practiced today" boolean, from check-in
  existence only, structurally separate from the check-in component tree (FR-059)
- [ ] T055 [US5] Persistent one-line boundary caption on the dashboard (FR-057, UX-018)
- [ ] T056 [US5] A student who stopped sharing is absent from the dashboard, and their
  absence is not itself reported as a status (FR-058); an ended enrollment stops being
  returned on the next query (FR-061); a student in two cohorts is visible to each teacher
  only to the extent that enrollment's sharing state permits (FR-060)
- [ ] T057 [P] [US4] [US5] `npm run lint:copy` over every new string on this path
- [ ] T058 [P] [US5] Vitest/integration: the SC-016 query test against `practice_reflections`
  (may already be satisfied by T015 in Phase C1 — confirm and cross-reference rather than
  duplicate)

**Gate**: SC-014, SC-015 asserted for US4; SC-016, SC-017, SC-018 asserted for US5;
`npm run lint:copy` green. Decision #9 (pre-grant disclosure) stays out of scope — see
"Deferred, and why" below.

---

## Phase 8 (C6): Guidance arrives once, one card at a time

**Purpose**: Guidance that queues becomes an obligation. **Story: US6 (P2).**

**Independent test**: Fire several triggers at once, confirm exactly one card renders,
selected by authored priority, and that dismissing it consumes the trigger with no queue
left behind.

- [ ] T059 [US6] `data/guidance/*.md` frontmatter schema: exactly one named trigger, one
  authored static priority (decision #7, FR-036, FR-037) — **no entry body is authored
  until `contracts/guidance-tone.md` (T007) is signed off**; this task ships the schema
  and validator against zero or placeholder-only entries
- [ ] T060 [US6] `scripts/validate-guidance.mjs` — CI fails on a missing or duplicate
  priority (FR-038, decision #7)
- [ ] T061 [US6] `src/lib/sadhana/guidance.ts` — trigger/priority selection, pure; at most
  one card renders at any time (FR-039)
- [ ] T062 [US6] A shown-or-dismissed card consumes its trigger via
  `practice_guidance_dismissals` and is never queued; no unread badge, no count, no
  backlog (FR-040, FR-041)
- [ ] T063 [US6] A gap-triggered card gives one clear next action, counts no missed days,
  shows no reset to zero (FR-042) — **held pending T007's sign-off**, same as T059
- [ ] T064 [US6] The corpus is not exposed as a browsable library; no navigation entry
  leads to one (FR-043)
- [ ] T065 [P] [US6] Vitest: simultaneous-trigger selection resolves to exactly one card,
  by authored priority (SC-012); CI fails on 100% of missing/duplicate-priority fixtures
  (SC-013)

**Gate**: `validate-guidance.mjs` fails on a deliberately broken fixture; T059/T063 remain
schema-only (no shipped prose) until `contracts/guidance-tone.md` is signed off — this is
the same "build now, words wait" split `003` used for its two held copy contracts.

---

## Phase 9 (C7): Today is the home screen

**Purpose**: Make Today the app's home rather than one tab among five. **Story: US7 (P2).**

**Independent test**: Walk the navigation, confirm three tabs, that composing and the
flow library are both reachable under Teach, and that the end-to-end walk tests pass in
the same commit.

- [ ] T066 [US7] Primary navigation: exactly three destinations — Today, Teach, Poses
  (FR-062). `/compose` and `/flows` merge under Teach
- [ ] T067 [US7] Account avatar: standalone header element, not a fourth nav entry, same
  minimum touch target as the tabs (FR-063)
- [ ] T068 [US7] **Decision #12**: initials-based placeholder when no profile image is set
  (FR-064)
- [ ] T069 [US7] Retire `nav-home`, `nav-compose`, `nav-flows`, `nav-poses`, `nav-learn`
  from the `docs/krama-guardrails.md` §1.3 testid contract table, and update every
  affected Playwright walk test, **in the same commit** as T066 (FR-065)
- [ ] T070 [US7] **Decision #11**: retire `/learn` as a route; fold its content into what
  Today surfaces. A previously bookmarked `/learn` visit redirects to its new location
  rather than erroring (FR-066, FR-067)
- [ ] T071 [P] [US7] `npm run test:e2e` — full suite green with the retired identifiers
  gone and no follow-up commit required (SC-019, SC-020)

**Gate**: `npm run test:e2e` green in the same commit as the nav change; zero references
to the five retired testids anywhere in `tests/` or `docs/krama-guardrails.md`.

---

## Deferred, and why

| Item | Decision # | Reason |
|---|---|---|
| Streak repair/undo mechanic | #3 | **Will not build.** Closed per the Constitution Check, not reopened here as a smaller version |
| Memory-echo (surfacing a past check-in note in the return card) | #5 | Depends on the note data model this same feature defines; sequencing it after the copy-only return card ships avoids a circular dependency within one feature |
| Pre-grant disclosure of shared fields at enrollment time | #9 | Blocked on `002`'s enrollment/join UI, which does not exist yet. `005` ships the standing pill/sheet/one-interaction-revoke protection (FR-044–051) regardless; disclosure ships with the enrollment flow whenever that is scoped |
| Cross-cohort aggregate reporting for org admins | #10 | Not this feature's scope at current (single-customer) scale; a later feature's problem if it arrives |
| A new design token for the undo toast | #13 | Reuses the existing single accent and the ≤200ms motion budget already governing the app; a token used by one component would be worse than reuse |

## Verification, at each phase boundary

```bash
npx tsc --noEmit
npm test                            # must only rise from main's count
npx vitest run --coverage           # friction, validator-lite, tier1-report, copy-lint,
                                     # and this feature's pure modules (streak, local-day,
                                     # guidance selection, return-card lookup) all counted
npm run lint:copy                   # blocking; must stay green, including every new string
npm run lint:telemetry              # blocking; must stay green against the new mood/note/
                                     # intention fields this feature introduces
npm run validate:poses              # unaffected by this feature; must stay green
npm run validate:guidance           # NEW (Phase C6) — fails on a missing/duplicate priority
bash scripts/verify-migrations.sh   # from Phase C1 on, including the RULE-V5 proof (T015)
npm run dev &                       # playwright.config.qa.ts has no webServer
npm run test:e2e                    # must stay green; grows by the walks each phase adds
```
