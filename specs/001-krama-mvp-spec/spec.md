# Feature Specification: Krama — Yoga Sequencing App (v0.1)

**Feature Branch**: `001-krama-mvp-spec`
**Created**: 2026-06-22
**Amended**: 2026-08-17
**Status**: Draft (derived from the locked spec)
**Input**: `docs/krama-v0.1-spec.md` — the locked, human-facing v0.1 spec. This document
is its machine-facing derivation and MUST NOT contradict it. Where they appear to
disagree, the locked spec wins; file an amendment here instead of drifting.

---

## Amendment note (2026-08-17)

This spec previously described an AI-first three-stage pipeline (`propose → constrain →
validate`), a 19-dimension input form, and P2 stories for a save/rate library and an
in-class timer. `docs/krama-v0.1-spec.md` locks a different, deterministic v0.1: manual
Compose, a build-time friction engine, local Flows with `.krama.json` export, and a read
view built to pass "the 6am test." This amendment rewrites the user stories and
requirements to match. See `DECISIONS.md` for why the prior spec was superseded rather
than forked, and why the AI pipeline was parked rather than deleted.

**Terminology**: The entity previously called "Sequence" is now called **Flow**,
end-to-end — in data models, storage, routes, and the `.krama.json` export format. "Class"
remains acceptable in conversational UI copy. This supersedes the 2026-06-22 clarification
that named "Sequence" as canonical.

Everything from the prior spec that referenced the AI pipeline, per-pose alternates, or
the timer view is preserved below in **Deferred to v0.2** rather than deleted — it's the
starting point for the spec's own crawl → walk → run staging (locked spec §6).

---

## Clarifications

### Session 2026-06-22 (retained, still binding)

- Q: How are poses uniquely identified in the library (for contributor deduplication)? → A: Each pose has a canonical **slug** (e.g., `sleeping-swan`, `dragon-low-lunge`) as its machine identifier. Sanskrit and English names are display fields only. A community-contributed pose whose slug matches an existing record is rejected by CI; the contributor must update the existing record instead of adding a duplicate.

- Q: What personal or health information is transmitted to any AI service? → A: **None in v0.1.** v0.1 has no AI call anywhere in the critical path and no roster/constraint input at all. If a v0.2 AI proposal stage returns, the categorical-descriptor rule from the prior spec still binds (see Deferred to v0.2 below) — but it does not apply to anything shipping now.

- Q: What format is the read/print artifact? → A: **Web-rendered printable via print CSS.** No server-side PDF generation. The read view is a styled HTML view with a print stylesheet producing clean A4/Letter output, and it is also the primary on-screen 6am artifact — not solely a print concern.

### Session 2026-08-17 (new, from the locked spec)

- Q: What is "the 6am test" and why does it govern the read view? → A: Eddie builds a flow the night before, opens the read view on his phone at 6am, and practices through it without touching the screen more than once (locked spec §1). It is the north star for the read view's design and the standard SC-001 below is measured against.
- Q: Why is the engine deterministic instead of AI-assisted in v0.1? → A: The locked spec's hard line (§6): the engine proposes structure with derived reasoning; it never authors cues, movement names, or teacher voice. AI-assisted suggestion (the "Suggest" button) is explicitly v0.2, gated on teacher feedback from the Oct 31 milestone.
- Q: What happens to contraindications and safety enforcement in v0.1? → A: v0.1 ships no roster or constraint input, so there is nothing for a safety layer to enforce yet. "Validator lite" checks two craft concerns — laterality (a bilateral pose sequenced on only one side) and no-closing-stillness (a flow that doesn't end on a stillness node) — and these are warnings that never block a save or export.

---

## User Scenarios & Testing

### User Story 1 — Compose a Flow by Hand (Priority: P1)

A yoga teacher opens Krama the night before class. They search the pose library, add
poses to a new flow, set a hold measure on each (breaths or seconds), add a personal
note to a couple of poses, reorder by drag or button, and group the flow into phases
using the six-phase default template (Connect → Warm-up → Build → Peak → Land →
Transition). They watch the live total duration update and see a seam indicator between
adjacent poses. When satisfied, they save the flow.

**Why this priority**: This is the entire reason Krama v0.1 exists. Every other story
either prepares for this one or extends it. Without manual composition working
end-to-end, there is no app.

**Independent Test**: A teacher with no prior data can open Compose, add at least 5
poses, set a mixed breaths/seconds measure, add a note, reorder at least once by drag and
once by button, group into at least 2 phases, and see the live duration total — all in a
single session with no login.

**Acceptance Scenarios**:

1. **Given** an empty new flow, **When** the teacher searches for a pose and adds it,
   **Then** the pose appears as a flow item with a default measure (breaths or seconds,
   per the pose's default) that the teacher can override.
2. **Given** a flow with at least 2 items, **When** the teacher drags an item to a new
   position (or uses the reorder buttons), **Then** the item moves and the seam
   indicators between the newly adjacent items recompute.
3. **Given** a flow item, **When** the teacher writes a note, **Then** the note persists
   with that item and appears in the read view and export.
4. **Given** a flow being composed, **When** the teacher assigns items to phases (using
   the six-phase default template or a renamed/reordered variant), **Then** each phase
   shows its name, intent tag, and summed duration, and the flow's live total reflects
   all phases.
5. **Given** a flow with at least 2 adjacent items, **When** either item's Tier-1
   geometry fields are populated, **Then** a seam indicator renders between them with a
   friction tier and a template reasoning line (e.g., "hands and feet stay planted").

---

### User Story 2 — Read View Passes the 6am Test (Priority: P1)

A teacher who built a flow the night before opens the read view on their phone the next
morning and practices through it without touching the screen more than once. The view is
clean, large-type, phase-grouped, breath-notated (marks, not paragraphs), works offline,
and is legible in the dark (dark mode from day one) and on paper (print stylesheet).

**Why this priority**: The read view is the artifact the entire compose flow exists to
produce. A flow a teacher can't actually read and follow at 6am has no value regardless
of how well Compose works.

**Independent Test**: Open a saved flow's read view on a phone-width viewport, in dark
mode, with the network disabled. Every phase is visible, breath marks render as marks
(↑ ↓ ~) not paragraphs, and the print preview produces a clean A4/Letter page.

**Acceptance Scenarios**:

1. **Given** a saved flow, **When** the teacher opens its read view, **Then** it renders
   phase-grouped, large-type, with each item showing its pose name, measure, and any
   note, and breath cues as marks.
2. **Given** the read view is open and the device goes offline, **When** the teacher
   reloads, **Then** the view still renders fully from cached data (PWA offline
   requirement).
3. **Given** the read view is open in dark mode, **Then** all text meets the beauty
   tenets (locked spec §10): stillness nodes render visually quieter, not louder; no
   more than one accent color; large enough type to read at arm's length.
4. **Given** the read view, **When** printed, **Then** the print stylesheet produces a
   clean A4/Letter page without navigation chrome or dark-mode colors.

---

### User Story 3 — Save, Duplicate, Export, and Import Flows (Priority: P1)

After composing a flow, the teacher saves it to a personal, local library. They can
duplicate any flow (including a built-in) to create an editable copy, and export any
flow as a single `.krama.json` file — the portability story for backing up or sharing a
flow outside the app.

**Why this priority**: Without persistence, Compose produces nothing durable — the
teacher would have to rebuild a flow every session. This is P1, not P2, because the
locked spec has no AI-assisted regeneration to fall back on; a flow that isn't saved is
lost.

**Independent Test**: Build and save a flow. Close and reopen the app — the flow is
listed in Flows, intact. Export it to `.krama.json`, then import that file in a fresh
browser profile — the reimported flow is identical in content to the original.

**Acceptance Scenarios**:

1. **Given** a composed flow, **When** the teacher saves it, **Then** it appears in
   Flows with its title, phases, items, and duration intact, with no login required.
2. **Given** a saved flow, **When** the teacher reopens the app the next day, **Then**
   all items, measures, notes, and phase grouping are intact.
3. **Given** a built-in flow (one of the three shipped read-only templates), **When**
   the teacher taps "duplicate to edit," **Then** an editable copy is created and the
   original built-in remains unchanged and read-only.
4. **Given** a saved flow, **When** the teacher exports it, **Then** a single
   schema-versioned `.krama.json` file is produced containing the full flow.
5. **Given** a `.krama.json` file, **When** the teacher imports it, **Then** the flow
   appears in Flows with content identical to what was exported, including on an older
   `schema_version` (forward-compatible import).
6. **Given** a saved flow, **When** the teacher deletes it, **Then** it is removed from
   Flows; built-in flows cannot be deleted, only duplicated.

---

### User Story 4 — Friction-Guided Seam Indicator (Priority: P2)

While composing, the teacher sees a deterministic friction score between every pair of
adjacent poses, rendered as a three-tier seam indicator with a plain-language template
reasoning line, derived purely from each pose's Tier-1 geometry — no AI, no per-pose
alternates yet (that's v0.2's Suggest button).

**Why this priority**: P2 relative to Compose and the read view — a teacher can compose
and read a flow without friction guidance — but it is the spec's signature differentiator
and gates the v0.2 Suggest button's design.

**Independent Test**: Insert two poses with different `base_of_support`, `orientation`,
and `spinal_action` adjacent to each other in a flow; the seam indicator shows a
non-trivial tier and a reasoning line that names the actual deltas (e.g., "flips from
prone to supine").

**Acceptance Scenarios**:

1. **Given** two adjacent poses, **When** their Tier-1 geometry is populated, **Then**
   `friction(fromPose, toPose)` returns a score, a tier, and at least one reason string
   derived from a measured delta (contact, orientation, cog, spine, or plane).
2. **Given** the friction weights constant (contact 0.35, orientation 0.25, cog 0.2,
   spine 0.1, plane 0.1 — locked spec §6), **When** any weight is tuned, **Then** no
   engine code changes — the constant is the only edit required.
3. **Given** a full pose library, **When** the app builds, **Then** the full pairwise
   friction matrix is precomputed and available to Compose without a runtime
   calculation on every render.

---

### User Story 5 — Validator-Lite Warnings (Priority: P2)

While composing or saving, the teacher sees two craft warnings when applicable: a
laterality warning (a bilateral pose sequenced on only one side) and a no-closing-
stillness warning (a flow that doesn't end on a stillness node). Neither warning blocks
saving or exporting.

**Why this priority**: P2 — these are craft nudges, not safety enforcement (v0.1 has no
constraint input to enforce against). They improve flow quality without gating the core
loop.

**Independent Test**: Compose a flow with a bilateral pose added only once, and a flow
ending on a non-stillness pose. Both warnings render. Saving and exporting both succeed
regardless.

**Acceptance Scenarios**:

1. **Given** a flow containing a bilateral pose added without its paired side, **When**
   the teacher views or saves the flow, **Then** a laterality warning renders naming the
   pose, and the save succeeds.
2. **Given** a flow whose last item is not one of the four stillness nodes, **When** the
   teacher views or saves the flow, **Then** a no-closing-stillness warning renders, and
   the save succeeds.
3. **Given** either warning is showing, **When** the teacher ignores it and exports the
   flow, **Then** the export completes normally with the warning state omitted from the
   exported file (warnings are ephemeral UI, not persisted data).

---

### User Story 6 — Pose Library Browsing (Priority: P2)

A teacher browses the pose library independent of any flow: searching by name, filtering
by category, and viewing a full detail page per pose organized by Atlas family, with
empty (Tier-2, unfilled) fields hidden rather than shown blank.

**Why this priority**: P2 — Compose's search covers the in-flow case; standalone
browsing (reference lookup, learning the library) is valuable but not on the critical
path to a first flow.

**Independent Test**: Search for a pose by partial English or Sanskrit name; filter by
category; open a detail page and confirm no field renders as an empty label.

**Acceptance Scenarios**:

1. **Given** the Poses tab, **When** the teacher searches "dragon," **Then** all Dragon-
   family poses appear, matched on English name, Sanskrit name, or alias.
2. **Given** a pose detail view, **When** a Tier-2 field has no data entered, **Then**
   that field's section does not render at all (not an empty placeholder).

---

### User Story 7 — Built-in Flows (Priority: P2)

Three built-in flows ship as read-only templates covering the spec's target use cases:
a 10-minute personal asana practice, a 60-minute vinyasa (heart openers), and a 60-minute
yin flow.

**Why this priority**: P2 — Compose works without built-ins, but Home's "today's flow"
and the duplicate-to-edit path (User Story 3) need at least one real example to be
useful on first launch.

**Independent Test**: Open Home on a fresh install with no saved flows — all three
built-ins are visible and openable in the read view without first duplicating them.

**Acceptance Scenarios**:

1. **Given** a fresh install, **When** the teacher opens Home, **Then** the three
   built-in flows are listed alongside "today's flow" (empty) and "new flow."
2. **Given** a built-in flow, **When** the teacher opens its read view directly (without
   duplicating), **Then** it renders exactly as any saved flow would.

---

### Edge Cases

- What happens when a flow item's pose has incomplete Tier-1 geometry? → The friction
  engine returns its best-effort score using whatever Tier-1 fields exist; missing
  fields contribute zero to their term rather than throwing. The seam indicator still
  renders, with fewer reasons.
- What happens when a teacher exports a flow, then imports it into an app version with a
  newer `schema_version`? → The importer MUST handle the mismatch: apply a forward
  migration for known older versions, or, if unrecognized, present a clear message
  rather than corrupting the flow or silently dropping fields.
- What happens when a teacher deletes a pose from a flow that a saved built-in
  references? → Not applicable in v0.1 — the pose library is static, version-controlled,
  and shipped with the app; poses are never deleted at runtime.
- What happens when both validator-lite warnings apply to the same flow? → Both render
  independently; neither suppresses the other.

---

## Requirements

### Functional Requirements

**Pose Library**

- **FR-001**: The pose library MUST record for each pose the Tier-1 fields defined in
  `docs/krama-atlas.md` (identity, modes, body position, geometry-lite, kinespherics,
  energetic direction, contraindications, intensity, complexity) and MAY additionally
  carry Tier-2 fields, backfilled opportunistically. CI MUST validate every pose file
  against `data/schemas/pose.schema.json` and fail on missing Tier-1 fields; Tier-2 gaps
  MUST NOT fail CI.
- **FR-002**: Each pose MUST be uniquely identified by a `slug`. CI MUST reject a
  contribution whose slug matches an existing record.
- **FR-003**: The pose library MUST include the corpus described in
  `docs/krama-v0.1-spec.md` §4 (superset: all poses already in the library plus the
  roster's yang poses — see `DECISIONS.md`), including the four stillness nodes.

**Compose**

- **FR-004**: The system MUST allow teachers to add poses to a flow via search, set a
  hold measure per item as breaths or seconds, add a free-text note per item, and reorder
  items by drag or by button.
- **FR-005**: The system MUST support grouping flow items into named, reorderable,
  optional phases, defaulting to the six-phase template (Connect, Warm-up, Build, Peak,
  Land, Transition — locked spec §5), each showing its intent tag and summed duration.
- **FR-006**: The system MUST support four layer views (simple, advanced, expert,
  custom) controlling which pose fields are visible in Compose, persisted per view.
  Safety-relevant warnings (validator-lite) MUST render at every layer.
- **FR-007**: The system MUST show a live total duration for the flow as items, measures,
  or phases change.

**Friction Engine**

- **FR-008**: The system MUST compute `friction(fromPose, toPose) → {score, tier,
  reasons[]}` as a pure function over Tier-1 geometry (contact, orientation, cog, spine,
  plane), per the weights and terms in `docs/krama-v0.1-spec.md` §6 and
  `specs/001-krama-mvp-spec/contracts/friction-engine.md`.
- **FR-009**: Friction weights MUST live in a single exported constant.
- **FR-010**: The full pairwise friction matrix MUST be precomputable at build time and
  used to render seam indicators in Compose; it MUST NOT be used elsewhere (no arc
  sparkline, no disturbance score, no lenses UI in v0.1 — locked spec §2).

**Validator-Lite**

- **FR-011**: The system MUST warn (never block) when a bilateral pose is sequenced on
  only one side.
- **FR-012**: The system MUST warn (never block) when a flow's last item is not one of
  the four stillness nodes.
- **FR-013**: Validator-lite warnings MUST render at every layer view and MUST NOT
  prevent saving or exporting a flow.

**Persistence & Portability**

- **FR-014**: Teachers MUST be able to save, duplicate, edit, and delete flows, persisted
  to local storage (localStorage/IndexedDB) without an account.
- **FR-015**: Built-in flows MUST be read-only; the only edit path is "duplicate to
  edit," which creates an independent, fully editable copy.
- **FR-016**: The system MUST export a flow as a single schema-versioned `.krama.json`
  file and MUST import that file back into an equivalent flow, including handling an
  older `schema_version` without data loss for known versions.

**Read View & Export**

- **FR-017**: The system MUST render a read view for any flow: phase-grouped,
  large-type, breath-notated with marks (not paragraphs), that works fully offline once
  loaded and meets the beauty tenets in `docs/krama-v0.1-spec.md` §10.
- **FR-018**: The read view MUST include a print stylesheet producing a clean A4/Letter
  page, with no server-side PDF generation.

**Navigation & PWA**

- **FR-019**: The system MUST implement the five-tab navigation (Home, Compose, Flows,
  Poses, Learn) per `docs/krama-v0.1-spec.md` §3, with Learn present as a stub ("soon")
  and not otherwise functional in v0.1.
- **FR-020**: The app MUST be installable as a PWA and usable offline after first load
  for its core functionality (viewing and composing flows).

**Telemetry**

- **FR-021**: The app MAY record page views, errors, and web vitals via Datadog RUM. It
  MUST NOT transmit pose names, flow titles, notes, or any other user-authored content
  to the telemetry service (constitution RULE-L7).

### Key Entities

- **Pose**: An atomic unit in the library. Identified by a unique `slug`. Tier-1 and
  Tier-2 fields per `docs/krama-atlas.md`. Never mutated at runtime.
- **Flow**: The canonical entity for the app's primary output (renamed from "Sequence" —
  see Amendment note above). An ordered list of Flow Items grouped into Phases, plus
  metadata (title, saved date, `schema_version`).
- **Flow Item**: One step in a flow. Contains a Pose reference, mode, measure (breaths or
  seconds), an optional note, and its phase assignment.
- **Phase**: A named, reorderable, optional grouping of Flow Items with an intent tag
  (samana/langhana/brahmana) and a summed duration. The default template has six.
- **Block**: An ordered sub-sequence of poses insertable into a flow as a single unit
  (e.g., Sun Salutation A). Not a Pose; not a Flow. See `docs/krama-atlas.md`.
- **Stillness Node**: A Pose with near-empty geometry and a distinct, visually quieter
  read-view treatment. Four ship in v0.1: `rebound-supine`, `constructive-rest`,
  `seated-stillness`, `savasana`.
- **Friction Result**: `{score: number, tier: 1|2|3, reasons: string[]}` — the output of
  the friction engine for a single ordered pose pair.
- **Layer Preference**: A teacher's chosen field-visibility level (simple/advanced/
  expert/custom) for Compose, persisted per view.

---

## Success Criteria

### Measurable Outcomes

- **SC-001 (the 6am test)**: A teacher can build a flow the night before and read/follow
  it on their phone the next morning without touching the screen more than once.
- **SC-002**: A teacher can go from an empty Compose screen to a saved, exportable flow
  in a single uninterrupted session with no login.
- **SC-003**: Every seam indicator's reasoning line is derived from a measured Tier-1
  geometry delta — zero invented or templated-but-unrelated reasons.
- **SC-004**: 100% of flows containing a one-sided bilateral pose trigger the laterality
  warning; 100% of flows not ending on a stillness node trigger the closing-stillness
  warning. Neither warning ever blocks a save or export.
- **SC-005**: A `.krama.json` export, reimported, produces a flow identical in content
  to the original, including across at least one `schema_version` bump.
- **SC-006**: The app is installable as a PWA and the read view works fully offline
  after first load.
- **SC-007**: The read view renders legibly on a standard phone screen in both light and
  dark mode, and prints cleanly on A4/Letter paper.
- **SC-008**: The app achieves a Lighthouse mobile performance score ≥ 90 on the read
  view.
- **SC-009**: No user-authored content (pose names, notes, flow titles) appears in
  telemetry payloads.
- **SC-010**: All 63 poses in the corpus (per `DECISIONS.md`) pass Tier-1 schema
  validation by the Sept 30 gate.

---

## Deferred to v0.2 (recorded for traceability, not implemented in v0.1)

The following were requirements or stories in the prior (AI-first) version of this spec.
They are not deleted — they describe the shape of v0.2's "Suggest" button and beyond
(locked spec §6's "walk" stage) and the parked pipeline in `src/lib/pipeline/` maps
directly onto them (see `DECISIONS.md`).

- **AI proposal stage**: `propose()` generating a draft flow from teacher dimensions.
  When it returns, it is untrusted input; the deterministic engine and any safety layer
  remain downstream and authoritative (constitution Principle III, RULE-H2–H4).
- **PII rule (still binding whenever an AI call exists)**: constraint data communicated
  to an AI service MUST be anonymized to categorical descriptors — never student names,
  ages, or identifying details. Constraint data itself is stored locally only.
- **Generation timing budget**: AI-assisted generation < 30s; deterministic-only
  fallback < 5s.
- **Per-pose alternates and "why" explainability surfaced per suggestion**: every
  AI-suggested pose exposing ≥1 alternate and a dimension-referencing "why," editable
  without re-triggering generation.
- **Roster & contraindication engine**: teacher-stated hard constraints (injuries,
  pregnancy, accessibility needs) enforced by a safety layer that removes or replaces
  violating poses — never downgrades to a warning (constitution RULE-S1/S2). This is
  the point at which validator-lite's warnings graduate into real safety enforcement for
  AI-touched content.
- **Theme-vs-constraint conflict resolution**: surfacing a conflict notice and a safe
  thematic reinterpretation rather than silently dropping either side.
- **Duration-vs-depth conflict resolution**: offering compress/extend/reduce options
  rather than silently overrunning or dropping poses.
- **In-class timer/teleprompter view**: full-screen countdown, auto-advance, pause,
  bilateral side indicator. Locked spec §2 puts "player/timer/audio" out through v0.2+.
- **Arc sparkline, disturbance score, lenses UI, provenance UI**: explicitly out per
  locked spec §2; the underlying data (meridians, elements, Tier-2 fields) is preserved
  in the schema so these can be built without a data migration later.

---

## Assumptions

- **A-001**: The self-practitioner user (a home practice, not a taught class) is the
  primary v0.1 frame — the locked spec's north star is Eddie's own 6am practice, not a
  studio class. Teaching-context language (rosters, contraindications) is deferred to
  v0.2 as above.
- **A-002**: The pose corpus is a superset of the locked spec's roster (~63 poses total)
  per `DECISIONS.md` — nothing existing is deleted to match the roster count exactly.
- **A-003**: No user account, authentication, or server-side session is required for any
  v0.1 functionality. The app is fully functional as a guest, offline-first.
- **A-004**: The app targets English-language teachers for v0.1. Internationalization is
  out of scope.
- **A-005**: Video demonstrations, social features (sharing, marketplace), and any
  server-side database are out of scope for v0.1.
- **A-006**: `.krama.json` carries a `schema_version` field from its first shipped
  version, so future format changes have a defined migration point rather than needing
  one retrofitted later.
- **A-007**: Datadog RUM is the telemetry choice; it is scoped to page views, errors, and
  web vitals only (constitution RULE-L7).
