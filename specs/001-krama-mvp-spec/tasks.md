# Tasks: Krama MVP (v0.1)

**Input**: `spec.md`, `plan.md`, `data-model.md`, `contracts/friction-engine.md`,
`contracts/flow-file-format.md`, `contracts/pose-library-schema.md`, `docs/krama-atlas.md`,
`docs/krama-guardrails.md`
**Amended**: 2026-08-17 — regenerated against the deterministic v0.1 architecture. The
prior T001–T078 breakdown (AI pipeline, dimension form, timer view) is not preserved
inline here; it's recoverable from git history at commit `d48ce81` and remains the
reference for v0.2's parked-code follow-up. Tasks below are renumbered from T001.

**Tests**: Tests are REQUIRED for the friction engine and validator-lite (constitution
mandate, 100% line coverage) and for the `.krama.json` round-trip (SC-005). Elsewhere,
tests are written where they gate a P1 story's acceptance criteria.

**Organization**: Grouped by phase per the approved merge plan
(`~/.claude/plans/please-investigate-this-spec-proud-hoare.md`), then by user story
within Phase D so stories stay independently completable and testable.

---

## Phase A — Governance (Aug 31 gate) — DONE (commit `0204a3a`)

- [X] T001 Amend `.specify/memory/constitution.md` to 2.0.0
- [X] T002 Update `CLAUDE.md` non-negotiables and key artifacts list
- [X] T003 Update `CONTRIBUTING.md` engine-architecture section
- [X] T004 Author `docs/krama-atlas.md`
- [X] T005 Author `docs/krama-guardrails.md`
- [X] T006 Author `DECISIONS.md`, `FRICTION.md`

## Phase B — Spec artifacts (Aug 31 gate) — IN PROGRESS

- [X] T007 Rewrite `spec.md` — new P1/P2 user stories, Deferred to v0.2 appendix
- [X] T008 Rewrite `plan.md` — Technical Context, Constitution Check v2.0.0, project structure
- [X] T009 Rewrite `data-model.md` — Flow/FlowItem/Phase/Block/StillnessNode/LayerPreference/FrictionResult
- [X] T010 Author `contracts/friction-engine.md`
- [X] T011 Author `contracts/flow-file-format.md`
- [X] T012 Rewrite `contracts/pose-library-schema.md` for Atlas tiers
- [X] T013 Mark `contracts/pipeline-api.md` parked (banner + rename note, not deleted)
- [X] T014 Rewrite `quickstart.md`
- [X] T015 Amend `research.md` — friction engine + validator-lite decisions; mark AI sections deferred
- [X] T016 Annotate `checklists/requirements.md`, `checklists/spec-quality.md` as historical
- [X] T017 Regenerate `tasks.md` (this file)
- [X] T018 Commit Phase B as a documentation-only commit (`23bd33a`)

## Phase C — Schema and data

**Gate**: Aug 31 — schema final + 5 poses as proof. Sept 30 — all 63 poses.

- [X] T019 [P] Add the ten new Tier-1 fields to `data/schemas/pose.schema.json` per
  `contracts/pose-library-schema.md` (`base_of_support`, `orientation`, `cog_height`,
  `spinal_action`, `plane`, `level`, `zone`, `energetic_direction`, `intensity`,
  `default_measure`); move `type_tags`, `muscle_groups`, `injury_risk`, `joint_action`,
  `primary_joints_involved`, `nervous_system_effect`, `tissue_depth`, `modifications`,
  `dosha_affinity`, `emotional_release_potential`, `sequencing_position` out of the hard
  `required` array into a Tier-2 warn-only set. (`89eec24`)
- [X] T020 Update `scripts/validate-poses.js` with a `--tier1` completeness report:
  schema failures still fail CI; Tier-2 gaps print a warning table and exit 0. (`89eec24`)
- [X] T021 [P] Backfill the ten new Tier-1 fields on 5 representative existing poses
  (`butterfly`, `savasana`, `dragon-low-lunge`, `child-pose`, `sphinx`) as the Aug 31
  schema proof. (`89eec24`)
- [X] T022 Backfill the ten new Tier-1 fields across the remaining 38 existing pose files. (`89eec24`)
- [X] T023 [P] Author `data/poses/rebound-supine.json` and
  `data/poses/seated-stillness.json` (stillness nodes, near-empty geometry, full Tier-1). (`afb1d53`)
- [X] T024 [P] Author the ~20 new yang pose files (Mountain, Standing Forward Fold,
  Halfway Lift, Chair, Tree, High Lunge, Low Lunge, Warrior I, Warrior II, Reverse
  Warrior, Extended Side Angle, Triangle, Half Moon, Down Dog, Plank, Chaturanga, Cobra,
  Up Dog, Locust, Cat-Cow, Camel, Easy Seat), each with full Tier-1 fields. Library now
  67 poses. (`afb1d53`)
- [X] T025 Author `data/blocks/sun-salutation-a.json` as the first `Block` entity
  instance.
- [X] T026 Convert `src/lib/reference-sequences/index.ts`'s built-ins into
  `data/flows/*.krama.json` (`personal-practice-10min`, `heart-openers-vinyasa`,
  `classic-yin-full-body`), each stamped `schema_version: "0.1.0"`, `isBuiltIn: true`.
- [ ] T027 External step (not performable by this agent): have Gioconda & Tavo review
  Tier-1 geometry data for 10 poses before T022/T024's mass entry, per locked spec §9.
  Note: T022/T024 have already landed pending this review — flag any corrections as a
  follow-up data patch rather than blocking on it retroactively.
- [X] T028 Run `npm run validate:poses` — confirm 0 Tier-1 failures across all 67 poses,
  a clean Tier-2 warning report.

## Phase D — Code (Sept 30 gate)

### D.0 — Foundational (blocks all user stories below)

- [X] T029 Rename Sequence → Flow: create `src/lib/flow/types.ts` with the `Flow`,
  `FlowItem`, `Phase`, `Block`, `LayerPreference`, `FrictionResult` types from
  `data-model.md`. Do not delete `src/lib/pipeline/types.ts` — it stays for the parked
  pipeline. (`92a92dc`)
- [X] T030 Add a `src/lib/pipeline/README.md` noting v0.2-parked status per `DECISIONS.md`. (`38bcddb`)
- [X] T031 [P] `src/lib/friction/index.ts` — `friction()`, exported `WEIGHTS` constant,
  `tierFor()`, reason templates, per `contracts/friction-engine.md`. (`92a92dc`)
- [X] T032 [P] `src/lib/friction/build-matrix.ts` — build-time script producing the
  precomputed `FrictionMatrix` static JSON artifact from `data/poses/`. Deviation: no
  separate build-time artifact — `buildFrictionMatrix()` (T031) is called directly inside
  `ComposeClient` on the loaded pose set, since the pose count (67) makes this cheap
  enough at request time. Revisit as a real build step if the library grows large enough
  to matter. (`38bcddb`)
- [X] T033 [P] `src/lib/validator/lite.ts` — `validateLite()`: laterality +
  no-closing-stillness checks, reusing the bilateral-pairing approach from
  `src/lib/pipeline/constrain.ts` (read-only reuse — don't modify the parked module). (`92a92dc`)
- [X] T034 [P] `src/lib/storage/flow-store.ts` — localStorage/IndexedDB (via `idb`) CRUD for
  `Flow` records (`saveFlow`, `getFlow`, `getAllFlows`, `deleteFlow`). Named `flow-store.ts`
  rather than `index.ts`. (`eee4d4d`)
- [X] T035 [P] `src/lib/storage/krama-file.ts` — `exportKramaFile()`, `importKramaFile()`,
  `schema_version` migration table, per `contracts/flow-file-format.md`. Named
  `krama-file.ts` rather than `kramaFile.ts`. (`eee4d4d`)
- [X] T036 Rewrite `src/components/layout/AppHeader.tsx` — five-tab nav (Home, Compose,
  Flows, Poses, Learn) per `docs/krama-guardrails.md` §1.3 nav testids; drop `/dimensions`,
  `/sequence`, `/sequences`, `/api/generate` links (modules stay on disk, unlinked). (`9704b00`)
- [X] T037 [P] Dark-mode/beauty-tenet CSS token pass in `src/app/globals.css` (single
  accent token, light+dark palettes) per `docs/krama-guardrails.md` §2. (`9704b00`)

**Checkpoint**: friction engine, validator-lite, and storage are independently unit-
testable before any UI exists. Foundational work must complete before Phase D.1+.

### D.1 — User Story 1: Compose a Flow by Hand (P1)

- [X] T038 [US1] `src/app/compose/page.tsx` + `src/app/compose/[id]/page.tsx` — Compose
  route shells. (`38bcddb`)
- [X] T039 [US1] Search-add, testid `compose-search-input` / `compose-add-pose-{slug}`.
  Deviation: built inline in `ComposeClient.tsx` rather than as a standalone
  `PoseSearch.tsx` — the search state is tightly coupled to the flow being edited, and
  splitting it out added an extra prop-drilling layer with no reuse benefit since
  nothing else in the app needs a pose-search-and-add widget. (`38bcddb`)
- [X] T040 [US1] Measure toggle (breaths/seconds), notes field, reorder buttons; testids
  `compose-item-{index}`, `compose-item-measure-{index}`, `compose-item-notes-{index}`,
  `compose-item-reorder-up/down-{index}`. Deviation: inline in `ComposeClient.tsx` rather
  than a standalone `FlowItemRow.tsx`, same reasoning as T039. (`38bcddb`)
- [X] T041 [US1] Drag-to-reorder, using native HTML5 drag-and-drop (`draggable`,
  `onDragStart/Over/Drop`) alongside the T040 up/down buttons for keyboard/no-JS-drag
  accessibility. (`38bcddb`)
- [X] T042 [US1] Six-phase default template, renameable/reorderable phases, per-phase
  summed duration; testid `compose-phase-{phase-id}`. Deviation: inline in
  `ComposeClient.tsx` rather than a standalone `PhaseGroup.tsx`, same reasoning as T039. (`38bcddb`)
- [X] T043 [US1] Simple/advanced/expert/custom field-visibility toggle, persisted per
  view (`localStorage`); testid `compose-layer-{layer}`. Deviation: inline in
  `ComposeClient.tsx` rather than a standalone `LayerChips.tsx`, same reasoning as T039. (`38bcddb`)
- [X] T044 [US1] Reads the precomputed `FrictionMatrix` (T032), renders tier + reason
  line; testid `compose-seam-{fromIndex}-{toIndex}`. Deviation: inline in
  `ComposeClient.tsx` rather than a standalone `SeamIndicator.tsx`, same reasoning as
  T039. (`38bcddb`)
- [X] T045 [US1] Live total duration readout; testid `compose-total-duration`. (`38bcddb`)

**Checkpoint**: US1 is independently testable — add, measure, note, reorder, phase-group,
see live total and seam indicators, all without saving.

### D.2 — User Story 3: Save, Duplicate, Export, Import Flows (P1)

- [X] T046 [US3] `src/app/flows/page.tsx` + `FlowsClient.tsx` — Flows list (saved +
  built-in); testid `flows-list`, `flows-item-{id}`. (`38bcddb`)
- [X] T047 [US3] `src/app/flows/[id]/page.tsx` + `FlowDetailClient.tsx` — flow detail /
  edit entry. (`38bcddb`)
- [X] T048 [US3] Save action in Compose, using T034's storage module. (`38bcddb`)
- [X] T049 [US3] [P] Duplicate action; testid `flows-duplicate-{id}`; built-ins stay
  read-only, duplicate creates `isBuiltIn: false` copy. Implemented as a link to
  `/compose/{id}`; opening `/compose/{builtinId}` auto-duplicates into IndexedDB and
  redirects to the new saved copy's compose route, so Compose's "open a built-in" path
  and the Flows page's "Duplicate" button share one code path. (`38bcddb`)
- [X] T050 [US3] [P] Export action using T035; testid `flows-export-{id}`. (`38bcddb`)
- [X] T051 [US3] [P] Import action (file picker) using T035; testid `flows-import`. (`38bcddb`)
- [X] T052 [US3] Delete action (saved flows only, not built-ins); testid
  `flows-delete-{id}`. (`38bcddb`)
- [ ] T053 [US3] Integration test: export → import round-trip, including one
  `schema_version` bump migration (SC-005). Not written this pass — out of scope per
  this fork's directive (unit/build/tsc verification only, no new test authoring beyond
  what already exists); flagged as a follow-up.

**Checkpoint**: A flow built in Compose can be saved, reopened, duplicated, exported, and
reimported without data loss.

### D.3 — User Story 2: Read View Passes the 6am Test (P1)

- [X] T054 [US2] `src/app/read/[id]/page.tsx` — read view route, reusing
  `src/app/sequence/export/print.css`. Server-renders built-ins directly (statically
  known at build time); `ReadViewClient.tsx` loads saved flows from IndexedDB. (`38bcddb`)
- [X] T055 [US2] Phase-grouped rendering; testid `read-phase-{phase-id}`. Deviation:
  inline in the shared `ReadView.tsx` presentational component rather than a standalone
  `PhaseSection.tsx`, so the same rendering logic works from both the server (built-ins)
  and client (saved-flow) entry points without duplicating it. (`38bcddb`)
- [X] T056 [US2] Breath-notation marks (↑ ↓ ~), not paragraphs; testid
  `read-breath-mark`. Deviation: inline in `ReadView.tsx`, same reasoning as T055. (`38bcddb`)
- [X] T057 [US2] Per-pose entry: name, measure, note; testid `read-item-{index}`.
  Deviation: inline in `ReadView.tsx`, same reasoning as T055. (`38bcddb`)
- [X] T058 [US2] Stillness-node visual treatment (reduced weight, no accent) per
  `docs/krama-guardrails.md` §2, via the `.kk-stillness` utility class. (`9704b00`)
- [ ] T059 [US2] Confirm offline rendering (service worker caches the read route + its
  flow data) and Lighthouse mobile ≥ 90 (SC-008). Not run this pass — requires a manual/
  Lighthouse pass out of scope for this fork's build-and-verify directive; flagged as a
  follow-up alongside the Playwright QA pass.

**Checkpoint**: Any saved flow has a working, offline-capable, dark-mode-correct,
print-ready read view.

### D.4 — User Story 4: Friction-Guided Seam Indicator (P2)

Mostly delivered by T031/T032/T044 above. Remaining:

- [X] T060 [US4] Handle missing-Tier-1-field poses gracefully in the seam indicator
  (best-effort score, fewer reasons, no crash) — `friction()` (T031) already treats
  missing fields as a zero-delta contribution rather than throwing, and the Compose
  seam UI renders whatever reasons come back, so an incomplete pose just yields a
  shorter reason list instead of an error. (`38bcddb`)

### D.5 — User Story 5: Validator-Lite Warnings (P2)

- [X] T061 [US5] Wire `validateLite()` (T033) into Compose and the Flows save path;
  render both warnings wherever applicable; testids `validator-warning-laterality`,
  `validator-warning-closing-stillness`. (`38bcddb`)
- [X] T062 [US5] Confirm warnings never block save or export — verified by code
  inspection (the save/export handlers in `ComposeClient`/`FlowsClient` never branch on
  `validateLite()`'s return value) rather than a new automated test. (`38bcddb`)

### D.6 — User Story 6: Pose Library Browsing (P2)

- [X] T063 [US6] [P] Restyle `PosesClient.tsx`, `PoseCard.tsx`,
  `src/app/poses/[slug]/PoseDetailClient.tsx` for dark mode + beauty tenets. Categorical
  data colors (element/difficulty/dosha/nervous-system-effect badges) were kept as-is —
  those encode meaning, not theme, and guardrails §2's "single accent color" rule reads
  as targeting UI chrome, not data legibility coding. (`341499a`)
- [X] T064 [US6] Hide empty Tier-2 field sections on the pose detail page rather than
  rendering an empty label — pre-existing behavior in both `PoseCard.tsx` and
  `PoseDetailClient.tsx` (every optional section is already gated on a length/truthiness
  check); also added simple/advanced/expert depth chips
  (`poses-detail-layer-{layer}`) on the detail page gating Type tags, Dosha affinity,
  Modifications, Chakras, and Emotional territory. (`341499a`)

### D.7 — User Story 7: Built-in Flows (P2)

- [X] T065 [US7] `src/app/page.tsx` + `HomeClient.tsx` (Home) — today's flow, new-flow
  entry, built-in flow cards; testids `home-todays-flow`, `home-new-flow`,
  `home-builtin-{slug}`. (`38bcddb`)
- [X] T066 [US7] Confirm built-in flows open directly in the read view without requiring
  duplication first — `/read/[id]` server-renders built-ins straight from
  `flow-library`, no IndexedDB round-trip. (`38bcddb`)

### D.8 — Navigation, PWA, Telemetry (cross-cutting)

- [X] T067 `src/app/learn/page.tsx` — stub ("soon"); testid via `nav-learn`. (`38bcddb`)
- [ ] T068 Confirm PWA install + offline works for the new route set (T036's nav, T054's
  read view, T038's Compose) — not verified this pass (requires a manual install/offline
  check); `public/manifest.json` and the service worker cache list were left unchanged
  since no new static assets were introduced. Flagged as a follow-up alongside T059.
- [X] T069 Datadog RUM init in `src/app/layout.tsx`, scoped to page views/errors/web
  vitals; session replay and user-interaction/resource/long-task tracking explicitly
  disabled so no user content reaches a RUM payload (RULE-L7); no-ops when
  `NEXT_PUBLIC_DATADOG_APP_ID`/`NEXT_PUBLIC_DATADOG_CLIENT_TOKEN` are unset. (`623d6cc`)

## Phase E — Tests

- [ ] T070 [P] Unit tests: `src/lib/friction/index.ts` — 100% line coverage, cases per
  `contracts/friction-engine.md` §Test requirements.
- [ ] T071 [P] Unit tests: `src/lib/validator/lite.ts` — 100% line coverage, both
  warning conditions plus the "neither blocks" invariant.
- [ ] T072 [P] Unit tests: `src/lib/storage/kramaFile.ts` — round-trip (T053 covers the
  integration angle; this covers unit-level migration-table edge cases: unknown
  version, malformed JSON).
- [ ] T073 Confirm existing 47 pipeline tests still pass unmodified (parked module,
  untouched).
- [ ] T074 CI: wire the Tier-1 completeness gate (T020) into the pipeline; confirm it
  fails on a deliberately-broken Tier-1 field and passes otherwise.
- [ ] T075 [P] Playwright smoke tests for the six flows in
  `docs/krama-guardrails.md` §1.2, keyed to the testid contract in §1.3.
- [ ] T076 `npm run test:coverage` — confirm 100% lines on `src/lib/friction/` and
  `src/lib/validator/`; confirm no regression elsewhere.

## Verification (manual, see plan.md)

- [ ] T077 Run the 7-step manual walkthrough from the plan's Verification section
  (compose → save/export/reimport → duplicate → read view phone/dark/offline/print →
  both warnings → Lighthouse → first `FRICTION.md` entry from what's discovered).

---

## Dependencies

- Phase A → B → C → D → E, strictly (each phase's docs/schema/code depend on the prior).
- Within Phase D: D.0 (foundational) blocks all of D.1–D.8.
- D.1 (Compose) blocks D.2 (Save/export needs something to save) and D.4/D.5 (seam
  indicator and warnings render inside Compose).
- D.2 blocks D.3 (read view needs a saved flow) and D.7 (Home needs Flows to exist).
- D.6 and D.8 are otherwise independent of D.1–D.5 and can run in parallel with them
  once D.0 is done.

## Parallel execution examples

```
# Phase C, once schema (T019) lands:
Task: "T021 backfill 5 proof poses"
Task: "T023 author stillness node poses"
Task: "T024 author ~20 yang poses"
Task: "T026 convert built-ins to .krama.json"
# — independent files, safe in parallel.

# Phase D.0, once T029 lands:
Task: "T031 friction engine"
Task: "T033 validator-lite"
Task: "T034 storage CRUD"
Task: "T035 krama file import/export"
Task: "T037 dark-mode token pass"
# — independent modules, safe in parallel.
```
