# Feature Specification: Pose Library

**Feature Branch**: `003-pose-library`
**Created**: 2026-08-31
**Status**: Draft
**Input**: User description: "The pose atlas as a first-class reading surface, specified from `specs/003-pose-library/design-input.md` (9 candidate UX requirements, 6 open decisions, sourced from `docs/design-research/{01,04,05,06,08}`). Pose JSON stays the source of truth in `data/poses/` and stays readable with no account (Principle V, RULE-O2/O6). Adds the `energetic_direction` field that `004`'s six-phase arc needs, makes the anatomy diagram and its legend read as one linked view, makes catalog filters predictable and their derived scores explainable, keeps theme browsing a stateless lens, and introduces the first per-user cloud-resident personalization (favorites and private pose notes). Absorbs open `001` debt: the Tier-1 review of 10 poses (T027) and the Tier-1 completeness CI gate (T074). Does NOT own Compose UI — every seam, warning, and phase render is routed to `004`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tier-1 completeness is provable, not asserted (Priority: P1)

The pose library's Tier-1 fields are the input the friction engine computes over. A
contributor adds or edits a pose record, and continuous integration proves every Tier-1
field is present and schema-valid before the change can merge — rather than the gap being
discovered later as a silently wrong friction score.

**Why this priority**: Every downstream feature computes over this data. A missing Tier-1
field does not fail loudly; it produces a plausible-looking wrong answer in the friction
engine, which is the hardest class of bug to notice. This story also clears the two oldest
open debts carried over from `001` (T027, T074), and it delivers value with no user-facing
change at all.

**Independent Test**: Can be fully tested with no UI work, by deliberately removing a
Tier-1 field from one pose record and confirming continuous integration refuses the change
and names both the pose and the missing field.

**Acceptance Scenarios**:

1. **Given** a pose record missing a required Tier-1 field, **When** validation runs,
   **Then** it fails and names the pose slug and the absent field.
2. **Given** a pose record whose field value violates the schema's type or enumeration,
   **When** validation runs, **Then** it fails and names the offending value.
3. **Given** a pose record with no attribution, **When** validation runs, **Then** it
   fails,
   because attribution is required of every record.
4. **Given** the full library, **When** validation runs, **Then** it reports Tier-1
   completeness as a coverage figure rather than only a pass or fail.
5. **Given** the ten poses identified in the `001` review debt, **When** the review is
   complete, **Then** each has a recorded Tier-1 verification and any correction is
   attributable in version control.

---

### User Story 2 - Every pose carries an energetic direction (Priority: P1)

Each pose record gains an energetic-direction value — langhana (reducing), brahmana
(building), or samana (balancing) — so that the six-phase composer arc in `004` has a real
source to derive a phase intent tag from, instead of the render being blocked on data that
does not exist.

**Why this priority**: This is the data half of a cross-feature dependency. `004`'s phase
intent tag cannot be built at all until this field exists and is populated, so shipping it
here unblocks a separate feature. It is also independently valuable: the field is readable
in the pose detail view whether or not `004` ever renders it.

**Independent Test**: Can be fully tested by reading the field from any pose record and
confirming validation enforces its presence and its permitted values, with no composer
involvement.

**Acceptance Scenarios**:

1. **Given** the pose schema, **When** it is inspected, **Then** energetic direction is a
   defined field with exactly three permitted values.
2. **Given** a pose record with no energetic direction, **When** validation runs, **Then**
   it is reported against the same completeness gate as the other required fields.
3. **Given** a pose record with an energetic direction outside the permitted set, **When**
   validation runs, **Then** it fails and names the permitted values.
4. **Given** the field has been added to the schema, **When** the existing attribution
   requirement is checked, **Then** the new field has not bypassed it.
5. **Given** a reader viewing a pose, **When** they read its detail view, **Then** the
   energetic direction is legible without needing the composer.

---

### User Story 3 - The anatomy diagram and its legend read as one view (Priority: P1)

A teacher opens a pose and looks at its anatomy diagram. Tapping a body region highlights
the matching legend entry, and tapping a legend entry highlights the region — the two are
one linked view. A persistent legend explains the depth encoding, so nobody has to infer
what a dashed outline means. A category with no data for this pose does not offer a tab
that
leads nowhere.

**Why this priority**: This is the pose library's primary reading surface and the one the
design research found weakest. A diagram whose encoding must be guessed at is a diagram
that
gets misread, and a tab that leads to an empty panel is a dead end the user pays for twice
—
once to tap, once to back out.

**Independent Test**: Can be fully tested on a single pose record by tapping each region
and
each legend entry and confirming the link works in both directions, that the legend is
present without interaction, and that a zero-data category offers no trigger.

**Acceptance Scenarios**:

1. **Given** a pose detail view with an anatomy diagram, **When** a body region is tapped,
   **Then** the matching legend entry is highlighted or scrolled into view.
2. **Given** the same view, **When** a legend entry is tapped, **Then** the matching body
   region is highlighted.
3. **Given** the anatomy diagram, **When** it is first rendered with no interaction,
   **Then**
   a legend explaining the depth encoding is already visible and occupies no more than two
   lines.
4. **Given** a pose with no data for a body-map category, **When** the view renders,
   **Then**
   that category offers no tab trigger at all, rather than a trigger leading to an empty
   panel.
5. **Given** a narrow viewport, **When** the anatomy view renders, **Then** the front/back
   toggle and the category tabs occupy a single control row or a scroll-snapping row, not
   two
   stacked full-width rows.
6. **Given** any new highlight interaction, **When** it animates, **Then** it completes
   within the motion budget and does not bounce.

---

### User Story 4 - Catalog filters are predictable and derived scores are explainable
(Priority: P2)

A teacher filtering the catalog can tell, before tapping, whether a chip group narrows
results by combining selections or by replacing them. Where the catalog shows a derived
complexity or injury-risk score, the reader can find out in place what the number
reflects,
rather than being shown a bare figure.

**Why this priority**: Misreading a multi-select group as single-select produces a result
set
the user cannot explain, which erodes trust in the whole catalog. It is P2 rather than P1
because the catalog is usable today and this makes it legible, where Story 3 fixes a
surface
that is actively misleading.

**Independent Test**: Can be fully tested by inspecting a multi-select and a single-select
chip group side by side and confirming they differ by more than active-state colour, and
by
opening the score explanation from the catalog.

**Acceptance Scenarios**:

1. **Given** a multi-select chip group and a single-select chip group, **When** both are
   rendered inactive, **Then** they are visually distinguishable by an affordance other
   than
   colour alone.
2. **Given** a multi-select chip group, **When** two chips are selected, **Then** the
   result
   set reflects combining both constraints, consistent with the affordance shown.
3. **Given** a derived complexity or injury-risk score, **When** the reader opens its
   explanation, **Then** a short static explanation describes what the score reflects.
4. **Given** that explanation, **When** it is read, **Then** it describes geometry factors
   in
   plain language and does not expose the engine's weighting constants as copy.
5. **Given** any active filter, **When** the catalog renders, **Then** clearing all
   filters
   is available from the top level, independent of whether the advanced panel is open.
6. **Given** any filter chip, **When** its touch target is measured, **Then** it meets the
   minimum touch-target guardrail.

---

### User Story 5 - Theme browsing stays a lens, not a diagnosis (Priority: P2)

A teacher browses poses through the curated emotional-release taxonomy. Each theme section
carries a short non-prescriptive subhead rather than a bare emotion label, and element,
chakra, and dosha are available as visible cross-filters in the same view. The taxonomy
stays
curated and closed, and browsing records nothing about the reader.

**Why this priority**: A bare emotion word beside a pose list reads closer to a clinical
diagnosis than an invitation, which cuts against the product's whole stance. Keeping this
surface stateless also draws the boundary that stops it from duplicating `005`'s check-in.

**Independent Test**: Can be fully tested by browsing every theme section and confirming
each
carries a subhead, cross-filters are present in-view, and no interaction writes or reads
any
per-user mood state.

**Acceptance Scenarios**:

1. **Given** a theme section, **When** it renders, **Then** it carries a one-line
   non-prescriptive subhead in addition to its label.
2. **Given** theme mode, **When** it renders, **Then** element, chakra, and dosha are
   available as visible cross-filter chips in the same view, not behind a separate panel.
3. **Given** the theme taxonomy, **When** it is inspected, **Then** it is the existing
   curated static set and has not become an open or ad hoc tag set.
4. **Given** any theme browsing interaction, **When** it completes, **Then** no mood,
   feeling,
   or check-in state has been recorded, prompted for, or read.
5. **Given** a reader with no account, **When** they browse every theme section, **Then**
   everything renders, because none of this surface requires an account.

---

### User Story 6 - A practitioner marks favourites and keeps private notes on a pose
(Priority: P3)

A signed-in practitioner marks poses as favourites and writes their own notes on a pose.
Both are theirs: the notes are visible to nobody else, enforced at the table layer.
Neither
becomes a precondition for reading the pose library, which still works with no account and
no
network.

**Why this priority**: This is the first per-user, cloud-resident data in the pose surface
and
the smallest safe place to establish the pattern. It is P3 because the library is fully
useful
without it, and because it introduces write-path and privacy surface that should land
after
the reading surface is right.

**Independent Test**: Can be fully tested by favouriting a pose and writing a note as one
account, then confirming from a second account that neither is visible, and confirming an
unauthenticated reader can still browse the whole library.

**Acceptance Scenarios**:

1. **Given** a signed-in practitioner, **When** they favourite a pose, **Then** the
   favourite
   persists to their account and is visible to them on any device.
2. **Given** a signed-in practitioner, **When** they write a note on a pose, **Then** the
   note
   is stored against their account and against that pose.
3. **Given** a second account — including an organization admin or a cohort teacher who
   shares
   an organization with the author — **When** they attempt to read the author's pose note
   by
   any means, **Then** they receive nothing, refused at the table layer rather than by
   application code.
4. **Given** an unauthenticated reader, **When** they browse the pose library, **Then**
   every
   pose and all its reference data render, with no prompt to sign in.
5. **Given** a reader with the library already cached and no network, **When** they read a
   pose, **Then** it renders; only writing a favourite or a note requires authentication.
6. **Given** a practitioner with favourites, **When** their entitlement lapses, **Then**
   they
   can still read their own existing notes and favourites.

---

### Edge Cases

- What happens when a pose has data for exactly one body-map category? The surviving tab
  must
  not read as a broken tab bar; a single-category view should present as a view, not a
  degenerate set of tabs.
- What happens when a pose has no anatomy data at all? The diagram, the legend, and the
  whole
  tab group must be absent rather than rendering an empty frame.
- What happens when a body region maps to more than one legend entry, or a legend entry to
  several regions? The linking must handle many-to-many without appearing to select the
  wrong
  thing.
- What happens when a filter combination matches zero poses? The empty result must state
  which
  constraints produced it, since a multi-select group makes an accidental over-narrowing
  easy.
- What happens when the energetic-direction field is added but a pose's value is genuinely
  arguable? The value must be attributable like any other field, so a later reviewer can
  see
  who decided and on what basis.
- What happens when a practitioner writes a pose note and then deletes their account? The
  note
  must be removed with the account and must not survive as an orphan row.
- What happens when a practitioner favourites a pose whose record is later removed from
  the
  library? The favourite must degrade quietly rather than producing a broken entry.
- What happens when the same account writes notes on two devices while offline? The pose
  library's own read path must remain unaffected; note reconciliation follows whatever
  rule
  `004` establishes for user-authored content rather than inventing a second one here.
- What happens when a diagram hue is reused somewhere it should not be? The sanctioned
  exception covers pose-data badges only; a reviewer must be able to catch migration onto
  a
  button, link, or chip active state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Pose records MUST remain plaintext, version-controlled files in the
  repository
  as the single source of truth.
- **FR-002**: The pose library, its meridian data, and its quotes MUST be readable with no
  account, no subscription, and no entitlement of any kind.
- **FR-003**: If a server-side mirror of pose data is introduced, it MUST be a one-way
  generated artifact with a single privileged write path, and MUST NOT become a second
  place
  pose data can be authored.
- **FR-004**: Every pose record MUST carry attribution, and no newly added field may
  bypass
  that requirement.
- **FR-005**: Validation MUST fail when any required Tier-1 field is absent, and MUST name
  the
  pose and the field.
- **FR-006**: Validation MUST fail when a field value violates its declared type or
  enumeration, and MUST name the offending value.
- **FR-007**: Validation MUST report Tier-1 completeness as a coverage figure, not only as
  a
  pass or fail verdict.
- **FR-008**: Validation MUST run in continuous integration and MUST be able to fail the
  build.
- **FR-009**: The ten poses carried over from the `001` Tier-1 review debt MUST each have
  a
  recorded verification, attributable in version control.
- **FR-010**: The pose schema MUST define an energetic-direction field with exactly three
  permitted values corresponding to reducing, building, and balancing.
- **FR-011**: Energetic direction MUST be subject to the same completeness gate as the
  other
  required Tier-1 fields.
- **FR-012**: Energetic direction MUST be readable in the pose detail view independently
  of
  any composer surface.
- **FR-013**: Tapping a body region in the anatomy diagram MUST highlight or scroll to its
  matching legend entry, and tapping a legend entry MUST highlight its matching region.
- **FR-014**: The region-to-legend link MUST behave correctly when a region maps to
  several
  legend entries or a legend entry to several regions.
- **FR-015**: A legend explaining the diagram's depth encoding MUST be visible without
  interaction and MUST occupy no more than two lines.
- **FR-016**: A body-map category with no data for the current pose MUST NOT present a tab
  trigger.
- **FR-017**: A pose with no anatomy data at all MUST render no diagram, legend, or tab
  group,
  rather than an empty frame.
- **FR-018**: On narrow viewports the front/back toggle and the category tabs MUST occupy
  a
  single control row or a scroll-snapping row, not two stacked full-width rows.
- **FR-019**: Every new interaction in this feature MUST complete within the established
  motion budget and MUST NOT bounce.
- **FR-020**: Multi-select filter chip groups MUST be visually distinguishable from
  single-select groups by an affordance other than active-state colour alone.
- **FR-021**: A multi-select chip group's result set MUST combine its selected
  constraints,
  consistent with the affordance it presents.
- **FR-022**: A derived complexity or injury-risk score MUST be explainable in place
  through a
  short static explanation.
- **FR-023**: A score explanation MUST describe contributing geometry factors in plain
  language and MUST NOT expose the engine's weighting constants as user-facing copy.
- **FR-024**: A zero-result filter combination MUST state which constraints produced it.
- **FR-025**: Clearing all filters MUST be available from the top level whenever any
  filter is
  active, independent of the advanced panel's state.
- **FR-026**: Every filter chip's touch target MUST meet the established minimum
  touch-target size.
- **FR-027**: Each theme section MUST carry a one-line non-prescriptive subhead in
  addition to
  its label.
- **FR-028**: Theme mode MUST expose element, chakra, and dosha as visible cross-filter
  chips
  within the same view.
- **FR-029**: The theme taxonomy MUST remain the existing curated, closed set and MUST NOT
  become an open or ad hoc tag set.
- **FR-030**: Theme browsing MUST remain stateless with respect to the reader: no mood,
  feeling, or check-in value may be recorded, prompted for, or read anywhere in this
  surface.
- **FR-031**: A signed-in practitioner MUST be able to mark and unmark a pose as a
  favourite,
  persisted to their account and available across their devices.
- **FR-032**: A signed-in practitioner MUST be able to write, edit, and delete their own
  notes
  on a pose.
- **FR-033**: A practitioner's pose notes MUST be readable only by their author. The
  restriction MUST be enforced in table structure and access policy, verifiable by
  inspecting
  the schema alone, and MUST NOT depend on application-layer conditionals.
- **FR-034**: No organization membership, administrative role, or cohort teaching
  relationship
  may grant any account read access to another account's pose notes.
- **FR-035**: Reading pose data MUST NOT require authentication, and MUST NOT be gated on
  the
  presence, absence, or failure of the favourites or notes write path.
- **FR-036**: Reading a pose from the client-side cache MUST work with no network
  connection
  and no account.
- **FR-037**: A lapsed entitlement MUST NOT revoke a practitioner's ability to read their
  own
  existing notes and favourites.
- **FR-038**: Deleting an account MUST remove that account's pose notes and favourites,
  leaving no orphan records.
- **FR-039**: A favourite whose pose record is later removed from the library MUST degrade
  quietly rather than producing a broken entry.
- **FR-040**: The sanctioned diagram hues MUST remain scoped to pose-data badges and MUST
  NOT
  migrate onto buttons, links, or chip active states, and MUST NOT introduce a second
  interface
  accent colour.

### Key Entities *(include if feature involves data)*

- **Pose Record**: The version-controlled unit of pose data. Carries Tier-1 geometry,
  attribution, and — new in this feature — an energetic direction. Readable with no
  account.
- **Tier-1 Field Set**: The subset of pose fields the friction engine computes over, and
  the
  subset the completeness gate enforces.
- **Energetic Direction**: One of reducing, building, or balancing, per pose. The data
  source
  for the phase intent tag that `004` renders.
- **Body-Map Category**: One grouping of anatomical data for a pose (muscle groups,
  meridians,
  joints, chakras). May legitimately hold no data for a given pose, in which case it
  presents
  no trigger.
- **Legend Entry**: One named item in the anatomy legend, linked bidirectionally to the
  regions
  it describes, with a depth encoding the legend itself explains.
- **Filter Chip Group**: A set of catalog filter chips that is either single-select or
  multi-select, and which declares which it is through its affordance rather than its
  colour.
- **Derived Score**: A complexity or injury-risk figure computed from pose geometry,
  carrying
  an in-place plain-language explanation and never exposing its weights as copy.
- **Theme**: One curated entry in the closed emotional-release taxonomy, carrying a label
  and a
  non-prescriptive subhead. A lens over the atlas, holding no per-reader state.
- **Favourite**: A signed-in account's mark against a pose. Per-user, cloud-resident, and
  never
  a precondition for reading.
- **Pose Note**: A signed-in account's own writing about a pose. Practice content: visible
  only
  to its author, enforced structurally.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pose records pass Tier-1 completeness and schema validation in
  continuous integration, and a deliberately introduced gap fails the build on 100% of
  attempts.
- **SC-002**: Tier-1 completeness is reported as a coverage figure on every validation
  run, so
  a partial regression is visible before it reaches zero.
- **SC-003**: 100% of pose records carry an energetic direction drawn from the three
  permitted
  values, and `004` can render a phase intent tag with no further data work.
- **SC-004**: Every body region in the anatomy diagram links bidirectionally to its legend
  entry, with zero regions that highlight nothing and zero legend entries that highlight
  nothing.
- **SC-005**: Zero dead-end category taps exist: for every pose, the count of visible
  category
  triggers equals the count of categories holding data.
- **SC-006**: A reader can state the diagram's depth convention without interacting with
  the
  view.
- **SC-007**: Every new interaction completes within the motion budget, measured rather
  than
  assumed, with zero bounce.
- **SC-008**: A user shown an inactive multi-select and an inactive single-select chip
  group
  correctly identifies which combines constraints, without selecting anything first.
- **SC-009**: 100% of derived scores shown in the catalog have an in-place explanation,
  and
  zero explanations expose a weighting constant.
- **SC-010**: 100% of theme sections carry a subhead, and zero theme interactions read or
  write
  any per-reader mood state.
- **SC-011**: 100% of attempts by a non-author account — including an organization admin
  and a
  cohort teacher sharing an organization with the author — to read another account's pose
  notes
  are refused, verified by automated tests asserting zero rows or an explicit denial for
  every
  attempt.
- **SC-012**: An unauthenticated reader with no network can browse the cached pose library
  with
  zero sign-in prompts and zero failed reads.
- **SC-013**: Zero orphan notes or favourites remain after an account deletion.
- **SC-014**: Zero sanctioned diagram hues appear on a button, link, or chip active state,
  and
  the interface accent count remains one.

## Assumptions

- Pose data stays in `data/poses/` as version-controlled JSON, and no server mirror is
  added
  by default. A mirror is introduced only if a server-side join demonstrably needs one,
  and
  then only as a one-way generated artifact.
- This feature owns no Compose surface. Where it adds data the composer will render —
  notably
  energetic direction — the render itself belongs to `004`, and nothing here should change
  `ComposeClient.tsx`.
- A body-map category with no data for the current pose hides its trigger rather than
  showing
  an empty state. Discoverability of a category that might exist on some other pose is
  worth
  less than avoiding a dead-end tap in the common case.
- A derived score is explained by a single information affordance opening a short static
  explanation of two to three sentences, describing geometry factors and no numeric
  formula.
  This keeps the explanation consistent with the engine's derived-not-authored stance.
  **[OWNER SIGN-OFF]** the explanation copy itself needs a sign-off pass before it ships.
- Theme sections carry a one-line non-prescriptive subhead rather than a bare emotion
  label,
  because a bare emotion word beside a pose list reads closer to a diagnosis than an
  invitation. **[OWNER SIGN-OFF]** the subhead copy needs a tone pass before it ships.
- Theme browsing will never gain a mood-logging or "how are you feeling" entry point. Mood
  data
  belongs to `005`, and conflating the two would blur which feature owns it.
  **[OWNER SIGN-OFF]** recorded here as a standing exclusion for confirmation, so a future
  contributor does not reopen it as a small tweak.
- No filter facet is promoted from the advanced panel to the always-visible row at launch.
  Promoting on guesswork risks cluttering the primary row for an unmeasured benefit;
  revisit
  once usage data exists.
- The rule that sanctioned diagram hues stay on pose-data badges is enforced by review
  rather
  than by an automated lint at launch. The scoped exception already exists in the
  guardrails,
  and pre-emptive tooling exceeds the single observed risk. Formalize as a lint only if a
  violation actually occurs.
- Favourites and pose notes are user-authored and therefore cloud-resident, requiring
  authentication to write. Pose notes are treated as practice content under Principle
  VIII,
  which is stricter than treating them as ordinary user data, and the stricter reading is
  adopted deliberately.
- Note reconciliation across devices follows whatever offline write rule `004` establishes
  for
  user-authored content. This feature does not define a second, competing rule.
- The already-tracked quick wins on this surface — tightening the diagram's opacity
  transition
  to the motion budget, auditing advanced-panel chip touch targets, and the top-level
  clear-all
  affordance — are implemented against shipped code as part of the relevant story above
  rather
  than tracked as separate requirements.
