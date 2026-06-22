# Feature Specification: Krama — Yoga Sequencing App (MVP)

**Feature Branch**: `001-krama-mvp-spec`
**Created**: 2026-06-22
**Status**: Draft
**Input**: User description — full Krama prompt pack (BLOCK 2)

---

## Clarifications

### Session 2026-06-22

- Q: How are poses uniquely identified in the library (for contributor deduplication)? → A: Each pose has a canonical **slug** (e.g., `sleeping-swan`, `dragon-low-lunge`) as its machine identifier. Sanskrit and English names are display fields only. A community-contributed pose whose slug matches an existing record is rejected by CI; the contributor must update the existing record instead of adding a duplicate.

- Q: What personal or health information is transmitted to the AI service when generating a sequence? → A: **No student-identifying information is transmitted.** Contraindications and conditions are abstracted to anonymous categorical descriptors in the AI prompt (e.g., "the class includes a student with hypertension and one who is in their second trimester of pregnancy") — never student names, ages, or other identifying details. Constraint data is stored locally only and never sent to any server in its raw form.

- Q: What format is the cue sheet export? → A: **Web-rendered printable via print CSS.** No server-side PDF generation in v1. The cue sheet is a styled HTML view with a print stylesheet that produces a clean A4/Letter output. This is simplest and works without additional infrastructure.

- Q: What is the expected generation time, and how is AI unavailability communicated to the teacher? → A: Target: **AI-assisted generation completes in under 30 seconds**; rules-engine-only fallback completes in under 5 seconds. When the AI layer is skipped (unavailable or timed out), the teacher sees a subtle, non-alarming indicator (e.g., "Sequence generated without AI enhancement — rules engine only") so they know the thematic richness may be reduced. The sequence is still safe and usable.

- Q: What is the canonical term for the output — "sequence," "class," or "class sequence"? → A: **"Sequence"** is the canonical term throughout the app and codebase. "Class" is acceptable in conversational UI copy (e.g., "Plan your class") but "sequence" is the entity name in data models, APIs, exports, and documentation. "Class sequence" is never used — it is redundant.

---

## User Scenarios & Testing

### User Story 1 — Compose a Yin Class from Dimensions (Priority: P1)

A yoga teacher opens Krama on their phone before class. They set the style (yin),
duration (75 min), target focus (hips/inner groin — Liver/Gallbladder meridian),
experience level of the room (mixed, mostly intermediate), available props (blocks and
bolsters), and a theme ("letting go"). The app proposes a complete sequence: an ordered
list of poses with hold times, transitions, per-pose explanations, a philosophical
framing, and a quote that ties the theme together. The teacher reviews each pose, swaps
one for a preferred alternate, adjusts a hold time, then exports a cue sheet they can
teach from.

**Why this priority**: This is the entire reason Krama exists. Every other story either
prepares for this one or extends it. Without this working end-to-end, there is no app.

**Independent Test**: A teacher with no prior account or saved data can set dimensions,
receive a complete proposed sequence, make at least one swap and one hold-time edit, and
export a printable cue sheet — all in a single session with no login.

**Acceptance Scenarios**:

1. **Given** a teacher sets style=yin, duration=75 min, target=hips, meridian=Liver,
   level=intermediate, props=blocks+bolsters, theme="letting go",
   **When** they request a sequence,
   **Then** the app produces an ordered sequence where: total hold times sum within
   ±5 min of 75 min; every pose targets connective tissue in the hip region or its
   meridian pair; both left and right sides are sequenced for bilateral poses; each pose
   has a hold time, a "why," and at least one alternate; and the theme is reflected in
   the philosophical framing and any quotes presented.

2. **Given** a generated sequence,
   **When** the teacher taps a pose and selects "swap for alternate,"
   **Then** the alternate appears in the sequence in place of the original, the timing
   adjusts if needed, and the "why" updates to reflect the alternate pose.

3. **Given** a generated sequence,
   **When** the teacher changes a hold time on a pose,
   **Then** the sequence total updates and the teacher sees whether it still fits the
   requested duration (within tolerance).

4. **Given** a completed and reviewed sequence,
   **When** the teacher taps "export cue sheet,"
   **Then** a printable, legible document is produced that includes: pose name (English
   and Sanskrit), hold time, transition note to next pose, per-pose cue, and the
   philosophical theme/quote. It renders cleanly on a standard phone screen and when
   printed on A4/Letter.

---

### User Story 2 — Safety Constraints Enforce Themselves (Priority: P1)

A teacher enters a class context where one or more students have contraindications
(e.g., recent hip replacement, high blood pressure, pregnancy). They flag these before
generating. The sequence the app proposes contains no poses that violate those constraints.

**Why this priority**: Safety is the non-negotiable foundation. This story has no
standalone value for the teacher but must be proven correct before any other story ships.

**Independent Test**: A teacher enters "hip replacement — no external rotation" as a
constraint. The generated sequence contains no deep hip-external-rotation poses (e.g.,
Dragon, Sleeping Swan). Any alternates offered also respect the constraint.

**Acceptance Scenarios**:

1. **Given** a teacher flags "high blood pressure" as a class constraint,
   **When** the sequence is generated,
   **Then** no inverted poses appear in the sequence or its alternates, regardless of
   what the AI layer proposed.

2. **Given** a teacher flags "no props available,"
   **When** the sequence is generated,
   **Then** every pose in the sequence is achievable without props, and the app does
   not suggest prop-dependent variations.

3. **Given** a teacher flags "pregnancy (second trimester)" as a constraint,
   **When** the sequence is generated,
   **Then** deep twists, prone poses, and supine poses that compress the vena cava are
   excluded from the sequence and from alternates.

4. **Given** a safety constraint blocks the teacher's chosen theme entirely (e.g.,
   "no hip openers" but theme is "hip opening"),
   **When** the sequence is generated,
   **Then** the app does not silently ignore the theme or the constraint. Instead it
   surfaces a clear conflict notice, proposes a safe reinterpretation of the theme
   (e.g., "grounding" in place of "hip opening"), and waits for the teacher to accept
   the reinterpretation or choose a different theme before generating.

---

### User Story 3 — Every Suggestion is Explainable and Editable (Priority: P1)

At any point in reviewing a generated sequence, the teacher can ask "why this pose?"
or "why this transition?" and receive a plain-language answer that references their
chosen dimensions. No suggestion is a black box.

**Why this priority**: Explainability is what makes Krama trustworthy and teachable-from.
A sequence the teacher doesn't understand is one they won't use.

**Independent Test**: For every pose in a generated sequence, the "why" answer references
at least one of the teacher's chosen dimensions (style, target, meridian, energetics,
theme, or goal). For every transition, the "why" explains the sequencing logic
(counterpose, body-position continuity, bilateral symmetry, or thematic connection).

**Acceptance Scenarios**:

1. **Given** a generated sequence,
   **When** the teacher taps "why?" on any pose,
   **Then** a plain-language explanation appears that references the teacher's dimensions
   — not just anatomical description.

2. **Given** a generated sequence,
   **When** the teacher taps "why?" on the transition between two poses,
   **Then** an explanation appears covering: body position continuity, counterpose logic,
   meridian or energetic continuity, or an explicit thematic bridge.

3. **Given** a generated sequence,
   **When** the teacher edits a pose cue, hold time, or philosophical note,
   **Then** the edit persists for the rest of the session without re-triggering generation.

---

### User Story 4 — Dimension Dials Drive the Sequence Shape (Priority: P1)

The teacher can set any combination of the core dimensions and the sequence reflects
all active settings in a coherent, non-contradictory way. Unset dimensions default
sensibly. No dimension is required.

**Why this priority**: The dimension system is the creative input surface. Getting it
right — including defaults and interactions between dimensions — is central to MVP value.

**Independent Test**: A teacher who sets only "style=restorative, duration=60 min"
(all other dimensions at defaults) receives a safe, coherent 60-minute restorative
sequence. A teacher who sets 8 dimensions receives a sequence that reflects all 8
without contradiction.

**Acceptance Scenarios**:

1. **Given** a teacher sets only "duration=45 min" (all other dimensions default),
   **When** they request a sequence,
   **Then** the app generates a valid sequence without prompting for mandatory inputs.

2. **Given** a teacher sets "style=vinyasa, meridian=Kidney, season=Winter,
   dosha=Vata-balancing, theme=stillness,"
   **When** a sequence is generated,
   **Then** the pose selection, energetic framing, and philosophical note all reflect
   the Winter/Kidney/Vata coherence — they do not contradict one another.

3. **Given** a teacher sets "duration=20 min" but also sets a depth level that requires
   more time (e.g., deep yin holds of 5+ min for 6+ poses),
   **When** the sequence is generated,
   **Then** the app warns that the duration is too short for the requested depth, offers
   options (accept a compressed version, extend the duration, or reduce the pose count),
   and does not silently produce a sequence that overruns the time.

---

### User Story 5 — Save and Revisit Sequences (Priority: P2)

After using a sequence, the teacher can save it to a personal library, rate it after
teaching (1-5 stars plus a note), and open it again for future use.

**Why this priority**: P2 — the core loop is complete without it, but repeat use and
a growing personal library are critical for retention and long-term value.

**Independent Test**: A teacher saves a sequence, closes and reopens the app, navigates
to their library, and the sequence is intact with all edits and metadata.

**Acceptance Scenarios**:

1. **Given** a generated and reviewed sequence,
   **When** the teacher taps "save,"
   **Then** the sequence appears in their personal library with its dimensions, date, and
   title. No login is required.

2. **Given** a saved sequence,
   **When** the teacher opens it the next day,
   **Then** all poses, hold times, edits, and the philosophical framing are intact.

3. **Given** a saved sequence that has been taught,
   **When** the teacher rates it (stars + note),
   **Then** the rating and note are saved and visible in the library listing.

---

### User Story 6 — In-Class Timer and Teleprompter View (Priority: P2)

During class, the teacher can switch to a full-screen, distraction-free view that shows
the current pose, hold time counting down, and a cue — advancing automatically or
manually through the sequence.

**Why this priority**: P2 — addresses the in-studio delivery context. Without it, the
teacher must print or use the cue sheet view.

**Independent Test**: A teacher advances through a 5-pose sequence in timer view: each
pose shows clearly with its cue, the timer counts down, and moving to the next pose
works with a single tap.

**Acceptance Scenarios**:

1. **Given** the timer view is open with a sequence,
   **When** a hold timer reaches zero,
   **Then** the app advances to the next pose automatically (or prompts for manual
   advance, per teacher preference).

2. **Given** the timer view is open,
   **When** the teacher needs to pause,
   **Then** a single tap pauses the timer; another tap resumes it.

3. **Given** the timer view is open on a phone screen in a dim studio,
   **Then** the text is large enough to read from arm's length and the screen stays on
   without the teacher having to touch it during holds.

---

### Edge Cases

- What happens when no poses in the library satisfy all active constraints simultaneously?
  → App presents the closest possible sequence with a clear explanation of which
  constraints could not be fully met, offers to relax the least-critical soft preference.

- What happens when the AI service is unavailable at generation time?
  → App falls back to rules-engine-only generation silently and presents the result
  without surfacing an error. The sequence may be less thematically rich but is safe
  and coherent.

- What happens if a teacher's constraint set is contradictory (e.g., "no floor poses"
  and "yin style," which is exclusively floor-based)?
  → App detects the logical contradiction, explains it plainly, and asks the teacher to
  resolve the conflict before generating.

- What happens when the teacher swaps a pose and the alternate's hold time pushes the
  sequence over duration?
  → App shows the updated total and flags the overrun; teacher decides whether to trim
  elsewhere or accept the overage.

---

## Requirements

### Functional Requirements

**Dimension Input**

- **FR-001**: The system MUST allow teachers to set any combination of the following
  dimensions, with all fields optional: style (yin/vinyasa/ashtanga/restorative),
  total duration, time of day, season, fitness level, age range, experience level,
  number of students, room temperature, props available, body system target, meridian
  target, dosha emphasis, Five-Element seasonal pairing, class goal, theme/philosophy,
  intensity curve shape, pose complexity, and yang/yin balance.

- **FR-002**: The system MUST provide sensible defaults for all unset dimensions so that
  a teacher can generate a sequence without filling any field.

- **FR-003**: Hard constraints (contraindications, injuries, conditions, accessibility
  needs, unavailable props) MUST be input through a distinct interface from soft
  preferences, making their non-negotiable status clear to the teacher.

**Sequence Generation**

- **FR-004**: The system MUST generate sequences through a fixed three-stage pipeline:
  AI proposal → rules engine constraint → safety validation, in that order.

- **FR-005**: The system MUST NOT surface a sequence to the teacher before it has
  passed safety validation.

- **FR-006**: The system MUST generate a sequence using the rules engine alone when the
  AI service is unavailable or times out, without blocking the teacher. When the AI
  layer is skipped, the teacher MUST see a non-alarming indicator (e.g., "Generated
  without AI enhancement") so they know thematic richness may be reduced.

- **FR-006a**: AI-assisted sequence generation MUST complete in under 30 seconds.
  Rules-engine-only fallback generation MUST complete in under 5 seconds.

- **FR-006b**: Constraint data entered by the teacher (injuries, conditions, pregnancy
  status) MUST be stored locally only. When constraints are communicated to the AI
  service, they MUST be expressed as anonymous categorical descriptors (e.g.,
  "hypertension," "second-trimester pregnancy") — never with student names, ages, or
  other identifying details.

- **FR-006c**: The AI layer MUST be treated as untrusted input by the rules engine and
  safety layer. Both downstream stages MUST NOT assume AI output is valid, well-formed,
  or safe. This is a functional constraint, not an implementation preference.

- **FR-007**: Generated sequences MUST include: an ordered pose list, hold times for
  each pose, transition notes between poses, a per-pose "why," at least one alternate
  per pose, a theme statement, philosophical framing, and at least one quote attributed
  to its source.

- **FR-008**: Generated sequences MUST verify: total hold times sum within ±5 min of
  requested duration; bilateral poses include both sides; no safety constraint is
  violated; the intensity curve is appropriate for the stated audience.

**Pose Library**

- **FR-009**: The pose library MUST record for each pose: a unique slug identifier,
  Sanskrit name, English name, common aliases, target tissue (connective vs. muscular),
  meridians loaded, body position family (supine/prone/seated/kneeling/standing/
  inverted), default hold time range, prop requirements, prop-free variations, natural
  counterposes and rebound poses, difficulty/accessibility level, contraindications,
  energetic quality, and source/lineage attribution.

- **FR-010**: The pose library MUST include at minimum 40 yin poses for P1, covering
  the major meridian pairs and body position families.

- **FR-011**: Each pose MUST be categorized by mode: yin expression (passive, connective
  tissue, long hold), yang expression (active, muscular), or both. A pose is not
  categorically yin or yang; it has modes.

**Explainability**

- **FR-012**: Every pose in a generated sequence MUST expose a human-readable "why"
  that references at least one of the teacher's active dimensions.

- **FR-013**: Every transition between poses MUST expose a human-readable "why"
  covering sequencing rationale.

- **FR-014**: All "why" text MUST be editable by the teacher without re-generating.

**Safety**

- **FR-015**: The safety layer MUST check, for every generated sequence: no pose
  violates any stated contraindication; no pose requires an unavailable prop without a
  prop-free variation; the intensity curve is within the stated audience level. "Within
  the stated audience level" means: for beginner audiences, no poses requiring
  significant joint mobility or balance beyond accessible basics; for intermediate, no
  poses designated advanced in the library; for advanced, no explicit ceiling.
  The library pose record carries the difficulty level; the safety layer compares it
  to the session's stated experience level.

- **FR-015a**: When the safety layer removes a contraindicated pose, it MUST attempt to
  substitute a replacement pose that satisfies the same safety constraints and is within
  the same body-position family. If no valid replacement exists, the sequence MAY
  contain a gap with a rebound/rest pose placeholder, and the teacher MUST be informed
  of the gap and reason.

- **FR-016**: When a constraint blocks the teacher's chosen theme, the system MUST
  surface the conflict with a clear plain-language explanation and propose a safe
  reinterpretation of the theme — never silently ignore either the constraint or the
  theme.

- **FR-017**: When the requested duration is too short for the requested depth, the
  system MUST warn the teacher and offer options; it MUST NOT silently overrun the
  time or silently drop poses.

**Editing**

- **FR-018**: Teachers MUST be able to swap any pose for any of its alternates with a
  single interaction. Alternates MUST satisfy the same safety constraints as the original.

- **FR-019**: Teachers MUST be able to edit hold times, cues, and philosophical notes
  without re-triggering sequence generation.

**Export**

- **FR-020**: The system MUST produce a cue sheet as a web-rendered printable (print
  CSS), containing: pose names (English and Sanskrit), hold times, transition notes,
  per-pose cues, and the philosophical theme and quote. The output MUST render legibly
  on a standard phone screen and print cleanly on A4/Letter paper without server-side
  PDF generation.

**Persistence (P2)**

- **FR-021**: Teachers MUST be able to save sequences to a personal library stored
  locally on their device, without creating an account.

- **FR-022**: Teachers MUST be able to rate saved sequences (1–5 stars) and add a
  freeform note after teaching.

**Timer View (P2)**

- **FR-023**: The system MUST provide a full-screen timer/teleprompter view showing
  the current pose, a countdown hold timer, and the pose cue. The screen MUST stay
  active during holds without teacher interaction.

- **FR-024**: The timer view MUST support manual advance and pause with a single tap.

### Key Entities

- **Teacher Session**: The active planning context — selected dimensions, hard
  constraints, and any session-level notes. Not persisted in P1; persisted locally in P2.

- **Pose**: An atomic unit in the library. Identified by a unique **slug** (e.g.,
  `sleeping-swan`). Has a yin mode, a yang mode, or both. Contains Sanskrit name,
  English name, aliases, tissue target, meridians, body position, hold range, props,
  prop-free variations, counterposes, contraindications, energetic quality, and source
  attribution.

- **Sequence**: The canonical term for the app's primary output — an ordered list of
  Sequence Items plus metadata (duration, theme statement, philosophical framing, quote,
  generation provenance). "Class" is acceptable in conversational UI copy; "sequence"
  is the entity name in data models and documentation. "Class sequence" is never used.

- **Sequence Item**: One step in a sequence. Contains a Pose reference, the selected
  mode (yin/yang), hold time, transition-from note, transition-to note, "why" text,
  and a list of Alternate Poses.

- **Alternate Pose**: A Pose that satisfies the same safety constraints and dimensional
  requirements as its parent Sequence Item, ranked by dimensional alignment.

- **Hard Constraint**: A teacher-stated rule (contraindication, condition, accessibility
  need, or prop unavailability) that the safety layer enforces unconditionally.

- **Soft Preference**: A teacher-stated dimension dial (style, target, energetics, theme,
  etc.) that the rules engine optimizes toward but may trade off.

- **Saved Sequence** (P2): A persisted Sequence with its full state, save date, title,
  rating, and post-teaching notes.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A teacher can go from a blank dimension form to a complete, exportable
  cue sheet in under 3 minutes on a first use with no onboarding.

- **SC-002**: 100% of generated sequences pass the safety validation check for every
  hard constraint the teacher specified. Zero safety violations reach the teacher's view.

- **SC-003**: Every pose in every generated sequence has a "why" that references at
  least one of the teacher's chosen dimensions. Zero generic anatomical-only explanations.

- **SC-004**: Every bilateral pose in every generated sequence includes both sides.
  Zero sequences with one-sided bilateral poses.

- **SC-005**: Total hold times in every generated sequence sum within ±5 minutes of the
  teacher's requested duration.

- **SC-006**: The app generates a valid sequence (via rules engine fallback) when the
  AI service is unavailable, with no error surfaced to the teacher.

- **SC-007**: The cue sheet export renders legibly on a standard phone screen and
  prints cleanly on A4/Letter paper.

- **SC-008**: The app is installable as a PWA and core sequence-delivery functionality
  works without a network connection.

- **SC-009** (P2): A saved sequence is intact and fully accessible after the app is
  closed and reopened on the same device.

- **SC-010**: AI-assisted sequence generation completes in under 30 seconds for 95%
  of requests under normal conditions.

- **SC-011**: Rules-engine-only fallback generation completes in under 5 seconds.

- **SC-012**: No student-identifying information (names, demographics) is transmitted
  to external services. All constraint data leaving the device is anonymized to
  categorical descriptors.

---

## Assumptions

- **A-001**: The self-practitioner user (someone building a home practice rather than
  teaching) is deferred to P2 or later. v1 language and UI frame the app around
  teaching a class, not personal practice.

- **A-002**: The pose library seed for P1 covers yin style comprehensively (40+ poses)
  and includes enough vinyasa/restorative poses for those styles to produce coherent
  sequences, even if incompletely. Full multi-style coverage is a P2/P3 concern.

- **A-003**: Alternates are ranked in this priority order: (1) safety compliance,
  (2) dimensional alignment (meridian, target tissue, energetics), (3) difficulty match
  to stated level, (4) variety (avoids repeating poses already in the sequence).

- **A-004**: Theme-vs-constraint conflicts are resolved interactively: the app surfaces
  the conflict, proposes a safe reinterpretation, and requires teacher confirmation.
  It does not silently drop the constraint or silently abandon the theme.

- **A-005**: Duration-vs-depth conflicts are resolved by offering the teacher explicit
  options (compress, extend, or reduce depth), never by silent overrun or silent
  omission.

- **A-006**: No user account, authentication, or server-side session is required for
  any P1 functionality. The app is fully functional as a guest.

- **A-007**: The app targets English-language teachers for P1. Internationalization
  and multi-language support are out of scope for v1.

- **A-008**: Video demonstrations of poses are out of scope for v1.

- **A-009**: Social features (sharing sequences, class marketplace) are out of scope
  for v1.

- **A-010**: The AI layer (LLM) will sometimes produce drafts that violate constraints
  or sequencing rules. The rules engine and safety layer are the trust boundary;
  the AI is treated as untrusted input. The spec assumes these downstream layers
  always run and always have authority over AI output. This is formalized as FR-006c.

- **A-011**: Meridian data is structured as a pair of organ-meridian records linked to
  a TCM Five-Element (Wood/Fire/Earth/Metal/Water), a season, and an energetic
  direction. The exact schema for meridian records is defined in the plan/data-model
  phase. For P1, the spec requires that poses tag at minimum the primary meridian
  pair they load (e.g., Liver/Gallbladder for hip-flexor poses in Spring/Wood).

- **A-012**: The following features mentioned in the original brief are explicitly
  deferred beyond P1 and are recorded here for traceability:
  - P2: Breath and meditation bookends (pranayama/savasana framing).
  - P2: Soundscape/playlist suggestion matched to the session arc.
  - P2: Lighting and temperature notes.
  - P2: Student handout output form factor (separate from teacher cue sheet).
  - P3: Sankey/flow visualization, intensity curve visualization, layered dimension
    view.
  - P3: Multi-week progressive series builder.
  - P3: Community-contributed poses and quotes via PR workflow.
  These are OUT OF SCOPE for P1 implementation. Their presence in this spec is for
  traceability only.

- **A-013**: Dimension allowed values for P1 (enumerated to enable consistent
  implementation; extensible in later phases):
  - Style: `yin | vinyasa | ashtanga | restorative`
  - Season: `spring | summer | late-summer | autumn | winter`
  - Dosha: `vata | pitta | kapha | vata-pitta | pitta-kapha | vata-kapha | tridoshic`
  - Five-Element: `wood | fire | earth | metal | water`
  - Body position family: `supine | prone | seated | kneeling | standing | inverted`
  - Energetic quality: `grounding | opening | cooling | heating | calming | stimulating`
  - Intensity curve: `bell | plateau | gradual-ramp | front-loaded | back-loaded`
  - Experience level: `beginner | intermediate | advanced | mixed`
  - Pose difficulty: `accessible | intermediate | advanced`
  All values are lowercase slugs. New values require a schema update PR and CI
  validation against the pose library.
