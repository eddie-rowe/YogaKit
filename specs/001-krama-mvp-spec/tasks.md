# Tasks: Krama MVP

**Input**: `plan.md`, `spec.md`, `data-model.md`, `contracts/`
**Branch**: `001-krama-mvp-spec`
**Date**: 2026-06-22

## Format: `[ID] [P?] [Story?] Description — file path`

- **[P]**: Parallelizable (no dependency on incomplete tasks, different files)
- **[USN]**: Maps to User Story N from spec.md
- All paths relative to repository root

---

## Phase 1: Setup

**Purpose**: Project scaffolding and toolchain. No dependencies — start immediately.

- [ ] T001 Initialize Next.js 15 App Router project with TypeScript — run `npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"` in repo root
- [ ] T002 [P] Add `@ducanh2912/next-pwa` and configure PWA manifest — `public/manifest.json`, `next.config.ts`
- [ ] T003 [P] Configure Vitest with `@vitejs/plugin-react` and coverage via `@vitest/coverage-v8` — `vitest.config.ts`
- [ ] T004 [P] Install and configure Playwright for E2E — `playwright.config.ts`
- [ ] T005 [P] Install core dependencies: `idb`, `@anthropic-ai/sdk`, `radix-ui` primitives, `ajv` — `package.json`
- [ ] T006 [P] Create GitHub Actions CI workflow: lint, type-check, `npm test`, `npm run validate:poses` — `.github/workflows/ci.yml`
- [ ] T007 Create complete directory structure per plan.md: `data/poses/`, `data/meridians/`, `data/quotes/`, `data/schemas/`, `src/lib/pipeline/`, `src/lib/pose-library/`, `src/lib/meridians/`, `src/lib/storage/`, `src/components/dimensions/`, `src/components/sequence/`, `src/components/deliver/`, `src/components/export/`, `tests/unit/pipeline/`, `tests/unit/pose-library/`, `tests/integration/`, `tests/e2e/`
- [ ] T008 [P] Add `.env.local.example` with `ANTHROPIC_API_KEY=` placeholder and update `.gitignore` to exclude `.env.local`
- [ ] T009 [P] Configure Vercel deployment: `vercel.json` with function timeout 30s for `/api/generate`, environment variable documentation in README

**Checkpoint**: `npm run dev` starts without errors; `npm test` runs (zero tests passing is fine); CI pipeline defined.

---

## Phase 2: Foundational

**Purpose**: Core data types, pose library, and pipeline scaffolds. ALL user stories
depend on this phase. No user story work begins until this phase is complete.

**⚠️ CRITICAL**: Do not start any Phase 3+ task until all Phase 2 tasks are done.

### TypeScript Type Definitions

- [ ] T010 Create all shared pipeline TypeScript types from data-model.md — `src/lib/pipeline/types.ts`
  - `Style`, `Season`, `Dosha`, `FiveElement`, `BodyPosition`, `EnergeticQ`, `IntensityCurve`, `ExperienceLevel`, `PoseDifficulty`, `ModeType` enums/literals
  - `HoldRange`, `PoseMode`, `Pose`, `MeridianRecord`, `ElementRecord` interfaces
  - `HardConstraints`, `SessionContext` interfaces
  - `DraftPoseEntry`, `PipelineDraft`, `SequenceItem`, `ConstrainedSequence`, `SafetyNote`, `ValidatedSequence` interfaces
  - `SavedSequence` interface (for P2 storage)

### JSON Schema and CI Validation

- [ ] T011 [P] Create pose JSON Schema — `data/schemas/pose.schema.json` (use contracts/pose-library-schema.md)
- [ ] T012 [P] Create `npm run validate:poses` script using `ajv-cli` that validates all `data/poses/*.json` against the schema — `package.json` scripts section
- [ ] T013 [P] Create contraindications vocabulary JSON — `data/schemas/contraindications.json` (list from data-model.md)

### Pose Library Seed Data (40+ yin poses)

- [ ] T014 [P] Create pose data files for supine yin poses (8 poses): `data/poses/constructive-rest.json`, `data/poses/happy-baby.json`, `data/poses/supta-baddha-konasana.json`, `data/poses/windshield-wipers.json`, `data/poses/reclining-twist.json`, `data/poses/savasana.json`, `data/poses/legs-up-the-wall.json`, `data/poses/bridge-yin.json`
- [ ] T015 [P] Create pose data files for prone yin poses (5 poses): `data/poses/sphinx.json`, `data/poses/seal.json`, `data/poses/crocodile.json`, `data/poses/frog.json`, `data/poses/half-frog.json`
- [ ] T016 [P] Create pose data files for seated yin poses (10 poses): `data/poses/butterfly.json`, `data/poses/half-butterfly.json`, `data/poses/caterpillar.json`, `data/poses/shoelace.json`, `data/poses/square.json`, `data/poses/dragon-sitting.json`, `data/poses/deer.json`, `data/poses/saddle.json`, `data/poses/half-saddle.json`, `data/poses/melting-heart.json`
- [ ] T017 [P] Create pose data files for kneeling/standing yin poses (10 poses): `data/poses/sleeping-swan.json`, `data/poses/dragon-low-lunge.json`, `data/poses/dragon-high-lunge.json`, `data/poses/twisted-dragon.json`, `data/poses/child-pose.json`, `data/poses/toe-squat.json`, `data/poses/ankle-stretch.json`, `data/poses/wide-knee-child.json`, `data/poses/dangling.json`, `data/poses/bananasana.json`
- [ ] T018 [P] Create pose data files for remaining yin poses covering all meridian pairs (10 poses): `data/poses/square-fold.json`, `data/poses/eye-of-needle.json`, `data/poses/shoelace-fold.json`, `data/poses/straddle.json`, `data/poses/snail.json`, `data/poses/supported-fish.json`, `data/poses/anahatasana.json`, `data/poses/thread-needle.json`, `data/poses/twisted-roots.json`, `data/poses/half-dragonfly.json`
- [ ] T019 Run `npm run validate:poses` and fix any schema violations in T014–T018 before proceeding

### Meridian and Quote Seed Data

- [ ] T020 [P] Create Five-Element/meridian data files: `data/meridians/wood.json`, `data/meridians/fire.json`, `data/meridians/earth.json`, `data/meridians/metal.json`, `data/meridians/water.json` (structure from data-model.md)
- [ ] T021 [P] Create initial quotes collection (20+ quotes with full attribution, tagged by theme) — `data/quotes/quotes.json`

### Pose Library Data Access Layer

- [ ] T022 Create pose library loader — `src/lib/pose-library/index.ts`
  - `loadAllPoses(): Pose[]` — imports all JSON files from `data/poses/` at build time
  - `getPoseBySlug(slug: string): Pose | undefined`
  - `filterPoses(constraints: FilterConstraints): Pose[]` — filters by meridian, body position, difficulty, mode, contraindications

- [ ] T023 [P] Create meridian data access layer — `src/lib/meridians/index.ts`
  - `getElementBySlug(element: FiveElement): ElementRecord`
  - `getMeridiansByElement(element: FiveElement): MeridianRecord[]`

### Pipeline Stage Scaffolds

- [ ] T024 Create AI proposal stage — `src/lib/pipeline/propose.ts`
  - `propose(context: SessionContext, poseLibrary: Pose[], meridianData: ElementRecord[]): Promise<PipelineDraft>`
  - Builds prompt from context (categorical constraints only — no PII)
  - Calls Anthropic API with structured output instruction
  - 25-second timeout; on failure sets `generationSkipped: true` and returns a minimal seed draft
  - Returns `PipelineDraft`

- [ ] T025 Create rules engine — `src/lib/pipeline/constrain.ts`
  - `constrain(draft: PipelineDraft, context: SessionContext, library: Pose[]): ConstrainedSequence`
  - Resolves AI pose slugs against library (drops unknown slugs, substitutes from library)
  - Enforces bilateral symmetry (adds missing side)
  - Enforces rebound pose after deep yin holds
  - Validates hold times against pose `hold_range`
  - Trims or extends sequence to fit `durationMinutes` ± 10%
  - Ranks and assigns alternates per SequenceItem
  - Enforces transition body-position continuity
  - Returns `ConstrainedSequence`

- [ ] T026 Create safety layer — `src/lib/pipeline/validate.ts`
  - `validate(sequence: ConstrainedSequence, context: SessionContext, library: Pose[]): ValidatedSequence`
  - For each SequenceItem: checks `pose.contraindications` vs `context.hardConstraints.contraindications`
  - For each SequenceItem: checks `pose.props_required` vs `context.hardConstraints.propsAvailable`
  - Checks intensity ceiling (no `difficulty: 'advanced'` poses for beginner sessions)
  - Checks bilateral completeness
  - Attempts auto-replacement on violation (FR-015a); inserts rest/rebound gap if no replacement
  - Returns `ValidatedSequence` with `safetyNotes` and `passedValidation: true`
  - Never returns a sequence where `passedValidation` is false

### Safety Layer Unit Tests (Mandatory before any story ships)

- [ ] T027 Write adversarial unit tests for safety layer — `tests/unit/pipeline/validate.test.ts`
  - Test: AI proposes inversion for high-blood-pressure student → pose replaced
  - Test: AI proposes prop-dependent pose when "no props" → replaced with prop-free variation or gap
  - Test: AI proposes only right side of bilateral pose → left side added
  - Test: AI outputs malformed JSON → pipeline does not crash; falls back gracefully
  - Test: AI produces sequence totaling 2× requested duration → trimmed to within tolerance
  - Test: AI proposes advanced pose for beginner session → replaced
  - Test: No valid replacement exists → gap inserted with safetyNote
  - Achieve 100% line coverage on `validate.ts`

- [ ] T028 Write unit tests for rules engine — `tests/unit/pipeline/constrain.test.ts`
  - Test: Unknown pose slug in draft → dropped from sequence
  - Test: Bilateral pose appears once → both sides added
  - Test: Hold time outside pose `hold_range` → clamped to range
  - Test: Duration overflow → sequence trimmed
  - Test: Duration underflow → sequence padded with rebound/rest poses
  - Test: Body position changes two families without bridge → bridge pose inserted
  - Achieve 100% line coverage on `constrain.ts`

- [ ] T029 [P] Write unit tests for pose library loader — `tests/unit/pose-library/loader.test.ts`
  - Test: All pose files pass `filterPoses` without error
  - Test: `getPoseBySlug` returns correct pose or undefined
  - Test: `filterPoses` correctly excludes contraindicated poses

### Generate API Route Handler

- [ ] T030 Create serverless generate Route Handler — `src/app/api/generate/route.ts`
  - Validates request body shape
  - Loads pose library and meridian data (static import)
  - Calls `propose()` → `constrain()` → `validate()` in order (RULE-H2)
  - Streams SSE: `progress` events during each stage, `sequence` event on completion
  - Emits `error` events for `SAFETY_UNRESOLVABLE`, `DURATION_CONFLICT`, `NO_POSES_MATCH`
  - Never exposes `ANTHROPIC_API_KEY` to client

**Checkpoint**: `npm test` passes all unit tests; rules engine and safety layer have 100%
coverage; `POST /api/generate` with a minimal SessionContext returns a valid
ValidatedSequence; adversarial inputs are all caught by tests.

---

## Phase 3: User Story 1 — Compose a Yin Class (P1) 🎯 MVP

**Goal**: Teacher sets dimensions, receives a complete sequence, swaps one pose,
exports a cue sheet. End-to-end P1 value delivered.

**Independent Test**: A teacher with a blank session can set style=yin, duration=60,
theme="letting go", generate, swap one pose, and export a printable cue sheet — all
without login, in a fresh browser tab.

### Dimension Input UI

- [ ] T031 [US1] Create dimension input page layout — `src/app/page.tsx`
  - Full-page form with sections: Style, Duration, Theme/Goal, Target/Meridian, Level, Props
  - "Generate Sequence" button triggers POST to `/api/generate`
  - All fields optional with visible defaults

- [ ] T032 [P] [US1] Create StyleSelector component — `src/components/dimensions/StyleSelector.tsx`
  - Segmented control: Yin / Vinyasa / Ashtanga / Restorative

- [ ] T033 [P] [US1] Create DurationPicker component — `src/components/dimensions/DurationPicker.tsx`
  - Slider or stepper, 15–120 minutes in 15-minute increments; default 60

- [ ] T034 [P] [US1] Create ThemeGoalInput component — `src/components/dimensions/ThemeGoalInput.tsx`
  - Free-text fields for theme (e.g., "letting go") and goal (e.g., "downregulate nervous system")

- [ ] T035 [P] [US1] Create MeridianElementPicker component — `src/components/dimensions/MeridianElementPicker.tsx`
  - Five-Element wheel or grid; selecting element auto-suggests meridian pair
  - Meridian pair display (e.g., "Liver / Gallbladder")

- [ ] T036 [P] [US1] Create ExperienceLevelSelector component — `src/components/dimensions/ExperienceLevelSelector.tsx`
  - Options: Beginner / Intermediate / Advanced / Mixed

- [ ] T037 [P] [US1] Create PropsPicker component — `src/components/dimensions/PropsPicker.tsx`
  - Multi-select checkboxes: Bolster, Block, Blanket, Strap, Wall, Chair, None

- [ ] T038 [P] [US1] Create HardConstraintsInput component — `src/components/dimensions/HardConstraintsInput.tsx`
  - Clearly labeled "Safety Constraints" section (visually distinct from preferences)
  - Multi-select from contraindication vocabulary
  - Short explainer: "These are hard rules — no pose that conflicts will appear"

### Sequence Generation State and Loading

- [ ] T039 [US1] Create useGenerate React hook for streaming generation — `src/lib/hooks/useGenerate.ts`
  - POST to `/api/generate` with `SessionContext`
  - Parses SSE stream: progress events update UI state; sequence event delivers `ValidatedSequence`
  - Sets `generationProvenance` flag; shows "Generated without AI enhancement" indicator when `rules-only`
  - Handles error events: displays plain-language message per error code

- [ ] T040 [US1] Create generation loading / progress UI — `src/components/sequence/GenerationProgress.tsx`
  - Shows current pipeline stage ("Proposing sequence…", "Applying rules…", "Validating safety…")
  - Non-blocking; teacher can cancel

### Sequence Review UI

- [ ] T041 [US1] Create SequenceView page — `src/app/sequence/page.tsx`
  - Lists all SequenceItems in order
  - Shows theme statement and philosophical framing at top
  - Shows quote with attribution
  - Shows total duration; flags overrun

- [ ] T042 [P] [US1] Create PoseCard component — `src/components/sequence/PoseCard.tsx`
  - Displays: English name, Sanskrit name, hold time, "why" text, transition note
  - "Why?" expandable section (always present, RULE-T1)
  - "Swap" button opens AlternatesModal
  - Editable hold time (inline number input, RULE-T4)

- [ ] T043 [P] [US1] Create AlternatesModal component — `src/components/sequence/AlternatesModal.tsx`
  - Lists alternates ranked by dimensional alignment
  - Each alternate shows: name, why it qualifies, hold time
  - One-tap swap (RULE-T2)

- [ ] T044 [P] [US1] Create TransitionNote component — `src/components/sequence/TransitionNote.tsx`
  - Shown between PoseCards
  - Displays transition "why" text (RULE-T3)
  - Editable (RULE-T4)

### Cue Sheet Export

- [ ] T045 [US1] Create CueSheetView page — `src/app/sequence/cue-sheet/page.tsx`
  - Printable layout: pose table (name, hold, cue, transition), theme statement, quote
  - "Print" button triggers `window.print()`

- [ ] T046 [US1] Create print stylesheet — `src/components/export/print.css`
  - Hides navigation and non-print elements
  - Two-column layout option; 11pt minimum font; page breaks between sections
  - No color backgrounds (printer-friendly)

**Checkpoint**: End-to-end path works: dimension input → generate → sequence review
(swap a pose, edit a hold time) → cue sheet (printable). Safety indicator shown when
AI unavailable.

---

## Phase 4: User Story 2 — Safety Constraints Enforce Themselves (P1)

**Goal**: Teacher-stated contraindications are completely enforced. Zero safety
violations reach the UI.

**Independent Test**: Teacher enters "high blood pressure" as a constraint. Generated
sequence contains zero inverted poses (Legs Up Wall, Shoulder Stand, Headstand, etc.).
All alternates also respect the constraint.

- [ ] T047 [US2] Write integration test for full pipeline with contraindications — `tests/integration/pipeline-safety.test.ts`
  - Test: high-blood-pressure → no inversions in sequence or alternates
  - Test: no-props-available → all poses are prop-free
  - Test: pregnancy-second-trimester → no prone, no deep twists, no supine vena-cava poses
  - Test: hip-replacement + no-hip-external-rotation → Dragon, Sleeping Swan excluded
  - Test: constraint-vs-theme conflict (no-hip-external-rotation + theme="hip opening") → conflict notice emitted, not a crash

- [ ] T048 [US2] Add conflict detection to generate Route Handler — `src/app/api/generate/route.ts`
  - Detect when hard constraints make the chosen theme impossible
  - Emit structured conflict description (plain language) in the SSE stream
  - Propose a safe thematic reinterpretation based on meridian/element data

- [ ] T049 [US2] Create ConflictNotice component — `src/components/sequence/ConflictNotice.tsx`
  - Shown when constraint-vs-theme conflict detected
  - Plain language: "Your 'hip opening' theme conflicts with the hip-replacement constraint"
  - Offers a thematic reinterpretation (e.g., "We suggest reframing around 'grounding' instead")
  - Teacher must accept or choose a different theme before generation continues (FR-016)

- [ ] T050 [US2] Create DurationConflictNotice component — `src/components/sequence/DurationConflictNotice.tsx`
  - Shown when requested duration is too short for requested depth (FR-017)
  - Offers three options: Accept compressed version / Extend duration / Reduce pose count
  - Teacher selection feeds back into a regeneration call

**Checkpoint**: All integration tests pass. Constraint enforcement is visible in the
UI for the three main conflict types. ConflictNotice and DurationConflictNotice render
and allow teacher resolution.

---

## Phase 5: User Story 3 — Every Suggestion is Explainable and Editable (P1)

**Goal**: Every pose and transition has a "why" referencing teacher dimensions. All
generated text is editable without re-triggering generation.

**Independent Test**: For each pose in a 10-pose test sequence, the "why" text
contains at least one word from the session dimensions (meridian name, theme word,
energetic quality, or style). All cues, hold times, and philosophical notes are editable.

- [ ] T051 [P] [US3] Enhance AI prompt to require dimensional references in every "why" — `src/lib/pipeline/propose.ts`
  - Prompt must instruct Claude to reference at least one active dimension in each pose rationale
  - Add a prompt-level validation that rejects "why" fields that are purely anatomical

- [ ] T052 [P] [US3] Add rules engine fallback "why" generation — `src/lib/pipeline/constrain.ts`
  - When a pose "why" is missing or generic, generate a dimensional reference from session context
  - Template: "[Pose] targets the [meridian] meridian, supporting your [theme/goal] focus"
  - Applied to AI-sourced AND rules-engine-seeded poses

- [ ] T053 [US3] Create EditableField component — `src/components/sequence/EditableField.tsx`
  - Inline editable text with click-to-edit pattern
  - Used for: hold time, cue text, "why" text, transition note, philosophical framing
  - Changes are local state — no regen triggered (FR-019)
  - Persists edits across the session

- [ ] T054 [P] [US3] Wire EditableField into PoseCard for all editable fields — `src/components/sequence/PoseCard.tsx`
  - Hold time → EditableField (numeric)
  - "Why" text → EditableField (textarea)
  - Cue note → EditableField (textarea)

- [ ] T055 [P] [US3] Wire EditableField into SequenceView for theme/framing — `src/app/sequence/page.tsx`
  - Theme statement → EditableField
  - Philosophical framing → EditableField
  - Quote text and attribution → EditableField

**Checkpoint**: Every pose "why" and transition "why" references at least one dimension.
Editing any field works without re-triggering generation. Changes appear in the cue
sheet export.

---

## Phase 6: User Story 4 — Dimension Dials Drive the Sequence Shape (P1)

**Goal**: Full dimension surface works including correlated dimensions (season ↔
element ↔ meridian). All defaults produce a valid sequence.

**Independent Test**: (a) Teacher sets only duration=45min, generates — valid sequence,
no prompt required. (b) Teacher sets season=Winter, and the element picker pre-selects
Water; meridian suggests Kidney/Bladder; generated sequence emphasizes these.

- [ ] T056 [US4] Add season ↔ element auto-suggestion to MeridianElementPicker — `src/components/dimensions/MeridianElementPicker.tsx`
  - Setting season auto-highlights the corresponding element
  - Selecting an element auto-suggests its meridian pair
  - Teacher can override any suggestion

- [ ] T057 [P] [US4] Create IntensityCurvePicker component — `src/components/dimensions/IntensityCurvePicker.tsx`
  - Visual selector: Bell / Plateau / Gradual Ramp / Front-loaded / Back-loaded
  - Small sparkline preview of each curve shape

- [ ] T058 [P] [US4] Create Dosha/FiveElementPicker component — `src/components/dimensions/DoshaPicker.tsx`
  - Optional section: Ayurvedic dosha emphasis (Vata / Pitta / Kapha / mixed)
  - Linked to element picker: selecting Water element highlights Vata-balancing

- [ ] T059 [US4] Add default resolution logic to SessionContext builder — `src/lib/session/defaults.ts`
  - `resolveDefaults(partial: Partial<SessionContext>): SessionContext`
  - Fills: `durationMinutes = 60`, `style = 'yin'`, `experienceLevel = 'mixed'`,
    `hardConstraints = { contraindications: [], propsAvailable: [] }` (all props available)
  - Infers element from season when set; infers meridians from element when set

- [ ] T060 [P] [US4] Add dimension coherence validation to rules engine — `src/lib/pipeline/constrain.ts`
  - When season + element + meridian are all set, verify they are consistent (Spring+Wood+Liver OK; Spring+Water+Kidney is a conflict)
  - If incoherent: prefer the most specific (meridian overrides element overrides season)

**Checkpoint**: All dimension combinations generate without error. Season ↔ element
correlation works. Default-only session produces a valid sequence.

---

## Phase 7: User Story 5 — Save and Revisit Sequences (P2)

**Goal**: Teacher saves a sequence to a local library, rates it after teaching, reopens it.

**Independent Test**: Save a sequence, reload the page, open the library, verify the
sequence is intact with all edits.

- [ ] T061 [US5] Create IndexedDB storage layer — `src/lib/storage/sequences.ts`
  - `saveSequence(seq: ValidatedSequence, title: string): Promise<string>` → returns UUID
  - `getAllSavedSequences(): Promise<SavedSequence[]>`
  - `getSavedSequence(id: string): Promise<SavedSequence | undefined>`
  - `rateSequence(id: string, rating: 1|2|3|4|5, notes: string): Promise<void>`
  - `deleteSequence(id: string): Promise<void>`
  - Uses `idb` library; schema version 1

- [ ] T062 [US5] Create Save button and title input in SequenceView — `src/app/sequence/page.tsx`
  - "Save to Library" button; prompts for title (auto-generated from theme if empty)
  - Shows save confirmation; no account required

- [ ] T063 [P] [US5] Create Library page — `src/app/library/page.tsx`
  - Grid of SavedSequence cards: title, date, duration, style, rating (if rated)
  - Tap to open → loads ValidatedSequence into SequenceView (read-only with edit toggle)

- [ ] T064 [P] [US5] Create SavedSequenceCard component — `src/components/library/SavedSequenceCard.tsx`
  - Shows title, date, duration, style badge, star rating
  - Quick-action: Rate / Delete

- [ ] T065 [P] [US5] Create RatingModal component — `src/components/library/RatingModal.tsx`
  - 1–5 star selector + freeform text field for post-teaching notes
  - Saves via `rateSequence()`

**Checkpoint**: Save → close → reopen → library shows saved sequence → rating persists.

---

## Phase 8: User Story 6 — In-Class Timer and Teleprompter View (P2)

**Goal**: Full-screen distraction-free view with countdown timer, auto-advance, pause.

**Independent Test**: Load a 5-pose sequence in timer view; timer counts down each
pose hold; single-tap advances; screen stays on.

- [ ] T066 [US6] Create Deliver page with timer state machine — `src/app/deliver/page.tsx`
  - States: idle → playing → paused → complete
  - Tracks current pose index and remaining hold time
  - Auto-advance when timer reaches zero (configurable via toggle)
  - Uses `NoSleep.js` or `WakeLock API` to keep screen on during holds

- [ ] T067 [P] [US6] Create TimerDisplay component — `src/components/deliver/TimerDisplay.tsx`
  - Large countdown: MM:SS format
  - Circular progress ring around timer
  - Current pose name (large, readable at arm's length — minimum 32px)
  - Current pose cue (readable — minimum 20px)

- [ ] T068 [P] [US6] Create DeliverControls component — `src/components/deliver/DeliverControls.tsx`
  - Play/Pause (single tap anywhere on screen, or explicit button)
  - Previous / Next pose buttons
  - Toggle: Auto-advance on/off

- [ ] T069 [P] [US6] Create PoseProgressBar component — `src/components/deliver/PoseProgressBar.tsx`
  - Horizontal bar showing position in sequence (current pose / total)
  - Dots or segments per pose; highlights current

- [ ] T070 [US6] Add bilateral side indicator to deliver view — `src/components/deliver/TimerDisplay.tsx`
  - For bilateral poses: shows "Left Side" / "Right Side" and advances automatically
    to the other side after the hold

**Checkpoint**: Full-screen timer view works for a 5-pose sequence. Auto-advance,
pause, and manual advance work. Screen does not dim during holds on supported browsers.

---

## Phase 9: Polish and Cross-Cutting Concerns

**Purpose**: Accessibility, offline, performance, and final validation across all stories.

- [ ] T071 Audit all interactive components for keyboard navigation and ARIA labels — all `src/components/` files
- [ ] T072 [P] Implement service worker pre-caching for pose library JSON and app shell — `public/sw.js` (generated by next-pwa config)
- [ ] T073 [P] Run Lighthouse audit on the deliver view and sequence view; fix any issues to reach ≥ 90 mobile score
- [ ] T074 [P] Add `<meta name="viewport">` and mobile-specific touch targets (minimum 44px) — global layout
- [ ] T075 Write Playwright E2E test for the critical path — `tests/e2e/critical-path.spec.ts`
  - Set dimensions → generate → swap one pose → edit one hold time → export cue sheet
  - Full happy path without login
- [ ] T076 [P] Add CI coverage gate: fail if `src/lib/pipeline/constrain.ts` or `src/lib/pipeline/validate.ts` coverage drops below 100% — `vitest.config.ts` thresholds
- [ ] T077 [P] Write CONTRIBUTING.md documenting pose library schema, slug conventions, attribution requirements, and CI validation
- [ ] T078 [P] Final `npm run validate:poses` pass — confirm all seed poses pass schema; fix any issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — BLOCKS all user stories
- **Phases 3–6 (P1 Stories)**: All depend on Phase 2 completion
  - Can proceed in parallel if staffed (T031–T060 are largely independent)
  - US2 depends on US1 pipeline being functional (T030 must be done first)
  - US3 enhancements build on US1 components (PoseCard, SequenceView)
  - US4 builds on US1 dimension input components
- **Phases 7–8 (P2 Stories)**: Depend on all P1 stories passing their checkpoints
- **Phase 9 (Polish)**: Depends on all story phases complete

### Within Phase 2

Pipeline order is immutable: T024 (propose) → T025 (constrain) → T026 (validate).
Tests (T027, T028, T029) can be written before or alongside implementation.
Pose data (T014–T018) and type definitions (T010) can be done in parallel.

### MVP Scope (Ship P1)

To ship the minimum viable product:
1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundation)
3. Complete Phase 3 (US1 — full generation → export path)
4. Complete Phase 4 (US2 — safety enforcement visible in UI)
5. **Stop and validate**: critical-path E2E passes; Lighthouse ≥ 90; all pipeline tests green
6. Ship

P2 stories (US5, US6) and Polish can follow.

---

## Parallel Execution Examples

### Phase 2 parallelizable block

```
T010 (types) ──────────────────────────────────────────────┐
T011 (pose schema) ──────────────────────────────────┐      │
T014–T018 (pose seed data) ──────────────────────────┤      │
T020 (meridian data) ────────────────────────────────┤      │
T021 (quotes) ───────────────────────────────────────┘      │
                                                            ▼
T022 (pose loader) ─── needs T010 + T014–T018               │
T023 (meridian loader) ─ needs T010 + T020                  │
T024 (propose) ──────── needs T010                 ◀────────┘
T025 (constrain) ─────── needs T024
T026 (validate) ─────────── needs T025
T027/T028 (tests) ──── alongside T026
```

### Phase 3 parallelizable block

```
T032 (StyleSelector) ────────────────────────────────────────┐
T033 (DurationPicker) ───────────────────────────────────────┤
T034 (ThemeGoalInput) ───────────────────────────────────────┤
T035 (MeridianElementPicker) ────────────────────────────────┤
T036 (ExperienceLevelSelector) ──────────────────────────────┤
T037 (PropsPicker) ──────────────────────────────────────────┤ All parallel
T038 (HardConstraintsInput) ─────────────────────────────────┤
T042 (PoseCard) ─────────────────────────────────────────────┤
T043 (AlternatesModal) ──────────────────────────────────────┤
T044 (TransitionNote) ───────────────────────────────────────┘
                                                            ▼
T031 (page.tsx) ──── needs all dimension components
T039 (useGenerate) ─ needs T030 (API route) to be running
T041 (SequenceView) ─ needs T039 + PoseCard + TransitionNote
```
