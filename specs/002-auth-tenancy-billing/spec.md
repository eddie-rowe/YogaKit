# Feature Specification: Auth, Tenancy & Billing Foundation

**Feature Branch**: `002-auth-tenancy-billing`
**Created**: 2026-08-26
**Status**: Draft
**Input**: User description: "Multi-tenant auth, org graph, RLS, entitlements, and Stripe billing foundation for Krama v1.0 — the first of five spec-kit features implementing the post-Giaconda platform pivot (see `.specify/memory/constitution.md` v3.0.0 and `/Users/eddie.rowe/.claude/plans/i-met-with-giaconda-declarative-dewdrop.md`). Establishes accounts, organizations (schools/studios/certifying bodies), memberships, invitations, entitlement resolution, and Stripe billing, anchored on the first real customer, One Om School of Yoga, a certifying body that needs to invite a student, watch them accept, mark them graduated, and see that graduation produce a 90-day membership grant."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A solo practitioner creates an account without losing anything (Priority: P1)

Eddie (or any existing v0.1 user practicing solo, no organization involved) has been using
Krama locally with flows saved only on their phone. They create an account for the first
time. Sign-in must not silently discard the flows already on their device, and it must not
force them to join or interact with any organization — the app remains fully usable by a
person who belongs to zero organizations.

**Why this priority**: Every other user story depends on accounts existing, and this is the
population most likely to be lost if the pivot regresses the promise the app already made
them (their data is theirs, and it doesn't disappear).

**Independent Test**: Can be fully tested by signing up on a device that already has locally
saved flows, and confirming: (a) sign-up succeeds without an organization, (b) the
pre-existing local flows are still visible and are offered for claiming to the new account
rather than silently discarded or silently auto-adopted, (c) the account has full access to
personal features with no organization in the picture.

**Acceptance Scenarios**:

1. **Given** a person with no account and flows already saved on their device, **When** they
   sign up with Google or email, **Then** they land in an account that is not a member of
   any organization and are prompted to claim their existing on-device flows into it.
2. **Given** a signed-in solo user with no organization memberships, **When** they use any
   personal feature (composing a flow, reading a flow, browsing poses), **Then** nothing in
   the experience references an organization, a teacher, or a billing seat they don't have.
3. **Given** a person mid-sign-up, **When** they abandon the flow before finishing, **Then**
   no partial account or organization is left in a state that blocks them from trying again.

---

### User Story 2 - A certifying body creates an organization and invites a student (Priority: P1)

One Om School of Yoga's administrator creates an organization for the school, and invites a
newly graduating student by email to join a cohort. The student — who may or may not already
have a Krama account — receives an invitation, accepts it, and becomes a member of One Om's
organization with a "student" role, without either party ever seeing or touching the other's
unrelated data.

**Why this priority**: This is the specific loop Giaconda's first customer needs, and it's
the seed every other org-scoped feature (cohorts, entitlement grants, teacher visibility in
Feature 005) is built on. Without organization creation and invitation acceptance working
correctly and safely, nothing downstream can be demoed to One Om.

**Independent Test**: Can be fully tested by creating an organization as an admin, sending an
invitation to an email address, accepting that invitation as a different account (or as a
brand-new sign-up), and confirming the resulting membership has the right role and that no
other organization's data becomes visible to either party.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they create a new organization and choose its
   type (school, studio, or certifying body), **Then** they become that organization's first
   member with an owner role.
2. **Given** an organization owner, **When** they send an invitation to an email address,
   **Then** an invitation is created that can be accepted exactly once and cannot be listed,
   guessed, or enumerated by anyone who wasn't sent it.
3. **Given** a pending invitation and a recipient who accepts it (whether by signing up fresh
   or signing in to an existing account), **When** acceptance completes, **Then** the
   recipient becomes a member of the inviting organization with the role specified in the
   invitation, and the invitation can no longer be accepted a second time.
4. **Given** a person who is a member of Organization A, **When** they view their own data or
   any list scoped to Organization A, **Then** they see nothing belonging to any Organization
   B they do not belong to, even if they know Organization B's identifiers.
5. **Given** an invitation that has expired or was revoked before acceptance, **When** the
   recipient attempts to accept it, **Then** the attempt fails without granting membership or
   revealing whether the invitation ever existed.

---

### User Story 3 - Graduation grants a time-boxed membership automatically (Priority: P1)

One Om marks a student in a cohort as graduated. That single action results in the student
receiving a 90-day membership grant to Krama's paid features, with no separate billing step
required from the student or the school for that grant to take effect.

**Why this priority**: This is the mechanism that closes One Om's business loop — "we
graduate you, you get 90 days to build the habit" — and it's the dependency Feature 005
(Daily Sadhana) needs in place before it can be meaningfully demoed to a paying customer.

**Independent Test**: Can be fully tested by marking a cohort member graduated and confirming
that, immediately afterward, that member's account has access to entitled features it did not
have before, with an end date 90 days out, and that marking the same member graduated a
second time does not stack a second grant or extend the window unpredictably.

**Acceptance Scenarios**:

1. **Given** a student enrolled in a cohort at a certifying-body organization, **When** an
   authorized org member marks that student graduated, **Then** the student's account
   immediately gains access to entitled features for 90 days from that moment.
2. **Given** a student who already has an active personal subscription, **When** they also
   receive a graduation grant, **Then** they retain access without either source of access
   being lost or double-counted in a way that confuses what they're paying for.
3. **Given** a graduation grant that has expired, **When** the student's access is next
   checked, **Then** they lose access to entitled features gracefully — no data loss, no
   error state, and their own previously saved content remains theirs to read.
4. **Given** a non-owner, non-authorized member of an organization, **When** they attempt to
   mark a student graduated, **Then** the action is refused.

---

### User Story 4 - A practitioner subscribes and manages their own billing (Priority: P2)

A user who is not part of any organization's grant wants ongoing access to entitled features
and pays for it directly. They can start a subscription, see what plan they're on, update
their payment method, and cancel — all without contacting support.

**Why this priority**: Direct subscription is the revenue path for the majority of users who
aren't part of a certifying-body cohort, and it's necessary for the product to be a
sustainable business rather than a grant-only tool. It's P2 rather than P1 because the first
customer's loop (Story 3) can be demoed and validated before self-serve billing is polished.

**Independent Test**: Can be fully tested by starting checkout as a signed-in user, completing
payment, confirming entitled access turns on, then visiting a billing management surface to
cancel, and confirming access continues until the paid period ends rather than stopping
immediately.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no active subscription or grant, **When** they choose to
   subscribe and complete payment, **Then** their account gains access to entitled features
   without requiring a page reload race or manual refresh from support.
2. **Given** a subscribed user, **When** they open their billing management surface, **Then**
   they can see their current plan, update payment details, and cancel.
3. **Given** a user who cancels, **When** the current paid period ends, **Then** access to
   entitled features ends at that point, not before, and their own content remains theirs.
4. **Given** a billing provider webhook that arrives more than once for the same event,
   **When** it is processed, **Then** the user's entitlement state changes exactly once, not
   once per delivery.

---

### User Story 5 - A person's practice data stays theirs no matter who else is in the room (Priority: P1)

A student who is a member of a cohort, and whose organization can see certain practice
*signals* about them (per Feature 005's later scope), needs to trust today — before any
signal-sharing feature ships — that joining an organization does not, by itself, expose
anything about them beyond the fact of their membership and role.

**Why this priority**: This is the trust foundation the entire org graph rests on
(constitution Principle VIII). If the tenancy layer built in this feature makes it possible,
even in principle, for an org to reach into another member's private data by construction of
the schema rather than by an explicit later grant, every subsequent feature inherits that
flaw. It must be provably false from the moment organizations exist, not patched in later.

**Independent Test**: Can be fully tested by creating two members of the same organization
with no explicit sharing configured, and confirming neither can read the other's personal
account data, saved flows, or any future practice content — only the shared facts of
organization/cohort membership and role are mutually visible.

**Acceptance Scenarios**:

1. **Given** two members of the same organization, **When** either looks up the other,
   **Then** they see only what membership itself implies (name, role, organization) and
   nothing about the other's personal saved content.
2. **Given** an organization admin, **When** they view their member list, **Then** they
   cannot use that view or any related capability to read a member's saved flows, notes, or
   any other personal content — only membership-level facts (who's in, what role, what
   status).
3. **Given** an invitation containing an intended role, **When** it is accepted, **Then** the
   resulting membership carries exactly that role — never an elevated one the invitation
   didn't specify.

---

### Edge Cases

- What happens when someone with an existing account is invited to an organization using the
  email address on a *different* account than the one they're currently signed into? The
  invitation must be tied to the invited email address, and acceptance must require the
  accepting account to control that email — it must not silently attach the organization
  membership to whatever account happens to be signed in at the moment of clicking the link.
- What happens when the last owner of an organization tries to leave or demote themselves? The
  organization must never be left without at least one owner able to manage it.
- What happens when a user deletes their account while they hold an active grant, an active
  subscription, or organization ownership? Deletion must not silently orphan an organization
  or leave a billing subscription running with no one able to manage it.
- What happens when a Stripe webhook reports a payment failure for a subscription tied to a
  user who also has an active graduation grant? The user should not perceive any change in
  access while the grant remains valid — entitlement is the union of every valid source, not
  a single fragile subscription state.
- What happens when someone tries to accept an invitation twice (e.g., double-clicking, or a
  second person forwarding the same email)? The second attempt must fail cleanly and must not
  create a duplicate membership or duplicate grant.
- What happens when a person is invited to the same organization twice, with different roles
  each time (e.g., invited as a student, then separately invited as a teacher)? Accepting both
  should not require two separate membership relationships — a person has exactly one
  relationship to a given organization, and it reflects the union of roles they've been
  granted.
- What happens to a solo user's locally-saved flows if they never create an account at all?
  Nothing — local-first use without an account must keep working, per the original "6am test"
  the product was built on.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let a person create an account using at minimum Google sign-in
  and an email-based method, without requiring them to join or create an organization.
- **FR-002**: The system MUST let an authenticated person belong to zero organizations and
  retain full access to all personal (non-organization-scoped) features.
- **FR-003**: The system MUST let an authenticated person create an organization, choosing
  among at least three organization kinds (school, studio, certifying body), and MUST make
  the creator an owner of that organization.
- **FR-004**: The system MUST let an organization owner or other authorized role invite a
  person to the organization by email address, with an assigned role.
- **FR-005**: An invitation MUST be acceptable by its intended recipient exactly once, MUST
  NOT be discoverable, listable, or guessable by anyone other than its sender and its
  intended recipient, and MUST support expiration and revocation before acceptance.
- **FR-006**: Accepting an invitation MUST require the accepting account to control the
  invited email address, and MUST result in a membership carrying exactly the role(s) granted
  by the invitation(s) accepted — never more.
- **FR-007**: A person MUST have at most one membership relationship per organization; being
  invited to the same organization more than once with different roles MUST union the roles
  onto that single relationship rather than creating duplicates.
- **FR-008**: The system MUST prevent an organization from ever being left with zero owners,
  whether by an owner leaving, being demoted, or being removed.
- **FR-009**: The system MUST prevent any organization member — including admins — from
  reading another member's personal saved content (flows, notes, or other future
  practice-related content) solely by virtue of shared organization membership. Only
  membership-level facts (identity as implied by membership, role, status) are visible across
  a membership relationship.
- **FR-010**: An authorized organization member MUST be able to mark a cohort member as
  "graduated," and doing so MUST grant that member a time-boxed (90-day, configurable)
  entitlement to paid features, taking effect immediately.
- **FR-011**: Marking the same cohort member graduated more than once MUST NOT stack
  additional grants or produce an unpredictable extension of the access window; the system
  MUST define and apply one clear rule (e.g., idempotent no-op, or explicit re-grant) rather
  than leaving the outcome to incidental behavior.
- **FR-012**: The system MUST resolve a person's overall access to paid features as the union
  of every valid source they currently hold (personal subscription, organization-provided
  seat, time-boxed grant), such that losing or expiring any one source does not remove access
  granted by another still-valid source.
- **FR-013**: A signed-in user MUST be able to start a paid subscription, complete payment,
  and have access to entitled features reflect that change without manual intervention.
- **FR-014**: A subscribed user MUST be able to view their current plan, update their payment
  method, and cancel their subscription without contacting support.
- **FR-015**: Canceling a subscription MUST preserve access through the end of the period
  already paid for, not end access immediately upon cancellation.
- **FR-016**: The system MUST process a given billing event (e.g., a payment succeeding,
  failing, or a subscription changing state) so that its effect on a user's entitlement is
  applied exactly once, even if the event is delivered to the system more than once.
- **FR-017**: A person's access to the pose library, meridian data, and any other open
  reference data MUST NOT require an account, a subscription, or any entitlement — this data
  remains freely readable regardless of billing state.
- **FR-018**: A person's access to *read* their own previously saved content (e.g., a flow
  they authored) MUST NOT be revoked by a lapsed subscription or expired grant; only access to
  paid *application features* (e.g., composing new content, cloud sync) may be gated by
  entitlement.
- **FR-019**: Deleting an account MUST NOT leave an organization without an owner and MUST
  NOT leave a billing subscription active with no account able to manage or cancel it; the
  system MUST define what happens in each case (e.g., block deletion until ownership is
  transferred, or auto-cancel billing) rather than leaving an orphaned state.
- **FR-020**: A person who signs up for the first time on a device that already holds locally
  saved practice content MUST be offered an explicit choice to claim that content into their
  new account; it MUST NOT be silently discarded and MUST NOT be silently auto-claimed without
  the person's confirmation.

### Key Entities *(include if feature involves data)*

- **Account (Profile)**: A person's identity within Krama, one per authenticated user.
  Carries personal, self-owned settings and is independent of any organization membership.
- **Organization**: A school, studio, or certifying body. Has one or more kinds, a name, and
  is the unit that owns cohorts, memberships, and (later) entitlement seats it grants to
  members.
- **Membership**: The relationship between one account and one organization — exactly one per
  pair — carrying one or more roles (e.g., owner, teacher, student) and a status (e.g.,
  active, suspended).
- **Invitation**: A pending, single-use, expirable offer for a specific email address to join
  a specific organization with a specific role. Distinct from a Membership until accepted.
- **Cohort**: A grouping within a certifying-body (or other) organization — e.g., a specific
  YTT-200 class — that a Membership can be enrolled into, and whose completion ("graduation")
  triggers an entitlement grant.
- **Entitlement / Grant**: A record of why a given account currently has (or had) access to
  paid features — a personal subscription, an organization-provided seat, or a time-boxed
  grant tied to a cohort completion. Multiple entitlements can be active for one account
  simultaneously.
- **Subscription**: A person's direct, self-managed paid relationship with the product,
  independent of any organization.
- **Integration Connection**: A placeholder record representing a future connection to an
  external scheduling/booking system (e.g., a studio's existing software) on behalf of an
  organization. Modeled for future use; no live connection is established by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A brand-new user can create an account and reach a fully usable personal
  experience (no organization required) in under 60 seconds from landing on the sign-up
  screen.
- **SC-002**: An organization owner can create an organization and send an invitation to a
  named recipient in under 2 minutes, without needing any documentation or support contact.
- **SC-003**: 100% of attempts to read another organization's data, or another member's
  personal content within the same organization, from an account not authorized to see it,
  are refused — verified by automated tests that assert zero rows or an explicit denial for
  every such attempt, not merely by manual spot-checking.
- **SC-004**: Marking a cohort member graduated results in that member's account reflecting
  expanded access within the same session, with no delay perceivable as "broken" (under 5
  seconds).
- **SC-005**: 100% of billing events delivered more than once to the system produce exactly
  one entitlement change, verified by automated tests simulating duplicate delivery.
- **SC-006**: A subscribed user can view their plan, update payment details, and cancel
  entirely through self-service, with 0 required support tickets for these three actions in
  normal operation.
- **SC-007**: A person who never creates an account, or who creates one with zero
  organizations, experiences no functional regression versus the pre-pivot product: reading a
  previously saved flow still works with no network connection.
- **SC-008**: Every account-deletion and last-owner-departure scenario identified in Edge
  Cases has a defined, tested outcome — 0 scenarios left as unspecified or "whatever the code
  happens to do."

## Assumptions

- "Email-based" sign-in may be implemented as password-based, one-time-code, or magic-link —
  the specific mechanism is a planning-phase decision; this spec requires only that an
  account be reachable without a Google account.
- The 90-day duration for a graduation grant is the default established in the approved
  platform-pivot plan; the exact number MUST be configurable by an organization rather than
  hard-coded, since different certifying bodies may choose a different grant length in the
  future, even though 90 days is the only value needed for this feature's launch.
- "Organization kinds" (school, studio, certifying body) are a fixed, small, extensible set at
  launch; a given organization may reasonably hold more than one kind (e.g., a studio that is
  also a certifying body) rather than being forced to pick exactly one.
- Integration connections (e.g., to a studio's existing scheduling software) are modeled as
  data only in this feature; no live third-party API call is made, and no user-facing
  integration workflow ships yet.
- Billing is provided by a third-party payment processor; this spec does not require or
  preclude any specific provider, only that subscription lifecycle (start, view, update,
  cancel, and event delivery reliability) behaves as specified.
- "Practice content" referenced in Story 5 and FR-009 refers to whatever a user has authored
  (today: saved flows; later, per Feature 005: journal/reflection entries) — this feature does
  not create those content types, but its membership and visibility model must not preclude
  keeping them private once they exist.
- Existing v0.1 local-only users are assumed to be a small, known population (chiefly the
  product's own author) for whom a manual or lightly-guided claim flow is acceptable; a
  fully automated bulk-migration tool is out of scope for this feature.
