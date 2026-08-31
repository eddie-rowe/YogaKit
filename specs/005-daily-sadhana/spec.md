# Feature Specification: Daily Sadhana

**Feature Branch**: `005-daily-sadhana`
**Created**: 2026-08-31
**Status**: Draft
**Input**: User description: "The practice-over-time surface, specified from `specs/005-daily-sadhana/design-input.md` (19 candidate UX requirements, 13 open decisions, sourced from `docs/design-research/{10,11,12,13,14,15,20}`). Covers a versioned append-only intention; a self-reported, timezone-keyed daily check-in with one-tap mood and optional note; a streak that pauses rather than resets, with a calm grace budget and rest as a first-class recordable state; milestones as one-time invitations rather than defensible badges; return rituals that quote the intention active when the lapse began and offer the smallest possible re-entry; a trigger-gated guidance corpus that renders at most one card and keeps no backlog; the per-enrollment cohort signal-sharing control, revocable in one interaction from the practice screen; the certifying body's dashboard, which may see practice signals and structurally cannot see practice content; and the collapse of five navigation tabs to three, making Today the home screen and retiring five test identifiers in the same commit as the change. Every string in this feature is subject to the Principle VII copy-lint, which is continuous-integration gating rather than optional review."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Checking in takes one tap and states who can see it (Priority: P1)

A practitioner finishes practising, opens Today, and taps one of a handful of mood icons.
That
is the whole required interaction. Duration fills itself in from the flow they just
finished when
there was one. A note and a link to the flow are there if they want them, secondary to the
mood.
Right beside the fields, permanently, it says that only they can see this.

**Why this priority**: Everything else in this feature is computed from check-ins, so
nothing
works until this does. The privacy microcopy is beside it rather than in settings because
a
promise the user has to go looking for is a promise they have to take on faith at the
moment they
are typing.

**Independent Test**: Can be fully tested with no streak, guidance, sharing, or dashboard
work:
check in, confirm one tap sufficed, confirm the microcopy is present beside the fields,
and
confirm a second account cannot read the note.

**Acceptance Scenarios**:

1. **Given** a practitioner on Today, **When** they tap a mood icon, **Then** the check-in
   is
   recorded for their local day with no further interaction required.
2. **Given** the mood selector, **When** it renders, **Then** it offers between three and
   five
   discrete icons and no continuous slider.
3. **Given** a practitioner who has just completed a flow, **When** they check in,
   **Then**
   duration is filled in from that flow and remains editable.
4. **Given** the check-in fields, **When** they render, **Then** the note and flow link
   are
   visually secondary to mood, and both are optional.
5. **Given** the check-in fields, **When** they render, **Then** microcopy stating that
   only the
   practitioner can see this is permanently visible beside them, not behind a link.
6. **Given** a recorded check-in with a note, **When** any other account attempts to read
   it by
   any route, **Then** they receive nothing, refused at the table layer.
7. **Given** a practitioner who finished practising just after midnight, **When** they
   check in,
   **Then** the check-in is attributed to the local day the action occurs on, and a single
   affordance to log it for the previous day is available within a short window.
8. **Given** that affordance, **When** the window has passed or a newer check-in exists,
   **Then**
   it is no longer offered, and no free-form date entry exists anywhere.
9. **Given** a practitioner in a timezone different from the one they last checked in
   from,
   **When** they check in, **Then** the local day is computed from their current timezone.

---

### User Story 2 - The record of practice never turns into a debt (Priority: P1)

A practitioner sees one number for their practice, and it only ever goes up or holds.
There is no
colour that means their practice is in danger and nothing counting down. Rest is something
they
can record with one tap, weighted exactly the same as recording a practice. Grace days are
there
when they want to look, and never announce themselves on the home screen. Reaching ten,
thirty,
or ninety practices is acknowledged once, with an invitation forward.

**Why this priority**: This is the feature's primary constitutional surface. RULE-C1 and
RULE-C2
make the always-positive number and the absence of pressure copy hard requirements rather
than
style preferences, and getting this wrong would make the product something other than what
it
is.

**Independent Test**: Can be fully tested by generating check-in histories with gaps of
varying
length and confirming the displayed number never decreases, that rest logs as a distinct
state,
and that no screen contains a countdown, a warning colour, or a missed-day count.

**Acceptance Scenarios**:

1. **Given** any check-in history including long gaps, **When** the streak is displayed,
   **Then**
   it is a single number that has never decreased and never shows zero after a first
   practice.
2. **Given** any streak state, **When** it renders, **Then** it uses no warning colour
   state and
   displays no countdown to anything.
3. **Given** a practitioner on Today, **When** they log rest, **Then** it is one tap, and
   the
   control has the same visual weight as logging practice — neither smaller nor
   de-emphasized.
4. **Given** a day, **When** the practitioner records nothing at all, **Then** that day is
   silently absent: it renders no calendar chip and produces no notice of any kind.
5. **Given** the three practice states, **When** the calendar renders, **Then** only
   practised and
   rested days render chips.
6. **Given** the grace budget, **When** Today renders, **Then** it is not shown there.
7. **Given** the grace budget, **When** the practitioner opens the streak detail, **Then**
   it is
   stated calmly with how much remains in the period.
8. **Given** the grace budget's size, **When** it is inspected, **Then** the number is
   stored as
   data rather than written into user-facing prose.
9. **Given** a practitioner reaching a milestone count, **When** it is reached, **Then** a
   card is
   shown once, congratulating them and inviting them forward.
10. **Given** a milestone card, **When** it renders, **Then** it offers nothing to defend,
    protect, maintain, or lose, and offers no purchase.
11. **Given** any string in this feature, **When** the copy-lint runs in continuous
    integration,
    **Then** it passes, and a deliberately introduced coercive phrase fails the build.

---

### User Story 3 - Coming back reads as a return, not a reckoning (Priority: P1)

A practitioner who has not practised for a while opens Today and sees a plain statement of
how
long it has been, the intention they wrote in their own words as it stood when the gap
began, and
two equally weighted choices: keep this why, or update it. If they want to practise, the
offer is
the smallest thing that counts — one pose, one breath cycle. Nothing anywhere suggests
catching
up. And they can simply say they are resting, not stopping.

**Why this priority**: The moment of return is where this product either earns its stance
or
abandons it. It is P1 because a lapse-handling surface that lands wrong does more harm
than not
having one, and because the versioned intention it quotes has to be designed before any
intention is written, not retrofitted afterwards.

**Independent Test**: Can be fully tested by writing an intention, revising it, simulating
a gap
that began before the revision, and confirming the card quotes the earlier version and
offers the
three responses.

**Acceptance Scenarios**:

1. **Given** a practitioner writing their intention, **When** they later revise it,
   **Then** both
   versions are retained, and no version is overwritten or deleted.
2. **Given** a lapse that began before the most recent revision, **When** the return card
   renders,
   **Then** it quotes the version that was active when the lapse began.
3. **Given** a lapse reaching the declared threshold, **When** Today renders, **Then** the
   return
   card states the elapsed time plainly.
4. **Given** the return card, **When** it renders, **Then** it offers keeping the
   intention and
   updating it as two flat actions of equal visual weight, neither styled as a warning.
5. **Given** the return card, **When** it renders, **Then** it also offers a response
   stating the
   practitioner is resting rather than stopping, so the card is never a choice between
   practising
   and ignoring it.
6. **Given** that response is chosen, **When** it is recorded, **Then** the card is not
   shown
   again immediately, and nothing is framed as a lapse.
7. **Given** the re-entry offer, **When** it renders, **Then** it proposes the smallest
   unit the
   pose model supports, drawn from the intention's original flow.
8. **Given** the return card and its re-entry offer, **When** every string is read,
   **Then** none
   proposes catching up, none counts missed days, and none shows a reset to zero.
9. **Given** a practitioner with no intention recorded at all, **When** a gap occurs,
   **Then** no
   return card quoting an intention is shown, and nothing is invented in its place.

---

### User Story 4 - Sharing practice signals is visible, per-cohort, and one tap to end
(Priority: P1)

A practitioner enrolled with a certifying body sees, on Today, that they are sharing with
that
organization by name. Tapping it says exactly what is shared, in plain words, before
offering one
action to stop. If they belong to two organizations, there are two controls, not one
switch
governing both. Stopping takes effect immediately, with a brief chance to undo, and
nothing
blocks them on the way.

**Why this priority**: A persistent visibility grant the person cannot see is not consent,
and
RULE-V3 and RULE-V6 require the revoke control within one interaction of the primary
practice
screen. It is P1 because the dashboard in the next story is only defensible if this
control
exists first.

**Independent Test**: Can be fully tested by enrolling one account in two organizations,
confirming two independent controls, revoking one, and confirming the other is unaffected
and the
revoked one is durably off.

**Acceptance Scenarios**:

1. **Given** an active enrollment with sharing on, **When** Today renders, **Then** a pill
   naming
   that organization is visible.
2. **Given** that pill, **When** it is tapped, **Then** a sheet lists exactly what is
   shared, in
   plain language, before offering a single action to stop sharing with that organization
   by name.
3. **Given** a practitioner enrolled in two organizations, **When** Today renders,
   **Then** there
   is one control per enrollment and no single global sharing switch.
4. **Given** two enrollments, **When** sharing is stopped for one, **Then** the other is
   unaffected.
5. **Given** the stop action, **When** it is taken, **Then** it takes effect as a direct
   single
   write, with no intermediate hidden or derived permission state.
6. **Given** the stop action, **When** it is taken, **Then** no blocking confirmation
   dialog
   appears, and a brief undo is offered instead.
7. **Given** the undo window has passed, **When** the dashboard is queried, **Then** that
   practitioner's signals are no longer returned to that organization.
8. **Given** sharing has been stopped, **When** any subsequent event occurs, **Then** it
   does not
   come back on without an explicit named grant.

---

### User Story 5 - A cohort teacher can see signals and structurally cannot see content
(Priority: P1)

A teacher at a certifying body opens their cohort dashboard and sees, per student, their
name, a
plainly worded status, their streak, days since their last check-in, and milestone
progress. There
is a line at the top of the page saying that this is signals only and that journals and
reflections are private to each student. The reason they cannot see a reflection is not
that it is
hidden — it is that no query in this surface can reach it.

**Why this priority**: This is the commercial reason the certifying body pays, and the
single
place where the content-and-signal split is load-bearing against a real adversary with
real
credentials. It is P1 because the boundary must be provable before the surface exists, not
after.

**Independent Test**: Can be fully tested by running a query with a cohort teacher's
credentials
directly against the practice-content tables for an enrolled student and confirming it
returns
nothing or is refused.

**Acceptance Scenarios**:

1. **Given** a cohort teacher, **When** the dashboard renders, **Then** each student row
   shows
   name, status, streak state, days since last check-in, and milestone progress.
2. **Given** the status pill, **When** it renders, **Then** it uses plain non-punitive
   vocabulary
   and no warning colour.
3. **Given** the dashboard component, **When** its data access is inspected, **Then** no
   note,
   mood, journal, or reflection field is requested at all — the exclusion is structural,
   not a
   matter of hiding a returned value.
4. **Given** a cohort teacher's credentials, **When** a query is issued directly against
   the
   practice-content tables for an enrolled student, **Then** it returns zero rows or is
   refused,
   asserted by a test that runs in continuous integration.
5. **Given** the dashboard, **When** it renders, **Then** a persistent one-line caption
   states the
   boundary in plain language.
6. **Given** a student who has stopped sharing, **When** the dashboard renders, **Then**
   their
   signals are absent, and their absence is not itself reported as a status.
7. **Given** a derived practised-today signal, **When** it is produced, **Then** it is a
   boolean
   derived from a check-in existing, never from anything the check-in contains.
8. **Given** a student in two cohorts, **When** each teacher views their dashboard,
   **Then** each
   sees only what that enrollment's sharing state permits.

---

### User Story 6 - Guidance arrives once, one card at a time (Priority: P2)

At a meaningful moment — a first flow saved, a stretch of consistent practice, a long gap
— Today
shows a single guidance card. Never two. Never a list. It is not waiting in an inbox, it
carries
no unread count, and once it has been seen or set aside it is done. A later moment may
bring a
different card; it never brings a backlog.

**Why this priority**: Guidance that queues becomes an obligation, which is the opposite
of what
it is for. It is P2 because the check-in, the streak, and the return ritual all function
without
it, and it depends on the trigger vocabulary those stories establish.

**Independent Test**: Can be fully tested by firing several triggers at once and
confirming
exactly one card renders, selected by its authored priority, and that dismissing it
consumes the
trigger with no queue left behind.

**Acceptance Scenarios**:

1. **Given** a guidance entry, **When** its definition is inspected, **Then** it is gated
   on
   exactly one named trigger.
2. **Given** several triggers firing at once, **When** Today renders, **Then** exactly one
   guidance card is shown, chosen by an authored static priority.
3. **Given** the guidance corpus, **When** continuous integration runs, **Then** every
   entry's
   trigger and priority are validated, and a missing or duplicate priority fails the
   build.
4. **Given** a guidance card, **When** it is shown or set aside, **Then** its trigger is
   consumed
   and it is not queued for later.
5. **Given** a consumed trigger, **When** another trigger later fires, **Then** a
   different card
   may appear, and no backlog of earlier cards ever appears.
6. **Given** any guidance card, **When** it renders, **Then** it carries no unread badge
   and no
   count.
7. **Given** a gap-triggered guidance card, **When** its copy is read, **Then** it gives
   one clear
   next action, counts no missed days, and shows no reset to zero.
8. **Given** the guidance corpus, **When** it is inspected, **Then** it is not exposed as
   a
   browsable library, and no navigation entry leads to one.

---

### User Story 7 - Today is the home screen (Priority: P2)

The primary navigation carries three destinations — Today, Teach, Poses — with composing
and the
flow library merged under Teach, and the account avatar as a standalone header element
rather than
a fourth tab. Everything that navigation touches, including the tests that walk it,
changes in one
commit.

**Why this priority**: The navigation restructure is what makes Today the app's home
rather than
one tab among five, and it is the change other stories' entry points assume. It is P2
because the
stories above deliver value at their current locations, and because this change retires
five test
identifiers and so wants the rest of the feature settled first.

**Independent Test**: Can be fully tested by walking the navigation and confirming three
tabs,
that composing and the flow library are both reachable under Teach, and that the
end-to-end walk
tests pass in the same commit.

**Acceptance Scenarios**:

1. **Given** the primary navigation, **When** it renders, **Then** it has exactly three
   destinations: Today, Teach, and Poses.
2. **Given** the Teach destination, **When** it is opened, **Then** both composing and the
   flow
   library are reachable from it.
3. **Given** the header, **When** it renders, **Then** the account avatar is a standalone
   element
   rather than a fourth navigation entry.
4. **Given** the avatar, **When** its touch target is measured, **Then** it meets the same
   minimum
   as the navigation tabs.
5. **Given** a practitioner who has set no profile image, **When** the avatar renders,
   **Then** it
   shows an initials-based placeholder rather than a blank or broken image.
6. **Given** the retired navigation test identifiers, **When** the change lands, **Then**
   the
   identifier contract table and every affected end-to-end walk test are updated in the
   same
   commit.
7. **Given** the previously separate learning route, **When** the change lands, **Then**
   it no
   longer exists as a route, and its content is surfaced from Today.
8. **Given** any previously bookmarked retired route, **When** it is opened, **Then** it
   resolves
   to its new location rather than erroring.

---

### Edge Cases

- What happens when a practitioner checks in twice on the same local day? The second must
  update
  the first rather than creating a second day or advancing the count twice.
- What happens when a practitioner logs rest and then practises on the same day?
  Practising
  should take precedence, and the day should not be double-counted.
- What happens when a practitioner crosses a date boundary mid-interaction while the
  check-in
  sheet is open? The attributed day must be decided at submission, not at open, and must
  be
  legible to the practitioner.
- What happens when a practitioner travels across many timezones and their local day is
  ambiguous? Only one day may be recorded, and the rule must be consistent rather than
  producing
  a gap or a duplicate.
- What happens when there is no network at check-in time? The practitioner should not lose
  the
  check-in, and nothing should report a state the server does not hold.
- What happens when a practitioner has practised every day since they started? The grace
  budget
  detail must read sensibly when nothing has been used.
- What happens when the grace budget is exhausted within a period? Nothing may announce
  this on
  Today, and nothing may frame it as a consequence.
- What happens when a practitioner reaches two milestones in one day? Only one card should
  be
  shown at a time, and neither should be lost.
- What happens when a practitioner revises their intention during a lapse? The card must
  still
  quote the version active when the lapse began, not the newest one.
- What happens when a lapse threshold is changed by the practitioner while a lapse is in
  progress?
  The card must follow the new threshold without re-showing something already answered.
- What happens when a guidance entry's authored priority collides with another's?
  Continuous
  integration must catch it, since a runtime tie would resolve arbitrarily.
- What happens when a student's enrollment ends while a teacher's dashboard is open? Their
  row
  must stop being returned on the next query rather than persisting from a cached render.
- What happens when a student stops sharing and the teacher is mid-session? The teacher
  must not
  retain access to signals through a stale session.
- What happens when an organization has students who have all stopped sharing? The
  dashboard must
  read as an empty dashboard, and must not report the absences as statuses.
- What happens when the practitioner belongs to an organization but has no active
  enrollment?
  Today must not show a sharing pill implying an audience.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A check-in MUST be recordable in one tap by selecting a mood from between
  three and
  five discrete options, with no continuous slider.
- **FR-002**: Duration MUST be filled in automatically from a just-completed flow when one
  exists,
  and MUST remain editable.
- **FR-003**: The note and the flow link MUST be optional and visually secondary to mood.
- **FR-004**: Microcopy stating that only the practitioner can see this MUST be
  permanently
  visible beside the check-in fields, not behind a link or in settings.
- **FR-005**: A check-in MUST be attributed to the practitioner's local day, computed from
  their
  current timezone at submission rather than at the time the interface was opened.
- **FR-006**: A single affordance to record a check-in for the previous local day MUST be
  available within a short bounded window, and MUST become unavailable once that window
  passes or
  a newer check-in exists.
- **FR-007**: No free-form date entry for a check-in may exist anywhere.
- **FR-008**: A second check-in on the same local day MUST update the first rather than
  creating a
  second day or advancing any count twice.
- **FR-009**: Practice content — notes, reflections, and mood values — MUST be readable
  only by
  its author, enforced in table structure and access policy and verifiable from the schema
  alone.
- **FR-010**: A check-in made with no network MUST NOT be lost, and MUST NOT be reported
  in a
  state the server does not hold.
- **FR-011**: The practice-state model MUST support exactly three states: practised,
  rested, and
  silently absent.
- **FR-012**: Only practised and rested days may render calendar chips; a silently absent
  day MUST
  render nothing and produce no notice.
- **FR-013**: Logging rest MUST be a one-tap action on the primary practice screen with
  the same
  visual weight as logging practice.
- **FR-014**: Where a day holds both a rest log and a practice, practice MUST take
  precedence and
  the day MUST NOT be counted twice.
- **FR-015**: The streak MUST be displayed as a single number that never decreases and
  never
  returns to zero once a first practice exists.
- **FR-016**: No streak display may use a warning colour state or show a countdown.
- **FR-017**: No surface in this feature may display a missed-day count or a reset-to-zero
  visual.
- **FR-018**: The grace budget MUST NOT appear on the primary practice screen, and MUST be
  available calmly on request from the streak detail.
- **FR-019**: The grace budget's size and period MUST be stored as data rather than
  written into
  user-facing prose.
- **FR-020**: The grace-budget detail MUST read sensibly when nothing has been used and
  when it is
  fully used, and MUST NOT frame exhaustion as a consequence.
- **FR-021**: A milestone MUST be acknowledged once with a congratulatory card carrying a
  forward
  invitation.
- **FR-022**: A milestone card MUST NOT offer anything to defend, protect, maintain, or
  lose, and
  MUST NOT offer a purchase.
- **FR-023**: Where two milestones are reached in one day, one card MUST be shown at a
  time and
  neither may be lost.
- **FR-024**: No streak repair, restore, or undo mechanic may exist, whether free or paid.
- **FR-025**: Every user-facing string in this feature MUST pass the automated copy-lint
  in
  continuous integration, and a deliberately introduced coercive phrase MUST fail the
  build.
- **FR-026**: The intention MUST be stored as a versioned, append-only record, with no
  version
  overwritten or deleted by a revision.
- **FR-027**: A return card MUST quote the intention version active when the lapse began,
  not the
  most recent version.
- **FR-028**: A return card MUST state the elapsed time plainly and MUST NOT be styled as
  a
  warning.
- **FR-029**: A return card MUST offer keeping the intention and updating it as two flat
  actions of
  equal visual weight.
- **FR-030**: A return card MUST offer a response stating the practitioner is resting
  rather than
  stopping, so it is never a binary between practising and ignoring it.
- **FR-031**: When that resting response is chosen, the card MUST NOT immediately
  reappear, and
  nothing may be framed as a lapse.
- **FR-032**: A return card's re-entry offer MUST propose the smallest unit the pose model
  supports, drawn from the intention's original flow.
- **FR-033**: No copy in a return card or its re-entry offer may propose catching up on a
  missed
  period.
- **FR-034**: Where no intention has been recorded, no return card quoting an intention
  may be
  shown, and no intention may be invented in its place.
- **FR-035**: A lapse threshold changed while a lapse is in progress MUST take effect
  without
  re-showing a card the practitioner has already answered.
- **FR-036**: Each guidance entry MUST be gated on exactly one named trigger.
- **FR-037**: Each guidance entry MUST carry an authored static priority, used to select
  between
  simultaneously firing triggers.
- **FR-038**: Continuous integration MUST validate every guidance entry's trigger and
  priority,
  and MUST fail on a missing or duplicate priority.
- **FR-039**: At most one guidance card may render on the primary practice screen at any
  time.
- **FR-040**: A guidance card that has been shown or set aside MUST consume its trigger
  and MUST
  NOT be queued.
- **FR-041**: No guidance card may carry an unread badge or a count, and no backlog of
  earlier
  cards may ever appear.
- **FR-042**: A gap-triggered guidance card MUST give one clear next action, count no
  missed days,
  and show no reset to zero.
- **FR-043**: The guidance corpus MUST NOT be exposed as a browsable library, and no
  navigation
  entry may lead to one.
- **FR-044**: When an enrollment has sharing on, a pill naming that organization MUST be
  visible on
  the primary practice screen.
- **FR-045**: Tapping that pill MUST open a sheet listing exactly what is shared, in plain
  language, before offering a single named action to stop sharing with that organization.
- **FR-046**: Sharing controls MUST be scoped per enrollment, with one control per
  enrollment and
  no single global sharing switch.
- **FR-047**: Stopping sharing for one enrollment MUST NOT affect any other enrollment.
- **FR-048**: Stopping sharing MUST be a direct single write, with no soft hidden flag and
  no
  derived permission standing between the action and the stored state.
- **FR-049**: Stopping sharing MUST NOT require a blocking confirmation, and MUST offer a
  brief
  undo instead.
- **FR-050**: Once the undo window passes, the practitioner's signals MUST no longer be
  returned
  to that organization, including to a teacher session already in progress.
- **FR-051**: Sharing MUST NOT be reactivated by any event other than an explicit named
  grant.
- **FR-052**: Where an account belongs to an organization but has no active enrollment, no
  sharing
  pill implying an audience may be shown.
- **FR-053**: The cohort dashboard MUST show, per student, name, a status, streak state,
  days since
  last check-in, and milestone progress.
- **FR-054**: The dashboard status MUST use plain non-punitive vocabulary and no warning
  colour.
- **FR-055**: The dashboard MUST NOT request any note, mood, journal, or reflection field
  at all —
  the exclusion MUST be structural rather than a returned value being hidden.
- **FR-056**: A test asserting that a cohort-teacher-role query against the
  practice-content
  tables for an enrolled student returns zero rows or is refused MUST run in continuous
  integration.
- **FR-057**: The dashboard MUST display a persistent one-line caption stating the content
  and
  signal boundary in plain language.
- **FR-058**: A student who has stopped sharing MUST be absent from the dashboard, and
  their
  absence MUST NOT itself be reported as a status.
- **FR-059**: A derived practised-today signal MUST be a boolean derived from a check-in
  existing,
  never from anything a check-in contains.
- **FR-060**: A student enrolled in two cohorts MUST be visible to each teacher only to
  the extent
  that enrollment's sharing state permits.
- **FR-061**: An ended enrollment MUST stop being returned on the next dashboard query.
- **FR-062**: The primary navigation MUST have exactly three destinations: Today, Teach,
  and Poses,
  with composing and the flow library both reachable under Teach.
- **FR-063**: The account avatar MUST be a standalone header element rather than a
  navigation
  entry, and MUST meet the same minimum touch target as the navigation tabs.
- **FR-064**: The avatar MUST show an initials-based placeholder when no profile image is
  set.
- **FR-065**: The retired navigation test identifiers MUST be removed from the identifier
  contract
  table, and every affected end-to-end walk test MUST be updated, in the same commit as
  the
  navigation change.
- **FR-066**: The separate learning route MUST be retired, with its content surfaced from
  the
  primary practice screen.
- **FR-067**: A retired route MUST resolve to its new location rather than erroring.

### Key Entities *(include if feature involves data)*

- **Check-In**: One self-reported practice record keyed to the practitioner's local day,
  carrying
  duration, a mood value, an optional note, and an optional flow link. Practice content:
  readable
  only by its author.
- **Practice State**: One of practised, rested, or silently absent. Only the first two are
  recorded and only the first two render.
- **Streak**: A derived, always-non-decreasing count over check-ins, with a grace
  allowance
  applied from stored data rather than from prose.
- **Grace Budget**: A fixed allowance per trailing period, its size and window stored as
  data,
  visible only on request.
- **Milestone**: A practice-count threshold acknowledged once, carrying a forward
  invitation and
  nothing to defend.
- **Intention**: The practitioner's stated why, stored as an append-only sequence of
  versions so a
  return card can quote the version active at any past moment.
- **Return Card**: The lapse-triggered surface quoting the version-matched intention,
  offering
  keeping it, updating it, or stating that the practitioner is resting rather than
  stopping, plus
  a smallest-unit re-entry offer.
- **Guidance Entry**: One trigger-gated piece of writing carrying exactly one named
  trigger and an
  authored static priority. Consumed when shown; never queued.
- **Trigger**: A named event that may select at most one guidance entry.
- **Enrollment**: A practitioner's membership in one organization's cohort, carrying its
  own
  sharing state and its own control.
- **Practice Signal**: A derived, shareable fact about practice — a check-in existing, a
  streak
  state, a days-since figure, milestone progress — carrying nothing a practitioner wrote.
- **Cohort Dashboard**: The teacher-facing surface over practice signals for consenting
  enrolled
  students, structurally unable to reach practice content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A practitioner can complete a check-in in one tap, and 100% of check-ins are
  attributed to the correct local day across timezone changes and midnight boundaries.
- **SC-002**: Zero free-form date entries for check-ins exist, and the previous-day
  affordance is
  unavailable in 100% of cases outside its bounded window.
- **SC-003**: 100% of attempts by any non-author account — including a cohort teacher and
  an
  organization admin — to read a practitioner's note or mood are refused, asserted
  automatically.
- **SC-004**: Across every generated check-in history, the displayed streak decreases zero
  times
  and shows zero after a first practice zero times.
- **SC-005**: Zero warning colour states, countdowns, missed-day counts, and reset-to-zero
  visuals
  exist anywhere in the feature, asserted by automated checks rather than by review alone.
- **SC-006**: Logging rest takes one tap and its control measures the same as the practice
  control,
  with zero de-emphasis.
- **SC-007**: The grace budget appears zero times on the primary practice screen and is
  reachable
  in one interaction from the streak detail.
- **SC-008**: Zero streak repair, restore, or undo mechanics exist, free or paid.
- **SC-009**: 100% of user-facing strings in this feature pass the copy-lint in continuous
  integration, and a deliberately introduced coercive phrase fails the build on 100% of
  attempts.
- **SC-010**: 100% of intention revisions retain every prior version, and 100% of return
  cards
  quote the version active when the lapse began.
- **SC-011**: The return card offers exactly three responses, of which the two intention
  actions
  carry identical visual weight, and zero of its strings propose catching up.
- **SC-012**: At most one guidance card renders at any time, in 100% of
  simultaneous-trigger
  cases, and zero backlogs or unread counts appear.
- **SC-013**: Continuous integration fails on 100% of guidance entries with a missing or
  duplicate
  authored priority.
- **SC-014**: A practitioner can stop sharing with a named organization in one interaction
  from the
  primary practice screen, with zero blocking dialogs.
- **SC-015**: Stopping sharing for one enrollment affects zero other enrollments, and
  after the
  undo window zero of that practitioner's signals are returned to that organization,
  including to
  an in-progress teacher session.
- **SC-016**: A cohort-teacher-role query against the practice-content tables for an
  enrolled
  student returns zero rows or is refused, on 100% of attempts, asserted in continuous
  integration.
- **SC-017**: Zero note, mood, journal, or reflection fields are requested anywhere in the
  dashboard's data access, verified by inspecting the queries rather than the rendered
  output.
- **SC-018**: A teacher viewing the dashboard can state the content and signal boundary
  without
  leaving the page.
- **SC-019**: The primary navigation has exactly three destinations, and the end-to-end
  walk suite
  passes in the same commit that retires the five navigation identifiers, with zero
  follow-up
  commits required.
- **SC-020**: Zero retired routes error; 100% resolve to their new location.

## Assumptions

- A check-in is attributed to the local day the action occurs on, with one bounded
  affordance to
  log for the previous day. Free-form backdating would let streak state be constructed
  after the
  fact; a narrow, time-boxed exception covers the legitimate late-night case without that.
- A derived practised-today boolean is exposed to cohort teachers, structurally separate
  from the
  check-in component tree. This is already the dashboard's remit; what is being confirmed
  is that
  it derives from a check-in existing and never from its contents.
- No streak repair mechanic will be built. **[WILL NOT BUILD]** Because the streak never
  returns
  to zero, there is nothing to repair, and adding a repair — paid or free — would import
  exactly
  the monetization-of-guilt pattern this feature exists to avoid. Recorded as closed
  rather than
  deferred, so it is not reopened as a small addition later.
- The grace budget is fixed at launch rather than configurable, with its size stored as
  data so it
  can change without a copy-lint re-review. A configurable budget is more product surface
  than
  this feature needs.
- The return ritual ships copy-only, quoting the intention. The richer memory-echo that
  surfaces a
  past note is deferred, because it depends on the note data model this same feature
  defines —
  sequencing it later avoids a circular dependency inside one feature.
- Guidance copy uses a gentle, pattern-based tone rather than a target-driven one, because
  a
  target-driven framing reads as a threshold to fall short of. **[OWNER SIGN-OFF]** a
  short copy
  style note is owed before any guidance content is authored, so the corpus and the
  copy-lint are
  written against the same stance.
- Guidance priority is an authored static field rather than computed from recency, so it
  is
  inspectable and testable before release; recency-based selection could surface a
  low-value entry
  purely by timing. **[SCHEMA IMPACT]** this adds a required field to the guidance entry
  frontmatter and its validation.
- Stopping sharing offers a brief undo rather than a blocking confirmation. Adding
  friction to a
  privacy-protective action is the wrong direction to add friction in.
- Named per-student dashboard rows are the right granularity at the current
  single-customer scale.
  Cross-cohort aggregation is a later feature's problem and is not hedged for here.
- The separate learning route is retired and its content folds into what the primary
  practice
  screen surfaces. A live-but-unlinked route invites content to go stale where nobody
  looks.
- The header avatar shows an initials-based placeholder when no image is set, because a
  blank or
  broken image reads as an error.
- The undo toast reuses the existing single accent and the established motion budget,
  introducing
  no new design token. **[DEFERRED TO IMPLEMENTATION]** this is a design-system detail
  rather than
  a product decision, and a token used by one component only would be worse than reuse.
- Disclosing the exact fields that become visible before sharing defaults on at enrollment
  is the
  honest sequencing, and is required in the same slice as the enrollment flow.
  **[DEPENDENCY: BLOCKED — enrollment UI does not exist]** `002` created the enrollment
  sharing
  column but not the join flow. Until that flow exists there is no moment at which to
  disclose, so
  this feature ships the visible pill, the plain-language sheet, and the one-interaction
  revoke
  (FR-044 to FR-051) as the standing protection, and the pre-grant disclosure ships with
  the
  enrollment flow whenever it is scoped.
- The navigation collapse retires five test identifiers. This is an accepted exception to
  the
  identifier contract, and FR-065 requires the contract table and every affected walk test
  to
  change in the same commit rather than as a follow-up.
- The already-tracked quick wins on this surface are delivered inside their stories above
  rather
  than tracked separately: the minimal one-tap check-in, and the direct sharing write now
  that the
  column exists. The lapse-response copy should be drafted as static text and run through
  the
  copy-lint before any interface work begins, so the lint has something real to validate
  from day
  one.
