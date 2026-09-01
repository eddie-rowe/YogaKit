---

description: "Task list for feature 003-pose-library"
---

# Tasks: Pose Library

**Input**: Design documents from `/specs/003-pose-library/`
**Prerequisites**: `spec.md`, `design-input.md`, `checklists/requirements.md` (all
complete); `plan.md`, `research.md`, `data-model.md`, `contracts/` (authored in Phase 1
below)

**Tests**: Included, and in three places non-negotiably. US1's whole claim is that
Tier-1 completeness is *provable* — a story about a gate that has no test of the gate
would be self-refuting (SC-001, and the never-completed `001` debt T074). US3's
region↔legend round trip is the mechanical form of SC-004. US6's RLS assertions are
safety-critical (SC-011). The friction engine and validator-lite are untouched by this
feature; their constitutionally mandated 100% coverage must not drop as a side effect of
adding new files to `vitest.config.ts`'s `coverage.include`.

**Organization**: By user story, and each phase is one PR. There is no large shared
foundational phase — unlike `002`, this feature's stories touch mostly disjoint files
(`scripts/` for US1, `PoseDetailContent.tsx` for US2, `BodyDiagram`/`BodySvg` for US3,
`PosesClient.tsx` for US4/US5, new tables for US6). The two deliberate splits recorded in
`plan.md`'s Phasing section — Phase 3 from Phase 4, Phase 7 from Phase 8 — should not be
collapsed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to US1–US6 from `spec.md`

## Path Conventions

Single Next.js project, per `plan.md`'s Project Structure. Paths below are exact matches
to that section.

---

## Phase 1: Planning artifacts and pointer repair

**Purpose**: Give `003` the spec-kit artifacts it never had, and draft both copy contracts
now so one review round clears the deferred stories' only blocking dependency.

- [X] T001 Author `specs/003-pose-library/plan.md` — technical context, Constitution Check
  against v3.0.0, the three reality corrections, phasing
- [X] T002 [P] Author `specs/003-pose-library/research.md` — six resolved unknowns, three
  of them corrections to the spec's own premises
- [X] T003 [P] Author `specs/003-pose-library/data-model.md` — the 24 Tier-1 fields, the
  `energetic_direction` label map, the region↔legend model, US6's schema as design
- [X] T004 [P] Author `specs/003-pose-library/contracts/theme-taxonomy.md` — the 38 → 13
  collapse with every occurrence accounted for, plus one subhead per theme
  **[OWNER SIGN-OFF]**
- [X] T005 [P] Author `specs/003-pose-library/contracts/score-explanation.md` — FR-022/023
  copy written for authored, not derived, scores **[OWNER SIGN-OFF]**
- [X] T006 [P] Author `specs/003-pose-library/contracts/pose-personalization.md` — US6
  read/write contract and its invariants as assertions
- [X] T007 Author this file
- [X] T008 Repoint `.specify/feature.json` from `specs/002-auth-tenancy-billing` to
  `specs/003-pose-library`
- [X] T009 Repoint `CLAUDE.md`'s current-plan line, inside the `SPECKIT START/END`
  markers, which hardcodes 002's plan as "the current plan"

**Checkpoint**: `003` has the same artifact set as `002`, and the two deferred copy items
are drafted rather than blocking.

---

## Phase 2: US1 — Tier-1 completeness is provable, not asserted (P1)

**Goal**: The validator reports a Tier-1 coverage figure, names the offending value on an
enum failure, and has a seam a test can reach.

**Independent test**: Delete a Tier-1 field from one pose locally and run
`npm run validate:poses` — exit 1, naming the pose and the field.

- [ ] T010 [US1] Create `scripts/lib/tier1-report.mjs` — pure, no `fs`:
  `deriveTier1Fields(schema)` (`required` minus `x-tier2-properties`, so the script cannot
  drift from the schema), `formatAjvError(err, data)`, `tier1Coverage(poses, fields)` →
  `{ perField, overall, gaps }`
- [ ] T011 [US1] Rename `scripts/validate-poses.js` → `.mjs`, update `package.json`'s
  `validate:poses`, and import the above
- [ ] T012 [US1] Replace the error loop at the old `:39-41` with `formatAjvError` — FR-005,
  FR-006. Ajv's bare *"must be equal to one of the allowed values"* must become a message
  naming both the offending value and `err.params.allowedValues`
- [ ] T013 [US1] Emit the FR-007 coverage figure above the existing Tier-2 block, plus a
  per-field line for any field below 100%. The Tier-2 report stays verbatim and still never
  fails CI
- [ ] T014 [US1] Add an optional `--dir <path>`, defaulting to `data/poses`, for the
  spawn-level test below
- [ ] T015 [P] [US1] Create `docs/design/003-tier1-review.md` — the FR-009 attributable
  review record (slug, reviewer, date, verdict, corrections). Carries forward `001`'s T027,
  which is owner-blocked: the review is Gioconda & Tavo's, the *record* is buildable here
- [ ] T016 [US1] Make T015 mechanical rather than decorative: the script **warns, never
  fails**, when a reviewed pose's geometry fields have changed since its recorded review
  date
- [ ] T017 [US1] Create `tests/unit/pose-library/tier1-report.test.ts` — the SC-001 / `001`
  T074 proof, which has never existed. In-memory: a pose missing `base_of_support` appears
  in `gaps` naming slug and field; `energetic_direction: "yang"` produces a message
  containing `"yang"` and all three permitted values (FR-006, US2/AS3); a pose missing
  `source` appears in `gaps` (FR-004); a complete set gives `overall === 1`
- [ ] T018 [US1] One spawn-level case, because SC-001 is about the *gate* failing: run the
  script with `--dir` against a one-file fixture directory and assert **exit code 1**
- [ ] T019 [P] [US1] Convert the 9 `require()` calls to top-level `node:fs` / `node:path`
  imports — `src/lib/pose-library/index.ts:9-10`, `src/lib/flow-library/index.ts:8-9`,
  `src/lib/meridians/index.ts:4-5`, and the three in `scripts/validate-poses.js` cleared by
  T011. All are server-only
- [ ] T020 [P] [US1] Correct the false comment at `src/lib/pose-library/index.ts:3`, which
  claims "never fetched at runtime (RULE-L3)" directly above a runtime
  `fs.readdirSync(process.cwd())`
- [ ] T021 [US1] Add `scripts/lib/tier1-report.mjs` to `vitest.config.ts`'s
  `coverage.include` with its own threshold, leaving `src/lib/friction/index.ts` and
  `src/lib/validator/lite.ts` at their mandated 100

**Checkpoint**: `npm run validate:poses` prints a coverage figure; `npm run lint` is 9
errors lighter.

---

## Phase 3: US2 — energetic direction, readable outside the composer (P1)

**Goal**: `energetic_direction` — present on 67/67 poses, in the schema's `required`, and
today rendered only as an unglossed Sanskrit token in a composer surface `003` must not own
— becomes readable on the pose itself.

**Independent test**: Open `/poses/camel` (a `brahmana` pose) at 390px and read the
direction with its English gloss.

- [ ] T022 [US2] Create `src/lib/pose-library/energetic-direction.ts` — one exported map
  from the three enum values to `{ label, gloss }`: `langhana` → reducing, `brahmana` →
  building, `samana` → balancing (FR-010's own wording). Sanskrit stays visible alongside
  the English; it is traditional vocabulary, not invented UI copy, and `004` will want the
  same map
- [ ] T023 [US2] Render it in `src/app/poses/PoseDetailContent.tsx`'s meta block at
  `:187-208` (FR-012), at the `simple` layer — FR-012 says "readable", not "gated". Use
  `var(--surface-raised)` / `var(--foreground)` like its siblings. **Not purple**: purple is
  the sanctioned chakra hue and re-spending it here is the FR-040 / SC-014 palette migration
  the spec guards against
- [ ] T024 [US2] Delete `export const dynamic = 'force-dynamic'` from
  `src/app/poses/page.tsx:5` (`research.md` §6) and confirm in the `next build` route table
  that `/poses` becomes static. If the build reveals a reason it must stay, record that
  reason in `research.md` rather than silently reverting
- [ ] T025 [P] [US2] Unit test: the map is exhaustive over the schema's enum, so adding a
  fourth value fails the test rather than rendering blank
- [ ] T026 [P] [US2] Playwright assertion at 390px on `/poses/camel` that
  `poses-detail-energetic-direction` is present
- [ ] T027 [US2] **Do not touch** `ComposeFlowItem.tsx` or `ComposeClient.tsx` — every
  composer render is `004`'s. `research.md`'s "Note for 004" already records that its
  purple chip should adopt this map and drop the chakra-hue collision

**Checkpoint**: the direction is legible on every pose detail page, and `/poses` is static.

---

## Phase 4: US3 — the anatomy diagram and its legend read as one view (P1)

**Goal**: No dead-end tabs, bidirectional region↔legend linking, one control row at 390px,
and diagram chrome that survives dark mode.

**Independent test**: Tap the `hip-flexors` legend chip — three regions highlight. Tap
`region-psoas` — both `psoas` and `hip-flexors` chips highlight.

**Write T035 first.** It is the mechanical form of SC-004, it passes against real data
today, and it fails the day someone adds a region path with no map entry.

- [ ] T028 [US3] `BodyDiagram.tsx`: filter `TABS` to categories holding data and derive
  `activeTab` from the first survivor. `:40` hardcodes `'muscles'`, which is wrong for a
  pose with no muscle data. Three cases: **zero** → return `null`; **one** → a labelled
  heading, not a degenerate one-tab `Tabs.Root`; **two or more** → tabs minus the empty ones
  (FR-016, FR-017)
- [ ] T029 [US3] Guard the caller at `PoseDetailContent.tsx:170-183` so the zero case leaves
  no orphaned heading above nothing. Two poses hit this path: `rebound-supine` and
  `seated-stillness`
- [ ] T030 [US3] Delete the absolute-positioned "No {activeTab} data for this pose" overlay
  at `BodyDiagram.tsx:129-136` — unreachable after T028, and FR-017 wants an absent frame
  rather than an empty one
- [ ] T031 [US3] Derive `REGION_TO_MUSCLES` in `src/lib/pose-library/body-map.ts` from
  `MUSCLE_REGION_MAP` at module load — derived, never hand-maintained, so the two cannot
  disagree. The many-to-many case is real: `region-psoas` is reached from both `psoas` and
  `hip-flexors` (FR-013, FR-014)
- [ ] T032 [US3] Widen `getActiveJointIds` (`body-map.ts:179`) to carry the `JointName`; it
  returns `Array<{cx, cy}>` and discards the name that joint-legend linking needs. Breaking
  signature change — grep every call site first
- [ ] T033 [US3] Add `getLegendEntries(…, view)` returning
  `{ key, label, category, regionIds, primaryView }`, so a cross-view legend tap has
  something to switch *to*
- [ ] T034 [US3] Lift `selected: { source: 'region' | 'legend'; key: string } | null` into
  `BodyDiagram` and pass it to both `BodySvg` and the legend. Legend chips become `<button>`s
  with `aria-pressed` (plain `<span>`s today at `:175/183/190/197`) and the `kk-chip`
  min-height, so FR-026's 40px floor reaches them. Highlighting is set-to-set in both
  directions (SC-004). A back-only entry tapped from the front view sets `view` and the
  highlight in **one** state update — otherwise the tap is a silent no-op. Express selection
  with border weight and a ring, **never** by promoting a data hue to an active background
- [ ] T035 [US3] Create `tests/unit/pose-library/body-map.test.ts` — `REGION_TO_MUSCLES`
  inverts losslessly; `region-psoas` → both `psoas` and `hip-flexors`; **every id in
  `REGION_TO_MUSCLES` exists as a key in `BodySvg`'s `MUSCLE_PATHS` and vice versa**;
  `getActiveJointIds` returns distinct ids for a bilateral pair
- [ ] T036 [P] [US3] Create `tests/unit/poses/body-diagram.test.tsx` — muscles-only fixture:
  one heading, no `Tabs.Root`; muscles+joints: exactly two triggers; all-empty: empty
  container, and `No … data for this pose` appears nowhere
- [ ] T037 [P] [US3] Create `tests/unit/poses/body-diagram-linking.test.tsx` — region click
  → matching legend button `aria-pressed="true"`; a back-only entry clicked from the front
  view flips the view *and* highlights; a region with two legend entries highlights both
- [ ] T038 [US3] Combine `Tabs.List` and the front/back toggle into one control row at 390px
  — two stacked rows today, the toggle `self-end` below the tabs. Scroll-snap if four tabs
  plus a toggle will not fit (FR-018)
- [ ] T039 [US3] Replace hardcoded chrome in `BodyDiagram.tsx:81,86,90,107-108,117,132`:
  `bg-stone-100` → `var(--surface)`, `bg-stone-50` → `var(--surface-raised)`,
  `bg-stone-800 text-white` → `var(--accent)` / `var(--accent-foreground)`, `text-stone-500`
  → `var(--muted)`, borders → `var(--border)` (guardrails §2)
- [ ] T040 [US3] `BodySvg.tsx:19-21` is the worse offender — `BodySilhouette` hardcodes
  `#f5f4f2` / `#dcd8d3`, so the body renders as a bright slab in dark mode. The silhouette is
  chrome, not pose data, so §2's hue exception does not cover it → `var(--surface-raised)` /
  `var(--border)`
- [ ] T041 [US3] Leave the four data hues exactly as they are — `#818cf8`, `ELEMENT_COLORS`,
  `#475569`, the chakra colours. They encode pose *content* and are §2's explicit exception
  (FR-040). Verify the depth legend's `fill="#818cf8"` swatches read correctly against dark
  rather than assuming, but do not tokenize them
- [ ] T042 [P] [US3] Create `tests/unit/poses/motion-budget.test.ts` — a source scan over
  `src/components/poses/**` and `src/app/poses/**` rejecting `\d{3,}ms`, `cubic-bezier`,
  `spring`, `bounce`. `BodySvg.tsx` already uses the duration tokens, so this *keeps* FR-019
  true rather than establishing it, and is SC-007's "measured rather than assumed" for about
  fifteen lines
- [ ] T043 [P] [US3] Create `tests/e2e-qa/poses-anatomy.spec.ts` at 390px —
  `/poses/seated-stillness` has zero `poses-body-diagram` nodes; visible trigger count equals
  the categories holding data (SC-005); the tab row and front/back toggle share one
  `boundingBox().y`
- [ ] T044 [US3] Check the keyboard path through the Radix `Tabs` group and the new legend
  buttons at 390px — T034 puts the legend in the tab order for the first time

**Checkpoint**: the diagram is correct in both themes, and every region and chip highlights
something.

---

## Phase 5: Contract reconciliation

Ships in the same commit as Phase 4.

- [ ] T045 Backfill the two already-drifted rows in `docs/krama-guardrails.md` §1.3:
  `poses-clear-all-filters` and `body-diagram-depth-legend` are in `src/` and absent from the
  table that declares itself the source of truth
- [ ] T046 Add the new rows: `body-diagram-tab-{muscles|meridians|joints|chakras}`,
  `body-diagram-view-{front|back}`, `body-diagram-legend-{item}`, `body-diagram-region-{id}`,
  `poses-detail-energetic-direction`
- [ ] T047 Note in `design-input.md` that its "Testid contract impact: None identified" line
  was already inaccurate before `003` added anything, rather than silently correcting the
  table — the same treatment UX-011 got last pass

---

## Phase 6: US4 — filter affordances and score explanations (P2) — *deferred*

**Blocked on**: `contracts/score-explanation.md` sign-off (T005).

- [ ] T048 [US4] Give multi-select chip groups an affordance beyond active-state colour, so
  an inactive multi-select is distinguishable from an inactive single-select (FR-020, SC-008)
- [ ] T049 [US4] Confirm multi-select result sets combine rather than replace, consistent
  with the affordance shown (FR-021)
- [ ] T050 [US4] Render `complexity` and `injury_risk` for the first time — neither appears
  in the UI today, only as sort options and two max sliders. `complexity` unconditionally
  (Tier-1); `injury_risk` behind a `!= null` guard (Tier-2, `plan.md` decision 1), so today's
  67/67 coverage does not become load-bearing
- [ ] T051 [US4] Add the in-place explanation from `contracts/score-explanation.md`
  (FR-022, FR-023). It must not claim a computation: these are authored integers, and the
  friction engine never reads either field
- [ ] T052 [US4] State which constraints produced a zero-result filter combination (FR-024)
- [ ] T053 [US4] Make clear-all reachable from the top level whenever any filter is active,
  independent of the advanced panel's state (FR-025)
- [ ] T054 [P] [US4] Test SC-009 mechanically: every rendered score node has an adjacent
  explanation trigger, so the ratio cannot silently drop below 100%
- [ ] T055 [P] [US4] Copy test rejecting "calculated", "derived", "computed", "the engine"
  in the explanation strings — what keeps the contract true after the PR that introduced it
- [ ] T056 [P] [US4] Assert the 40px touch-target floor on every filter chip (FR-026)

---

## Phase 7: US5 — close the theme taxonomy, then add subheads (P2) — *deferred*

**Blocked on**: `contracts/theme-taxonomy.md` sign-off (T004).
**Re-estimate before scheduling.** This is a data migration wearing a copy story's clothes
— see `research.md` §2.

- [ ] T057 [US5] Create `data/schemas/theme-taxonomy.json` — 13 entries with `slug`, `label`,
  `subhead`, `tcm_organs[]`, per the signed contract
- [ ] T058 [US5] Add an `enum` on `emotional_release_potential[].emotion` in
  `data/schemas/pose.schema.json`, keeping the field in `x-tier2-properties` so the enum can
  fail CI on a bad value without the Tier-1 gate changing shape
- [ ] T059 [US5] Patch the pose files carrying non-canonical values, in one attributable
  commit. 38 distinct strings across 101 occurrences today, including three spellings of
  grief, three of frustration, and one snake-cased `tension_and_control`
- [ ] T060 [US5] Delete `slugifyEmotion` (`PosesClient.tsx:57-59`) and group on taxonomy
  slugs, so `poses-theme-section-{slug}` becomes stable
- [ ] T061 [US5] Render the subheads (FR-027) — one per section, non-prescriptive. The
  contract's tone rule: describe anatomy and intent, never the reader's inner state
- [ ] T062 [US5] Fix the `--font-cormorant` bug — `--font-serif` maps to an undefined
  variable, so every `font-serif` heading silently falls back. It affects exactly the theme
  headings this phase reworks, which is why it lands here rather than on its own
- [ ] T063 [US5] Keep element, chakra, and dosha visible as cross-filters in theme mode
  (FR-028)
- [ ] T064 [US5] Confirm theme browsing stays stateless with respect to the reader — no
  mood, no history, no inference (FR-030)
- [ ] T065 [P] [US5] Validator cross-check: every emotion in the data resolves to a taxonomy
  entry, and every taxonomy entry has a non-empty subhead. That mechanises SC-010 rather
  than asserting it

---

## Phase 8: US6a — schema, RLS, CI assertions, no UI (P3) — *deferred*

Per `contracts/pose-personalization.md` and `data-model.md` §5. **No UI in this phase** —
its whole claim is that FR-033 is verifiable from the schema alone.

- [ ] T066 [US6] Migration creating `pose_favourites` and `pose_notes`, modelled on
  `supabase/migrations/20260826224207_claimed_flows.sql:11-36`: `user_id` FK to
  `auth.users` with `on delete cascade`, RLS enabled, four policies each
  `user_id = (select auth.uid())`, the update policy carrying both `using` and `with check`
- [ ] T067 [US6] `unique (user_id, pose_slug)` on both tables, so favouriting is idempotent
  and there is one mutable note per pose
- [ ] T068 [US6] `pose_slug text not null` with **no FK and no CHECK** — enumerating valid
  slugs in Postgres would make the database a second authority over pose identity against
  FR-003 and RULE-O6, and FR-039's quiet degradation then falls out of the client-side join
- [ ] T069 [US6] Regenerate `src/types/database.ts`; `scripts/db-types-check.sh` drift-checks
  it in CI
- [ ] T070 [P] [US6] RLS test I1/I2 (SC-011): a second account — including an org admin
  sharing an organization with the author — reading a note by any means, including by explicit
  `id`, receives zero rows
- [ ] T071 [P] [US6] RLS test I3: an update cannot move a row to another `user_id`
- [ ] T072 [P] [US6] Test I4 over `information_schema.columns`: neither table has a column
  referencing an org, cohort, or role. This is the only invariant that protects itself against
  a *later* migration (RULE-V2)
- [ ] T073 [P] [US6] Test I5 (SC-013): deleting the `auth.users` row leaves zero rows in
  either table
- [ ] T074 [P] [US6] Test I7 (SC-012): the signed-out pose read path issues no Supabase call.
  The one a well-meaning refactor breaks by accident

---

## Phase 9: US6b — favourites and notes UI (P3) — *deferred*

- [ ] T075 [US6] Favourite / unfavourite control on pose detail (FR-031), persisted per
  account and cross-device
- [ ] T076 [US6] Note editor: write, edit, delete, one note per pose (FR-032)
- [ ] T077 [US6] Keep personalization fetched separately from pose data, never joined into
  it. `getPose(slug)` and the catalog loader stay pure functions over JSON with no `user_id`
  parameter and no Supabase client in their signature — that is what keeps FR-035 checkable
  by reading the function type
- [ ] T078 [US6] Degradation rules from the contract's table: signed out → controls absent,
  not disabled-with-a-tooltip, which advertises a wall; offline → visible, a failed write
  retries with no data loss; lapsed entitlement → read *and delete* remain available, with no
  urgency or countdown copy (FR-037, RULE-C2)
- [ ] T079 [P] [US6] Test I6 (FR-039): a favourite whose slug is absent from the library
  renders nothing and throws nothing
- [ ] T080 [US6] Add the five personalization testids to `docs/krama-guardrails.md` §1.3 —
  in *this* PR, not earlier, since §1.3 requires the table move in the same change as the code

---

## Dependencies

- Phase 1 blocks nothing technically, but T004/T005 are the only gate on Phases 6 and 7.
- Phases 2, 3, 4 are independent of each other and of everything else. Phase 3 before Phase
  4 is a review-clarity choice, not a technical dependency.
- Phase 5 rides with Phase 4.
- Phase 8 blocks Phase 9. Nothing blocks Phase 8 except scheduling.
- T035 before T031–T034, deliberately: it passes against today's data, so it is the safety
  net for the refactor rather than its afterthought.

## Carried-forward debts from `001`

| `001` task | Status | Lands as |
|---|---|---|
| T027 — human Tier-1 review by Gioconda & Tavo | Owner-blocked, unchanged | T015/T016 build the attributable *record* and the staleness warning; the review itself stays outside what an agent can perform |
| T074 — Tier-1 validator test | Never written | T017/T018 |
