# Feature Specification: Sequencing Composer

**Feature Branch**: `004-sequencing-composer`
**Created**: 2026-08-31
**Status**: Draft
**Input**: User description: "The composer and the mat-side read view, specified from `specs/004-sequencing-composer/design-input.md` (17 candidate UX requirements, 12 open decisions, sourced from `docs/design-research/{01,02,03,07,08,09,18,21}`). Flows move from browser-only storage to a normalized server schema with the browser cache demoted to an offline read cache; writes land durably in a local outbox before any network attempt; the monolithic composer client decomposes into per-concern components while preserving the drag-handle and reorder testid contract exactly; validator warnings gain per-item anchors and per-session dismissal; seams gain a hover affordance and a geometry-based tier encoding; phases gain a summed duration, a derived intent tag from `003`'s energetic-direction field, drag-reorder, and a persisted collapse; the read view finally renders breath cues as glyphs and marks the current pose legibly at low brightness; and in-org sharing arrives with author-only content stripped at the data layer, never by the sharing UI. The friction engine and validator-lite stay pure, client-side, and untouched — nothing here may add a database or network dependency to their path (Principle III, RULE-H6)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The read view is legible at arm's length on a mat (Priority: P1)

A teacher props their phone at the edge of the mat, screen dimmed, and practises. Breath
cues
render as the notation glyphs the spec mandates rather than words, and the pose being held
right
now is unmistakable from the rest of the list at low brightness.

**Why this priority**: This is the surface the product exists to be read from, and both
defects
are live in shipped code. Rendering breath cues as text instead of glyphs is the single
highest-priority quick win in the whole research corpus, and a read view where you lose
your
place is a read view you stop using. Neither depends on any other story here.

**Independent Test**: Can be fully tested against the existing read view with no schema,
sync, or
composer work at all: open a flow, dim the screen, and confirm the glyphs render and the
current
item is identifiable.

**Acceptance Scenarios**:

1. **Given** a flow item with an inhale, exhale, or free-breath cue, **When** the read
   view
   renders it, **Then** it renders as the mandated glyph, not as a text string.
2. **Given** a flow item with no breath cue, **When** the read view renders it, **Then**
   no glyph
   and no placeholder text appears.
3. **Given** a flow open in the read view, **When** the practitioner advances through it,
   **Then**
   exactly one item is marked as current at any time.
4. **Given** the current item, **When** the screen is at low brightness, **Then** it is
   distinguishable from its neighbours by a filled background and a size increase.
5. **Given** the current-item treatment, **When** it is inspected, **Then** it introduces
   no
   second accent colour.
6. **Given** the read view, **When** its performance is measured, **Then** it still meets
   the
   established performance budget after these changes.
7. **Given** a flow already in the local cache and no network, **When** the read view is
   opened
   with no account, **Then** it renders fully.

---

### User Story 2 - A write is safe the instant it is made (Priority: P1)

A teacher edits a flow on a train with no signal. The edit is durable immediately —
recorded
locally before any network attempt is made — and syncs later on its own. Nothing spins
forever.
When everything is settled, the interface says nothing at all. When a sync fails
permanently,
they get exactly one non-blocking notice and a retry they choose to press.

**Why this priority**: This is the foundation the whole feature rests on: the move from
browser-only storage to a server source of truth is only safe if the local write is
durable
first. It is also the story that protects the product's core promise that composing works
without connectivity.

**Independent Test**: Can be fully tested by editing with the network disabled, confirming
the
edit survives a reload while still offline, then re-enabling the network and confirming it
syncs
with no user action.

**Acceptance Scenarios**:

1. **Given** an authenticated teacher with no network, **When** they save a flow edit,
   **Then**
   it is recorded durably in the local outbox before any network attempt, and reported as
   saved.
2. **Given** a durable local edit and a reload while still offline, **When** the flow is
   opened,
   **Then** the edit is present.
3. **Given** a non-empty outbox, **When** the network becomes available, **Then** the
   outbox
   flushes without the user taking any action.
4. **Given** a non-empty outbox, **When** the app regains focus, **Then** the outbox
   flushes.
5. **Given** a non-empty outbox and a still-unavailable network, **When** the flush
   interval
   elapses, **Then** a flush is attempted again.
6. **Given** an empty, settled outbox, **When** the interface renders, **Then** no sync
   label,
   spinner, or modal appears anywhere.
7. **Given** a non-empty outbox, **When** the interface renders, **Then** a single small
   sync-state label appears in the global header, and no per-flow indicator is added to
   any list
   item.
8. **Given** a sync that has permanently failed, **When** the interface renders, **Then**
   exactly
   one non-blocking banner appears with a manual retry action, and no automatic retry loop
   runs.
9. **Given** a flow edited on two devices while both were offline, **When** both sync,
   **Then**
   the later write wins and the user is told plainly that an older version synced
   afterwards and
   was replaced.
10. **Given** a signed-in user on a shared device, **When** they sign out, **Then** the
    flow cache
    and the outbox are cleared from local storage, not merely from application state.
11. **Given** a flow already in the local cache, **When** the outbox is failing, **Then**
    reading
    that flow still works, because sync state is never a precondition for a read.

---

### User Story 3 - Sharing a flow cannot leak what the author wrote for themselves
(Priority: P1)

A teacher shares a flow with their organization, or a colleague duplicates it into their
own
library in one click. What crosses the boundary is the structure: poses, order, phases,
durations, breath cues. What does not cross is anything the author wrote for themselves —
notes
and reflections — and that exclusion is enforced where the data is read, not by the
sharing
screen remembering to leave it out.

**Why this priority**: This is the load-bearing privacy requirement of the feature and the
first
time flow data crosses an author boundary at all. A leak here is unrecoverable, and
enforcing the
split in the sharing UI would mean every future caller has to remember it — which is the
failure
mode Principle VIII exists to prevent.

**Independent Test**: Can be fully tested by populating a flow with author-only notes,
sharing
it, and inspecting the payload a recipient can obtain by any route — including a direct
data
request — for the absence of those fields.

**Acceptance Scenarios**:

1. **Given** a flow carrying author-only notes and reflections, **When** it is shared or
   duplicated, **Then** the recipient's copy contains none of those fields.
2. **Given** the shared read path, **When** a reviewer inspects it, **Then** the exclusion
   of
   author-only fields is verifiable from the query and table structure alone, with no
   application-layer conditional required.
3. **Given** a recipient in the same organization, **When** they request the flow's data
   by any
   route other than the sharing screen, **Then** author-only fields are still absent.
4. **Given** a shared flow, **When** a recipient duplicates it, **Then** they get an
   independent
   copy that later edits by the original author do not change.
5. **Given** a duplicated flow, **When** the recipient edits it, **Then** the original is
   unchanged.
6. **Given** a shared flow, **When** the recipient's own notes are added to their copy,
   **Then**
   those are author-only to them and invisible to the original author.
7. **Given** no network, **When** a teacher wants to move a flow to another person,
   **Then** the
   file export and import path still works as a fallback.
8. **Given** an exported file, **When** it is inspected, **Then** it also excludes
   author-only
   content when the export is being produced for sharing.

---

### User Story 4 - The composer can be safely worked on (Priority: P1)

The monolithic composer client is broken into per-concern components. Every existing test
identifier survives unchanged, the drag handle and the up and down reorder buttons remain
sibling
elements in the same row rather than being folded into an overflow menu, and scroll
position
survives a reorder.

**Why this priority**: Every other composer story in this feature adds surface to a file
that is
already too large to change confidently. Doing the decomposition first is what makes the
rest
safe. The sibling-elements rule and the identifier contract are called out because both
are
regressions that have shipped in comparable products.

**Independent Test**: Can be fully tested by running the existing end-to-end suite
unchanged
against the decomposed components, plus a check that reordering a long flow preserves
scroll
position.

**Acceptance Scenarios**:

1. **Given** the decomposed composer, **When** the existing end-to-end suite runs
   unmodified,
   **Then** it passes, because every existing test identifier is unchanged.
2. **Given** a flow item row, **When** its markup is inspected, **Then** the drag handle
   and the
   up and down reorder buttons are sibling elements in that row.
3. **Given** a flow item row, **When** any viewport width is used, **Then** the reorder
   controls
   are never collapsed into an overflow menu.
4. **Given** a flow long enough to scroll, **When** an item is reordered by drag or by
   button,
   **Then** scroll position is preserved.
5. **Given** the decomposition, **When** the friction engine and validator modules are
   inspected,
   **Then** neither has gained a database or network dependency anywhere in its path.
6. **Given** the existing four-state save control, **When** the decomposition is complete,
   **Then** it is preserved as-is with no additional inline save-state text added beside
   the
   title.

---

### User Story 5 - Drag targets and seams are legible mid-interaction (Priority: P2)

A teacher dragging a pose sees a gap open where it will land, rather than guessing from a
faded
row. The seam between two poses looks interactive when the cursor is over it, and how much
friction a seam carries is readable from the geometry of the line itself.

**Why this priority**: These are the interaction-legibility fixes on the composer's
primary
manipulation. They are P2 because reordering works today — this makes it predictable
rather than
possible.

**Independent Test**: Can be fully tested by dragging a row and observing the insertion
preview,
and by comparing seams of different friction magnitudes side by side.

**Acceptance Scenarios**:

1. **Given** an in-flight drag, **When** the pointer is between two rows, **Then** a
   visible
   insertion gap opens at that position, not merely a change in the dragged row's opacity.
2. **Given** the insertion preview, **When** it animates, **Then** it completes within the
   motion
   budget and does not bounce.
3. **Given** a seam boundary, **When** the pointer is over it, **Then** a hover affordance
   indicates it is interactive, and its explanatory text is reachable.
4. **Given** seams of differing friction magnitude, **When** they are compared, **Then**
   the tier
   is encoded by line length and width progression rather than by height alone.
5. **Given** a seam at the highest tier, **When** it renders, **Then** the surrounding row
   gap is
   increased.
6. **Given** an adjacent pose pair whose friction score is at the floor, **When** the
   composer
   renders, **Then** a seam element is still present for that pair, so every adjacent pair
   has a
   stable node.
7. **Given** the seam encoding, **When** it renders on a long flow, **Then** the motion
   budget is
   still met, because the encoding is line-based and requires no shape redraw.

---

### User Story 6 - Warnings point at what they are about, and can be set aside (Priority:
P2)

A teacher who deliberately ends a flow on a non-stillness pose is told once, sees a marker
beside
the row the note concerns, dismisses it, and is not shown it again for the rest of that
session.
Next session, it is back — because it is advice, not a resolved task.

**Why this priority**: An advisory that cannot be dismissed becomes an advisory that gets
ignored,
and a flat list of warnings above the flow makes the reader hunt for what each one refers
to. It
is P2 because the warnings are correct today and this makes them usable.

**Independent Test**: Can be fully tested by composing a flow that triggers each warning,
confirming a marker appears at the right row, dismissing it, and confirming it stays gone
until a
new session.

**Acceptance Scenarios**:

1. **Given** a flow triggering a validator warning, **When** the composer renders,
   **Then** a
   marker is anchored to the flow item the warning concerns.
2. **Given** an anchored warning, **When** the teacher dismisses it, **Then** it is not
   shown
   again for the remainder of the session.
3. **Given** a dismissed warning, **When** a new session begins, **Then** it is shown
   again,
   because the dismissal was not persisted.
4. **Given** a dismissed warning, **When** the underlying condition changes and re-occurs
   at a
   different item, **Then** it is shown for that item.
5. **Given** any warning, **When** it is shown, **Then** it never blocks saving,
   exporting, or
   reading the flow.
6. **Given** the dismissal and anchoring behaviour, **When** the validator module is
   inspected,
   **Then** it is unchanged — the behaviour is presentation-layer filtering over its
   existing
   typed output.

---

### User Story 7 - The phase arc says something (Priority: P2)

A teacher looks at a phase header and sees how long that phase runs and what it is doing
energetically — reducing, building, or balancing — derived from the pose data rather than
typed by
hand. Phases can be dragged into a different order and folded to a bar, and a fold stays
folded
after a reload.

**Why this priority**: The phase structure currently exists as a container with no
summary, which
is the substantive gap the research identified in the original spec. It is P2 because
flows
compose fine without it, and it depends on `003` shipping the energetic-direction field.

**Independent Test**: Can be fully tested by building a multi-phase flow, checking each
header's
duration and intent tag against the underlying pose data, reordering phases, and
confirming a
collapse survives a reload.

**Acceptance Scenarios**:

1. **Given** a phase containing items with durations, **When** its header renders in the
   composer
   and in the read view, **Then** it shows the summed duration in both.
2. **Given** a phase whose items carry energetic directions, **When** its header renders,
   **Then** it shows a derived intent tag, computed from that data rather than authored by
   hand.
3. **Given** a phase whose items carry no energetic direction, **When** its header
   renders,
   **Then** no intent tag is shown, and no placeholder is invented.
4. **Given** a flow with several phases, **When** a phase is dragged, **Then** the whole
   phase and
   its items move together to the new position.
5. **Given** a phase, **When** it is collapsed, **Then** it folds to a bar showing at
   least its
   name and summed duration.
6. **Given** a collapsed phase, **When** the flow is reloaded, **Then** it is still
   collapsed.
7. **Given** two flows, **When** one's phases are collapsed, **Then** the other flow's
   phases are
   unaffected, because collapse state is keyed per flow.

---

### User Story 8 - Depth escalates in place, without leaving the flow (Priority: P3)

A teacher building a flow taps an item to reveal its cue, taps again for its full
geometry, all
without leaving the composer — the same escalation the pose detail view already offers, in
a
row-width container.

**Why this priority**: This closes the composer half of the progressive-depth pattern, so
the
interaction language is consistent across the two surfaces. It is P3 because the pose
detail view
already provides the information; this saves a round trip rather than unlocking anything
new.

**Independent Test**: Can be fully tested by tapping an item in the composer through each
depth
level and confirming the behaviour and timing match the pose detail view's escalation.

**Acceptance Scenarios**:

1. **Given** a flow item in the composer, **When** it is tapped, **Then** its next depth
   level is
   revealed inline without navigating away.
2. **Given** the escalation at any level, **When** it animates, **Then** it completes
   within the
   motion budget and does not bounce.
3. **Given** the composer escalation and the pose detail escalation, **When** both are
   compared,
   **Then** they behave identically and share the same underlying implementation.
4. **Given** an escalated item, **When** a drag is started, **Then** the escalation does
   not
   interfere with the drag or the reorder controls.

---

### Edge Cases

- What happens when a durable local edit exists for a flow that was deleted on the server?
  The
  user must be told rather than having their work silently discarded or silently
  resurrected.
- What happens when the outbox contains many edits to the same flow? Flushing must
  converge on
  the final intended state rather than replaying a sequence that briefly shows wrong
  content.
- What happens when an outbox entry can never succeed — a rejected payload rather than a
  connectivity problem? It must move to a dead-letter state and surface once, not retry
  forever.
- What happens when the local outbox cannot be written to at all, because storage is
  unavailable
  or full? The user must not be told the edit is saved.
- What happens when a user signs out while the outbox is non-empty? Unsynced work must not
  be
  silently destroyed by the cache clear, and a shared device must still not leak it to the
  next
  signer-in.
- What happens when two devices reorder the same flow differently while offline? The
  last-writer-wins disclosure must name the flow, not just report that something was
  replaced.
- What happens when a recipient duplicates a shared flow that references a pose no longer
  in the
  library? The copy must degrade legibly rather than failing to open.
- What happens when a shared flow's author later revokes sharing? Existing independent
  duplicates
  are unaffected by design; that must be stated in the sharing copy rather than implied.
- What happens when an imported file claims fields that do not exist, or omits required
  ones? The
  import must reject with a stated reason rather than partially applying.
- What happens when a drag is cancelled mid-flight, or the pointer leaves the list? The
  insertion
  preview must close and the order must be unchanged.
- What happens when a flow has exactly one item? There is no adjacent pair and therefore
  no seam;
  the layout must not leave a stranded seam node or gap.
- What happens when a phase is empty? Its summed duration is zero and it has no intent
  tag; the
  header must read as an empty phase rather than a broken one.
- What happens when a warning's anchor item is deleted while the warning is displayed? The
  marker
  must not point at the wrong row.
- What happens when the read view's current item is deleted or reordered from another
  device? The
  current marker must land somewhere sensible rather than disappearing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The read view MUST render breath cues as the mandated notation glyphs, not
  as text
  strings, and MUST render nothing when an item has no breath cue.
- **FR-002**: The read view MUST mark exactly one item as current at any time.
- **FR-003**: The current item MUST be distinguishable from its neighbours at low screen
  brightness by a filled background together with a size increase.
- **FR-004**: The current-item treatment MUST NOT introduce a second accent colour.
- **FR-005**: The read view MUST continue to meet the established performance budget after
  all
  changes in this feature.
- **FR-006**: Reading a flow already in the local cache MUST work with no network and no
  account.
- **FR-007**: A flow edit MUST be recorded durably in a local outbox before any network
  attempt
  is made, and only then reported to the user as saved.
- **FR-008**: An edit that could not be recorded durably MUST NOT be reported as saved.
- **FR-009**: Each flow MUST carry a sync state distinguishing synced, pending, and
  failed.
- **FR-010**: The outbox MUST flush when connectivity is regained, when the app regains
  focus,
  and on a recurring interval.
- **FR-011**: When the outbox is empty and settled, the interface MUST render no sync
  label,
  spinner, or modal.
- **FR-012**: When the outbox is non-empty, a single small sync-state label MUST appear in
  the
  global header, and no per-flow sync indicator may be added to list items.
- **FR-013**: The sync-state label MUST NOT poll visibly, so the read view's performance
  budget
  is preserved.
- **FR-014**: Sync state MUST never be a precondition for reading a cached flow.
- **FR-015**: A permanent sync failure MUST produce exactly one non-blocking banner with a
  manual
  retry action, and MUST NOT trigger an automatic retry loop.
- **FR-016**: An outbox entry that can never succeed MUST move to a dead-letter state and
  surface
  once, rather than retrying indefinitely.
- **FR-017**: Flushing several queued edits to the same flow MUST converge on the final
  intended
  state.
- **FR-018**: When the same flow was edited on two devices while offline, the later write
  MUST
  win, and the user MUST be told plainly, by flow name, that an older version synced
  afterwards
  and was replaced.
- **FR-019**: A durable local edit to a flow that no longer exists on the server MUST be
  surfaced
  to the user rather than silently discarded or silently recreated.
- **FR-020**: Signing out MUST clear the flow cache and the outbox from local storage, not
  only
  from application state.
- **FR-021**: Signing out with a non-empty outbox MUST NOT silently destroy unsynced work,
  and
  MUST still leave nothing readable to the next person who signs in on that device.
- **FR-022**: Author-only content fields MUST be excluded from any payload that crosses
  the
  author boundary, enforced at the table and query layer.
- **FR-023**: The exclusion in FR-022 MUST be verifiable by inspecting the schema and
  query
  alone, with no application-layer conditional required.
- **FR-024**: No route available to a recipient — including a direct data request — may
  return
  another account's author-only flow content.
- **FR-025**: Sharing a flow within an organization or cohort MUST offer a one-click
  duplicate
  producing an independent copy, unaffected by the original author's later edits.
- **FR-026**: A recipient's edits to their duplicate MUST NOT affect the original.
- **FR-027**: A recipient's own author-only content on their duplicate MUST be invisible
  to the
  original author.
- **FR-028**: File export and import MUST be retained as an offline fallback path and MUST
  NOT
  become the only sharing path.
- **FR-029**: An export produced for sharing MUST exclude author-only content.
- **FR-030**: An import missing required fields or carrying unknown ones MUST be rejected
  with a
  stated reason, and MUST NOT partially apply.
- **FR-031**: A duplicate referencing a pose no longer in the library MUST degrade legibly
  rather
  than failing to open.
- **FR-032**: Sharing copy MUST state that existing independent duplicates are unaffected
  when
  sharing is later revoked.
- **FR-033**: The composer decomposition MUST preserve every existing test identifier
  unchanged.
- **FR-034**: The drag handle and the up and down reorder buttons MUST remain sibling
  elements in
  the same row markup at every viewport width, and MUST NOT be collapsed into an overflow
  menu.
- **FR-035**: Scroll position MUST be preserved across a reorder performed by drag or by
  button.
- **FR-036**: Nothing in this feature may add a database or network dependency to the
  friction
  engine's or the validator's path.
- **FR-037**: The existing four-state save control MUST be preserved, and no additional
  inline
  save-state text may be added beside the flow title.
- **FR-038**: An in-flight drag MUST show a visible insertion gap at the prospective drop
  position, not merely a change in the dragged row's opacity.
- **FR-039**: A cancelled drag MUST close the insertion preview and leave the order
  unchanged.
- **FR-040**: A seam boundary MUST expose a hover affordance indicating it is interactive,
  with
  its explanatory text reachable.
- **FR-041**: Seam tier MUST be encoded by line length and width progression rather than
  by
  height alone, with an increased row gap at the highest tier.
- **FR-042**: A seam element MUST be rendered for every adjacent pose pair, including
  pairs whose
  friction score is at the floor, so every adjacent pair has a stable node.
- **FR-043**: A flow with a single item MUST render no seam and no stranded gap.
- **FR-044**: Every validator warning MUST be anchored to the flow item it concerns.
- **FR-045**: A validator warning MUST be dismissible for the remainder of the session,
  and the
  dismissal MUST NOT persist across sessions.
- **FR-046**: A warning whose anchor item is deleted MUST NOT point at a different row.
- **FR-047**: No validator warning may block saving, exporting, or reading a flow.
- **FR-048**: The anchoring and dismissal behaviour MUST be implemented as
  presentation-layer
  filtering over the validator's existing typed output, leaving the validator module
  unchanged.
- **FR-049**: Every phase header MUST show the summed duration of its items, in both the
  composer
  and the read view.
- **FR-050**: Every phase header MUST show a derived energetic intent tag computed from
  its items'
  energetic-direction data, and MUST show none when that data is absent rather than
  inventing a
  placeholder.
- **FR-051**: Phases MUST support drag-reorder, moving the phase and its items together.
- **FR-052**: A phase MUST support collapsing to a bar showing at least its name and
  summed
  duration.
- **FR-053**: A phase's collapse state MUST persist across a reload and MUST be keyed per
  flow, so
  one flow's collapse state cannot become another's default.
- **FR-054**: An empty phase MUST render as an empty phase with a zero duration and no
  intent tag,
  rather than as a broken header.
- **FR-055**: A composer flow item MUST support inline depth escalation revealing its cue
  and then
  its full geometry without navigating away.
- **FR-056**: The composer's depth escalation MUST share its underlying implementation
  with the
  pose detail view's escalation, adapted to a row-width container.
- **FR-057**: An escalated item MUST NOT interfere with dragging or with the reorder
  controls.
- **FR-058**: Every new or changed interaction in this feature MUST complete within the
  established motion budget and MUST NOT bounce.

### Key Entities *(include if feature involves data)*

- **Flow**: A composed sequence, now server-resident and normalized rather than a single
  local
  record. Carries structure that may cross an author boundary and author-only content that
  may
  not.
- **Flow Item**: One pose placement in a flow, carrying duration, breath cue, optional
  author-only notes, and a position.
- **Phase**: An ordered grouping of flow items, carrying a name, a summed duration derived
  from
  its items, a derived energetic intent tag, a position, and a per-flow collapse state.
- **Seam**: The boundary between two adjacent flow items, carrying a friction tier derived
  client-side by the pure engine. Present for every adjacent pair regardless of magnitude.
- **Validator Warning**: One advisory produced by the pure validator, anchored to a flow
  item,
  dismissible for the session only, never blocking.
- **Outbox Entry**: A durably recorded pending write, carrying enough state to flush
  later, to
  converge when several target one flow, and to dead-letter when it can never succeed.
- **Sync State**: A per-flow status of synced, pending, or failed, surfaced only in
  aggregate and
  only when unsettled.
- **Local Cache**: The offline read copy of flows. Readable with no account and no
  network,
  cleared on sign-out along with the outbox.
- **Shared Flow**: A flow made visible within an organization or cohort, exposing
  structure only.
- **Duplicate**: An independent copy of a shared flow in a recipient's own library,
  decoupled
  from the original in both directions.
- **Author-Only Content**: Notes and reflections belonging to the author of the record
  they sit
  on. Excluded structurally from anything crossing the author boundary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of breath cues in the read view render as glyphs, with zero text-string
  renderings remaining.
- **SC-002**: A practitioner can identify the current item in the read view at low
  brightness on
  first look, with exactly one item marked current at all times.
- **SC-003**: The read view meets its performance budget after this feature's changes,
  measured
  rather than assumed, with zero new accent colours introduced.
- **SC-004**: 100% of flow edits made offline survive a reload while still offline, and
  100%
  sync without user action once connectivity returns.
- **SC-005**: Zero sync labels, spinners, or modals render when the outbox is empty.
- **SC-006**: A permanent sync failure produces exactly one banner and zero automatic
  retries.
- **SC-007**: Zero flow-cache or outbox records remain readable on the device after
  sign-out.
- **SC-008**: Zero author-only fields appear in any payload crossing an author boundary,
  verified
  by automated tests over every recipient-accessible route, not only the sharing screen.
- **SC-009**: A reviewer can confirm the author-only exclusion by reading the schema and
  query
  alone, with zero application-layer conditionals load-bearing for it.
- **SC-010**: Moving a flow to a colleague takes one interaction on the sharing path, and
  the
  file fallback path remains available with zero network dependency.
- **SC-011**: The existing end-to-end suite passes unmodified against the decomposed
  composer,
  with zero test identifiers renamed or removed.
- **SC-012**: The drag handle and reorder buttons remain siblings in the same row at 100%
  of
  tested viewport widths, with zero overflow-menu collapses.
- **SC-013**: Zero database or network references exist anywhere in the friction engine's
  or
  validator's dependency path, asserted automatically.
- **SC-014**: Every adjacent pose pair has a stable seam node — the seam count always
  equals the
  item count minus one, and never less.
- **SC-015**: 100% of validator warnings are anchored to the item they concern, and zero
  warnings
  block a save, export, or read.
- **SC-016**: A dismissed warning appears zero times for the rest of the session and
  reappears in
  the next one.
- **SC-017**: 100% of phase headers show a summed duration in both the composer and the
  read view,
  and 100% of phases whose items carry energetic-direction data show a derived intent tag.
- **SC-018**: A phase collapsed before a reload is still collapsed after it, in 100% of
  cases,
  with zero cross-flow leakage of collapse state.
- **SC-019**: Every new or changed interaction completes within the motion budget with
  zero
  bounce, measured rather than assumed.

## Assumptions

- Every adjacent pose pair keeps a rendered seam element even at the friction floor.
  Suppressing
  it would remove a stable node the test-identifier contract assumes exists for every
  pair, and
  the tier encoding already communicates that a seam carries little.
- Seam magnitude stays line-based. A curve or waveform visualization risks exceeding the
  motion
  budget on longer flows for a small legibility gain.
- Validator-lite does not gain a third, lower-weight advisory tier. Tiering before a third
  check
  actually exists would likely introduce a second semantic colour with no real use case
  behind
  it; revisit when a third check is proposed.
- The advisory-versus-error colour split on the shared warning treatment is treated as a
  real
  accent-colour exception requiring sign-off, not a quiet style tweak — the same treatment
  currently serves both an advisory craft note and a save error.
  **[OWNER SIGN-OFF]** this needs review against `docs/krama-guardrails.md` before
  implementation; the spec is written so the split is optional and the feature ships
  without it.
- Composer scroll position is preserved across a reorder. Losing it would be a regression
  the
  moment flows grow past one screen, and it is cheap to guard with a smoke test.
- No ambient inline save-state string is added beside the flow title. The existing
  four-state
  save control already exceeds the researched exemplars, and a second text element adds
  chrome to
  a typography-first layout.
- Sync state is surfaced as one global header state, not a per-flow pill. Per-flow is more
  informative but adds render surface to every list item against the performance budget,
  and
  flows are not collaborative enough to need that granularity.
- Offline conflicts resolve last-writer-wins with a visible disclosure naming the flow.
  Flows are
  single-author objects, so a full conflict-copy interface is disproportionate; the
  load-bearing
  requirement is disclosure rather than silence, not a merge interface.
- Sharing launches as structure-only duplication with no named permission levels. The safe
  default is that a recipient can read and duplicate structure and never author-only
  content,
  which is enforced at the data layer regardless of the link model, so permission levels
  can be
  added later without a data-layer change.
- The current item in the read view is marked with a subtle filled background plus a size
  increase. A border-only treatment risks being invisible at low mat-side brightness, and
  a
  colour-based treatment would need a second accent.
- Phase collapse state persists per flow, keyed by flow identity, in local browser
  storage.
  Re-collapsing a long flow's phases on every reload would recreate the annoyance the
  pattern
  exists to remove, and per-flow keying stops one flow's state becoming another's default.
- The composer's inline depth escalation reuses the pose detail view's component with a
  row-width layout mode. Two independent implementations of the same interaction would
  drift in
  behaviour and timing.
- The derived phase intent tag depends on `003` shipping the energetic-direction field.
  **[DEPENDENCY: 003]** Until it lands, phase headers show a summed duration and no intent
  tag —
  which FR-050 already requires as the absent-data behaviour, so this story is not
  blocked, only
  partially realized.
- The already-tracked quick wins on this surface — breath glyphs, the summed-duration
  badge, and
  preserving the drag-handle and reorder identifier contract through the decomposition —
  are
  delivered inside their respective stories above rather than tracked separately. The
  existing
  four-state save control is recorded here as a strength to preserve, not a thing to
  change.
