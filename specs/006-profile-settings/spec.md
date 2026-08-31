# Feature Specification: Profile & Settings

**Feature Branch**: `006-profile-settings`
**Created**: 2026-08-31
**Status**: Draft
**Input**: User description: "One settings shell, specified from `specs/006-profile-settings/design-input.md` (12 candidate UX requirements, 4 open decisions, sourced from `docs/design-research/{03,14,16,17,19}`). Replaces the fragmented, indexless settings pattern with a single `/settings` route holding profile, appearance, notifications, practice-visibility privacy, account security, data export and delete, a billing entry point, an org-memberships list, and an owner-only studio block. Sections that do not apply to an account are absent entirely rather than shown disabled. The practice-visibility control is built once and mounted both in settings and inline on Today, because RULE-V6 requires revocation within one interaction of the primary practice screen and settings is explicitly the secondary path. Also gives the four orphaned per-surface preference keys a home, makes sign-in and sign-out discoverable, adds an OTP resend and code-paste fallback, restores a way back from a dismissed claim prompt, and makes claiming local flows an explicit, itemized confirmation — never a silent auto-adopt."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Settings shows me only what applies to me (Priority: P1)

A solo practitioner with no organization opens settings and sees profile, appearance,
notifications, privacy, account and security, data export and delete, and billing — in
that
order, in one place. The org-memberships and studio sections are not there at all. A
studio
owner opening the same route sees those two sections appended, visually separated by
spacing
and labels rather than by a second accent colour.

**Why this priority**: This is the shell every other story in this feature mounts into,
and it
is the story that replaces the pattern the design research identified as the worst
offender —
settings scattered across routes with no index. A disabled section a solo user can never
use is
a permanent unanswered question in their interface; absence is the honest state.

**Independent Test**: Can be fully tested by opening settings as a zero-org account and as
an
owner account and confirming the section list, its order, and that conditional sections
are
absent rather than disabled.

**Acceptance Scenarios**:

1. **Given** any signed-in account, **When** they open settings, **Then** the sections
   appear in
   the order profile, appearance, notifications, privacy, account and security, data
   export and
   delete, billing, org memberships, studio.
2. **Given** an account belonging to no organization, **When** they open settings,
   **Then**
   neither the org-memberships nor the studio section is present in the page or its index.
3. **Given** an account belonging to an organization without an owner or admin role,
   **When**
   they open settings, **Then** org memberships is present and studio is absent.
4. **Given** an account holding an owner or admin role in at least one organization,
   **When**
   they open settings, **Then** the studio section is present.
5. **Given** the studio section is present, **When** its visual separation from the
   personal
   sections is inspected, **Then** it is achieved with spacing, hairlines, and labels, and
   introduces no second accent colour.
6. **Given** a setting the account genuinely cannot change, **When** it renders, **Then**
   it
   states in plain language why, rather than being silently inert.
7. **Given** any of these sections, **When** they render, **Then** every one is reachable
   from a
   single settings route with a visible index, with no section reachable only by typing a
   URL.

---

### User Story 2 - Revoking practice visibility is one interaction from practice
(Priority: P1)

A practitioner on Today decides they no longer want their check-in signals shared with
their
cohort. The control is right there: one interaction, no navigation into settings. The same
control, built once, also appears in the settings privacy section — with identical copy,
because it is the same component.

**Why this priority**: RULE-V6 requires the revoke control to be reachable in one
interaction
from the primary practice screen and not only from settings. A link-out from Today to a
settings
page costs two interactions and arguably fails the rule outright. Two separately built
copies of
the control would drift, and privacy copy that drifts is privacy copy that misleads.

**Independent Test**: Can be fully tested by revoking from Today, confirming it took
effect with
no intermediate navigation, then opening settings and confirming the same control reflects
the
new state with identical copy.

**Acceptance Scenarios**:

1. **Given** a practitioner on Today with signal sharing active, **When** they revoke it,
   **Then** it is revoked in one interaction with no navigation to another route.
2. **Given** the control on Today and the control in the settings privacy section,
   **When** both
   are compared, **Then** their copy is identical, because both render the same component.
3. **Given** sharing is revoked from Today, **When** the settings privacy section is
   opened,
   **Then** it shows the revoked state without a refresh being required.
4. **Given** sharing is revoked from settings, **When** Today is opened, **Then** it shows
   the
   revoked state.
5. **Given** a revocation, **When** it completes, **Then** its effect is confirmed to the
   user in
   plain language stating what is no longer shared and with whom.
6. **Given** any change to the privacy copy, **When** it is made, **Then** it takes effect
   in
   both locations from a single edit.

---

### User Story 3 - Claiming local flows is explicit and itemized (Priority: P1)

A practitioner who composed flows before signing up now signs in. They are shown exactly
which
flows will be claimed, by name, and they confirm. Nothing is adopted into their account
without
that confirmation. If they choose "not now", there is a named way back to claim later,
rather
than a decision they can never revisit.

**Why this priority**: A silent auto-claim merges data whose provenance the user cannot
audit —
the precise failure this requirement exists to prevent. It is P1 because the harm is
irreversible in the user's perception and lands at the most sensitive moment in the
product's
lifecycle, the transition from anonymous to identified.

**Independent Test**: Can be fully tested by composing flows anonymously, signing in, and
confirming that nothing is claimed until an explicit confirmation naming each flow, and
that
declining leaves a re-entry point.

**Acceptance Scenarios**:

1. **Given** locally stored flows and a newly authenticated account, **When**
   authentication
   completes, **Then** no local flow has been adopted into the account.
2. **Given** that state, **When** the claim prompt appears, **Then** it lists every flow
   that
   would be claimed by name, together with the count, inline in the prompt.
3. **Given** the claim prompt, **When** the practitioner confirms, **Then** exactly the
   listed
   flows are claimed and the outcome is acknowledged.
4. **Given** the claim prompt, **When** the practitioner declines, **Then** nothing is
   claimed
   and the local flows remain readable locally.
5. **Given** a previously declined claim prompt, **When** the practitioner looks in the
   account
   surface, **Then** a named re-entry point to claim their local flows is present.
6. **Given** the re-entry point, **When** it is used, **Then** the same itemized
   confirmation is
   shown before anything is claimed.
7. **Given** a claim is confirmed, **When** it partially fails, **Then** the practitioner
   is told
   which flows were claimed and which were not, and the unclaimed ones remain locally
   readable.

---

### User Story 4 - Getting into and out of an account is discoverable (Priority: P2)

A practitioner can find sign-in and sign-out from the app's primary navigation rather than
needing to know a URL. When they request a sign-in email, they can resend it, and if the
link
opens on a different device than the one that asked for it, they can paste the code
instead.

**Why this priority**: An undiscoverable sign-out is a trust problem on a shared device,
and a
one-shot magic link with no resend and no alternate path is a dead end with no recovery.
It is
P2 rather than P1 because direct navigation currently works, so this is a reachability and
recovery fix rather than a missing capability.

**Independent Test**: Can be fully tested by finding sign-in and sign-out from the primary
navigation with no URL typing, and by completing sign-in via a pasted code on a second
device.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** they look at the primary navigation,
   **Then**
   sign-in is reachable from it.
2. **Given** a signed-in practitioner, **When** they look at the primary navigation,
   **Then**
   sign-out is reachable from it.
3. **Given** a requested sign-in email, **When** it has not arrived, **Then** a resend
   affordance
   is available, with any rate limit stated plainly rather than silently failing.
4. **Given** a sign-in requested on one device, **When** the email is opened on another,
   **Then**
   the practitioner can complete sign-in on the original device by pasting the code.
5. **Given** an expired or already-used code, **When** it is submitted, **Then** the
   failure is
   stated plainly with the next step, and no partial session is created.

---

### User Story 5 - Re-granting signal sharing is as explicit as revoking it (Priority: P2)

A practitioner who revoked cohort signal sharing, or who is enrolling in a new cohort,
grants it
again through a named, deliberate action on their memberships surface. Sharing never comes
back
on as a side effect of some other event.

**Why this priority**: Silent reactivation would undo the revoke the practitioner
explicitly
performed, which is worse than never having offered the revoke. It is P2 because the
revoke path
in Story 2 is the safety-critical half; this closes the loop so revocation is not a
one-way door.

**Independent Test**: Can be fully tested by revoking sharing, then triggering
re-enrollment and
any other membership change, and confirming sharing stays off until a named grant action
is
taken.

**Acceptance Scenarios**:

1. **Given** sharing has been revoked, **When** the practitioner re-enrolls in the same
   cohort,
   **Then** sharing remains off until an explicit named grant.
2. **Given** sharing has been revoked, **When** any other membership, billing, or profile
   change
   occurs, **Then** sharing remains off.
3. **Given** the memberships surface, **When** it renders, **Then** each enrollment's
   sharing
   state is individually legible and individually changeable.
4. **Given** a grant action, **When** it is taken, **Then** it states what will become
   visible
   and to whom before it takes effect.

---

### User Story 6 - Preferences have one home, and no flash of the wrong theme (Priority:
P3)

A practitioner sets their theme once and it is correct on the very first paint of every
subsequent load, with no flash of the wrong colours. The per-surface preferences that were
previously stranded in browser storage with no visible control now live in the preferences
section, and the pose-detail custom field checklist can be saved and reused as a named
preset.

**Why this priority**: These are correctness and tidiness wins that only become possible
once
the shell exists. A theme flash is a visible defect but not a blocking one, and the
stranded
preference keys currently work — they are simply unreachable and unexportable.

**Independent Test**: Can be fully tested by setting a non-default theme, reloading, and
observing the first paint; and by changing each previously stranded preference from the
preferences section.

**Acceptance Scenarios**:

1. **Given** a chosen theme, **When** the app is loaded fresh, **Then** the first paint is
   in the
   chosen theme, with no flash of the other theme.
2. **Given** a chosen theme, **When** the practitioner returns on the same browser after
   the
   session ends, **Then** the theme is still applied at first paint.
3. **Given** each previously stranded per-surface preference, **When** the preferences
   section is
   opened, **Then** it is visible and changeable there.
4. **Given** a stranded preference already set in browser storage, **When** the
   practitioner
   first opens the new preferences section, **Then** their existing value is carried over
   rather
   than reset to the default.
5. **Given** the pose-detail custom field checklist, **When** the practitioner saves a
   selection
   as a named preset, **Then** they can reapply it by name later.
6. **Given** several saved presets, **When** one is renamed or deleted, **Then** the
   others are
   unaffected.

---

### Edge Cases

- What happens when an account's org role changes while settings is open? A section
  appearing or
  disappearing under the user's cursor is disorienting; the change should be reflected on
  the
  next load rather than by mutating the open page.
- What happens when an account is an owner of one organization and a plain member of
  another?
  The studio section must be present and must make clear which organization it governs.
- What happens when the practice-visibility control is rendered on Today for an account
  with no
  cohort enrollment at all? There is nothing to share with, so the control should not
  imply an
  audience that does not exist.
- What happens when a revocation is attempted with no network? The user must not be told
  sharing
  is off while the server still believes it is on.
- What happens when a claim confirmation lists more flows than fit on screen? The list
  must stay
  fully reviewable rather than truncating into an unaudited count.
- What happens when the same local flows are claimed from two devices? The second claim
  must not
  produce duplicates or a second copy under a different name.
- What happens when a practitioner deletes their account while a claim is pending? Nothing
  should
  be adopted into an account being deleted.
- What happens when a data export is requested for an account with practice content? The
  export
  must contain the author's own content and must not contain anyone else's.
- What happens when a theme cookie is absent, corrupt, or set to an unknown value? The
  first
  paint must fall back to the default theme rather than rendering unstyled.
- What happens when browser storage is unavailable and preferences cannot be migrated?
  Settings
  must remain usable with defaults rather than failing to render.
- What happens when a lapsed entitlement holder opens settings? Personal preferences
  already
  cached must remain viewable; settings must not introduce a new read-gate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A single settings route MUST present all settings sections with a visible
  index,
  and no section may be reachable only by direct URL entry.
- **FR-002**: Sections MUST appear in the order profile, appearance, notifications,
  privacy,
  account and security, data export and delete, billing, org memberships, studio.
- **FR-003**: The org-memberships section MUST render only when the account belongs to at
  least
  one organization, and MUST be absent — not disabled or greyed — otherwise.
- **FR-004**: The studio section MUST render only when the account holds an owner or admin
  role
  in at least one organization, and MUST be absent otherwise.
- **FR-005**: When several organizations apply, the studio section MUST make clear which
  organization each control governs.
- **FR-006**: The studio section's visual separation from personal sections MUST use
  spacing,
  hairlines, and labels only, and MUST NOT introduce a second accent colour.
- **FR-007**: A setting the account cannot change MUST state in plain language why, rather
  than
  rendering silently inert.
- **FR-008**: The billing entry point MUST be placed in the account-and-security or
  billing
  section, and MUST hand off to the existing external billing portal rather than
  reimplementing
  it.
- **FR-009**: Billing-related copy in settings MUST state in plain language what is and is
  not
  gated, consistent with the existing fail-open-on-read and fail-closed-on-write rule,
  which
  this feature surfaces rather than redefines.
- **FR-010**: Settings MUST NOT introduce any new authentication gate on reading personal
  preferences that are already cached.
- **FR-011**: The practice-visibility control MUST be implemented once and mounted both in
  the
  settings privacy section and inline on the primary practice screen.
- **FR-012**: Revoking practice-signal sharing from the primary practice screen MUST
  complete in
  one interaction, with no navigation to another route.
- **FR-013**: The two mountings of the practice-visibility control MUST always carry
  identical
  copy, such that a single copy edit changes both.
- **FR-014**: A change to sharing state made in one mounting MUST be reflected in the
  other
  without requiring a manual refresh.
- **FR-015**: A completed revocation MUST be confirmed to the user in plain language
  stating what
  is no longer shared and with whom.
- **FR-016**: A revocation that has not been durably recorded MUST NOT be reported to the
  user as
  complete.
- **FR-017**: The practice-visibility control MUST NOT imply an audience that does not
  exist when
  the account has no cohort enrollment.
- **FR-018**: Each cohort enrollment's sharing state MUST be individually legible and
  individually changeable on the memberships surface.
- **FR-019**: Re-granting signal sharing MUST require an explicit named action, and MUST
  NOT be
  reactivated as a side effect of re-enrollment or of any membership, billing, or profile
  change.
- **FR-020**: A grant action MUST state what will become visible and to whom before it
  takes
  effect.
- **FR-021**: Authentication MUST NOT adopt locally stored flows into an account without
  an
  explicit user confirmation.
- **FR-022**: The claim confirmation MUST list every flow that would be claimed by name,
  together with the count, inline in the prompt, and MUST remain fully reviewable when the
  list
  is long.
- **FR-023**: Declining a claim MUST leave nothing claimed and MUST leave the local flows
  readable locally.
- **FR-024**: A declined claim MUST leave a named re-entry point in the account surface
  from
  which the practitioner can claim later, and that path MUST show the same itemized
  confirmation.
- **FR-025**: A partially failed claim MUST tell the practitioner which flows were claimed
  and
  which were not, and MUST leave the unclaimed ones readable locally.
- **FR-026**: Claiming the same local flows from a second device MUST NOT produce
  duplicates.
- **FR-027**: A pending claim MUST NOT adopt anything into an account that is being
  deleted.
- **FR-028**: Sign-in MUST be reachable from the app's primary navigation for an
  unauthenticated
  visitor, and sign-out MUST be reachable from it for a signed-in practitioner.
- **FR-029**: The email sign-in flow MUST offer a resend affordance, and MUST state any
  rate
  limit plainly rather than failing silently.
- **FR-030**: The email sign-in flow MUST accept a pasted code as an alternative to
  following
  the link, so a sign-in requested on one device can be completed there when the email
  opens on
  another.
- **FR-031**: An expired or already-used sign-in code MUST produce a plainly stated
  failure with
  a next step, and MUST NOT create a partial session.
- **FR-032**: The chosen theme MUST be applied on the first paint of a fresh load, with no
  flash
  of the other theme, and MUST persist across sessions on the same browser.
- **FR-033**: An absent, corrupt, or unrecognized stored theme value MUST fall back to the
  default theme rather than rendering unstyled.
- **FR-034**: Each preference currently stranded in per-surface browser storage MUST be
  visible
  and changeable from the preferences section.
- **FR-035**: An existing stranded preference value MUST be carried over on first use of
  the new
  preferences section rather than reset to its default.
- **FR-036**: Settings MUST remain usable with default values when browser storage is
  unavailable.
- **FR-037**: The pose-detail custom field selection MUST be saveable as a named preset
  and
  reapplicable by name, with several presets coexisting and rename or delete affecting
  only the
  targeted preset.
- **FR-038**: A data export MUST contain the requesting account's own content and MUST NOT
  contain any other account's practice content.
- **FR-039**: A change to the account's org role MUST be reflected on the next load rather
  than
  by adding or removing sections in an already-open settings page.

### Key Entities *(include if feature involves data)*

- **Settings Section**: One titled block in the single settings shell, with a fixed
  position in
  the order and a condition determining whether it renders at all.
- **Conditional Section**: A section whose presence depends on actual account state — org
  membership or an owner role — and which is absent rather than disabled when the
  condition
  fails.
- **Practice-Visibility Control**: The single shared component governing who can see
  practice
  signals, mounted in both settings and the primary practice screen, and the concrete
  implementation of the one-interaction revoke requirement.
- **Enrollment Sharing State**: Per-enrollment sharing status, independently legible and
  independently changeable, never reactivated implicitly.
- **Preference**: A per-account display or behaviour choice with a visible control in the
  preferences section. Includes the previously stranded per-surface values.
- **Custom Field Preset**: A named, reusable selection of pose-detail fields belonging to
  one
  account.
- **Claim Prompt**: The explicit, itemized confirmation shown before any locally stored
  flow is
  adopted into an account, with a re-entry point surviving a decline.
- **Sign-In Attempt**: A requested email sign-in, resendable, completable either by link
  or by
  pasted code, and rate-limited with a stated limit.
- **Billing Entry Point**: A placement in settings that hands off to the external billing
  portal.
  Owns placement and copy only, not the portal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of settings sections are reachable from the single settings route's
  visible
  index, and zero require direct URL entry.
- **SC-002**: For a zero-org account, the count of rendered conditional sections is zero,
  and
  zero disabled or greyed sections appear anywhere in settings.
- **SC-003**: Zero settings render as silently inert: every unchangeable control carries a
  plain-language reason.
- **SC-004**: The studio section introduces zero additional accent colours, keeping the
  interface accent count at one.
- **SC-005**: Revoking practice-signal sharing from the primary practice screen takes
  exactly one
  interaction, with zero intervening navigations.
- **SC-006**: The privacy copy exists in exactly one place, verified by a single edit
  changing
  both mountings.
- **SC-007**: Zero local flows are adopted into an account without an itemized
  confirmation,
  verified by automated tests across the authentication paths.
- **SC-008**: 100% of claim confirmations name every flow to be claimed, with zero
  count-only confirmations.
- **SC-009**: A practitioner who declined the claim prompt can reach the claim path again
  in
  under 30 seconds without external help.
- **SC-010**: 100% of re-enrollments after a revoke leave sharing off until an explicit
  grant,
  with zero implicit reactivations across the membership, billing, and profile change
  paths.
- **SC-011**: A sign-in requested on one device and emailed to another can be completed on
  the
  original device, with zero dead ends.
- **SC-012**: Zero flashes of the wrong theme occur on fresh load, measured on first paint
  rather
  than assumed.
- **SC-013**: 100% of previously stranded preference keys have a visible control, and 100%
  of
  existing values survive the migration.
- **SC-014**: A data export for an account containing practice content includes 100% of
  the
  author's own content and zero rows belonging to any other account.

## Assumptions

- Today's practice-visibility control is the full shared component rendered inline, not a
  link-out to the settings page. RULE-V6 requires the revoke control within one
  interaction of
  the primary practice screen; a link-out costs two, so the embedded component is adopted
  as the
  compliant reading.
- The studio surface lives inside the single settings route as a visually separated block
  rather
  than at a separate administrative route. The product has explicitly chosen a
  no-settings-sprawl constraint, which outweighs the separate-menu pattern the exemplars
  use.
- Settings search is not built at launch. The section count sits below the threshold at
  which
  flat lists become unnavigable; adding search now would be speculative. Revisit if the
  section
  count grows past roughly ten.
- The claim confirmation shows a full list of flow names plus a count, not a count alone.
  A bare
  count asks for the same leap of faith a silent claim does, with an extra click in front
  of it.
- Sign-in and sign-out are reached through the header account element introduced by
  `005`'s
  navigation restructure. **[DEPENDENCY: 005]** If `005` has not landed, this feature must
  place
  the entry points in the existing navigation rather than deferring the requirement — an
  undiscoverable sign-out on a shared device is not acceptable while waiting on another
  feature.
- The billing portal itself remains `002`'s scope. This feature owns only where the entry
  point
  sits and what the surrounding copy says.
- The four previously stranded per-surface preference keys are migrated with their
  existing
  values carried over. Resetting them to defaults would be a silent regression for anyone
  who had
  already set them.
- Theme is stored in a cookie and applied by a pre-paint step so the first paint is
  correct.
  Browser storage read after paint cannot satisfy the no-flash requirement.
- Data export and delete cover the requesting account's own data only. Cross-account
  export is
  not in scope and would conflict with the content-versus-signal split.
- The quick wins already identified on this surface — the OTP resend affordance and the
  pre-paint
  theme read — are delivered inside their respective stories above rather than tracked as
  separate work.
