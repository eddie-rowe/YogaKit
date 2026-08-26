# Phase 1 Data Model: Auth, Tenancy & Billing Foundation

This is the application-facing view of the entities this feature owns. The full SQL,
RLS policies, and cross-feature context (including tables that belong to later features
but are referenced here for the privacy-boundary argument) live in
`docs/design/002-schema.md`.

## Profile

Represents a person's identity within Krama, 1:1 with `auth.users`.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | = `auth.users.id` |
| `display_name` | text | Self-set, editable |
| `timezone` | text | IANA tz name; used later by sadhana day-boundary logic (`005`), stored here since it's a profile-level setting |
| `created_at` | timestamptz | |

**Validation**: `display_name` non-empty. `timezone` must be a valid IANA identifier
(validated at write time, not by a DB constraint — the IANA database updates more often
than a `CHECK` list should be maintained by hand).

**Relationships**: One Profile ↔ many Memberships (via `memberships.user_id`).

## ProfileCard

A separate, narrower read surface: the *only* identity data a co-member of an
organization may read about another member.

| Field | Type | Notes |
|---|---|---|
| `user_id` | uuid | = `profiles.id` |
| `display_name` | text | Mirrors `profiles.display_name` |

**Why a separate table, not a view**: Postgres 15+ defaults views to
`security_invoker = false` — a view over `profiles` would run as its owner with RLS
bypassed, silently exposing every `profiles` column to any reader of the view. A
physically separate table with its own RLS policy makes the boundary schema-visible.

**Relationships**: 1:1 with Profile, kept in sync by a trigger on `profiles` writes.

## Organization

A school, studio, or certifying body.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | text | |
| `org_types` | text[] | e.g. `{'studio','certifying_body'}` — a studio that is also a certifying body is one row with two types (FR-003, Assumption) |
| `created_at` | timestamptz | |
| `created_by` | uuid | References the founding Profile |

**Validation**: `org_types` non-empty, each element from a known enum-like `CHECK (x IN
(...))` set (chosen over a Postgres `ENUM` type so a later migration can widen the set
without an `ALTER TYPE` migration hazard).

**State transitions**: None at creation time beyond existence; `org_types` may be
widened later by an owner (e.g., a studio becomes a certifying body) — not narrowed
without a support-mediated review, since narrowing could orphan a `cohorts` row whose
`kind` depends on the certifying-body type.

## Membership

The relationship between one Profile and one Organization — exactly one row per pair.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `org_id` | uuid | |
| `user_id` | uuid | |
| `roles` | text[] | e.g. `{'owner'}`, `{'teacher','student'}` |
| `status` | text | `active` \| `suspended` |
| `created_at` | timestamptz | |

**Validation**: `UNIQUE(org_id, user_id)` — FR-007's "at most one membership per pair"
requirement. A second invitation to the same org unions roles onto the existing row
rather than erroring or duplicating (FR-007).

**State transitions**: `active` → `suspended` (by an authorized org role) → `active`
(reinstatement). `roles` may gain or lose elements; removing the last `owner` role from
the last owner of an org is blocked by trigger (FR-008), described in
`docs/design/002-schema.md` §C.

**Known limitation, tracked for `speckit-clarify`**: `roles text[]` forfeits per-role
status (e.g., "suspended as teacher, active as owner" is not representable — `status`
applies to the whole membership). Cheap to change now; flagged in Appendix G of the
platform-pivot plan as worth re-confirming, not blocking for this feature's launch scope.

## Invitation

A pending, single-use, expirable offer.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `org_id` | uuid | |
| `email` | text | The invited address |
| `roles` | text[] | Role(s) to grant on acceptance |
| `token_hash` | text | sha256 of the raw token; the raw token is never stored |
| `expires_at` | timestamptz | |
| `revoked_at` | timestamptz \| null | |
| `accepted_at` | timestamptz \| null | |
| `created_by` | uuid | |

**Validation**: No `SELECT` policy exists for any role, including the invited person
themself, before acceptance — FR-005's "not discoverable, listable, or guessable"
requirement. Acceptance is a `SECURITY DEFINER` RPC (`app_accept_invitation(raw_token,
accepting_user_id)`) keyed on the raw token, verified against `token_hash`, and checked
against the accepting account's verified email (FR-006). Expired, revoked, or
already-accepted invitations fail the RPC without distinguishing *why* in the response
(FR-005's "MUST NOT reveal whether the invitation ever existed").

**State transitions**: pending → accepted (terminal, `accepted_at` set, triggers
Membership upsert) | pending → revoked (terminal) | pending → expired (implicit, by
`expires_at`, checked at acceptance time, not a stored state).

## Cohort

A grouping within an organization (e.g., a specific YTT-200 class).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `org_id` | uuid | |
| `name` | text | |
| `kind` | text | e.g. `ytt_200` |
| `grant_days_on_completion` | int | Default 90 (FR-010, configurable per Assumption) |
| `created_at` | timestamptz | |

## CohortEnrollment

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `cohort_id` | uuid | |
| `user_id` | uuid | |
| `status` | text | `enrolled` \| `graduated` |
| `graduated_at` | timestamptz \| null | |
| `share_signals` | boolean | Default `true` on enrollment; student-writable, teacher-read-only (forward-compatibility placeholder for `005`'s Principle VIII wiring — see Constitution Check row VIII) |

**State transitions**: `enrolled` → `graduated` (via `app_grant_ytt_completion(cohort_id,
user_id)`, a `SECURITY DEFINER` RPC, authorized against the caller's org role). FR-011
requires this transition be idempotent: calling it again on an already-`graduated`
enrollment is a no-op (does not re-grant, does not extend the window) — the RPC checks
current status before creating an EntitlementGrant.

## CohortTeacher

Optional narrowing of which org members are recognized as teachers of a specific cohort
(distinct from the org-wide `teacher` role — a teacher may belong to the org without
teaching every cohort).

| Field | Type | Notes |
|---|---|---|
| `cohort_id` | uuid | |
| `user_id` | uuid | |

## IntegrationConnection

Modeled only; no live API calls in this feature.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `org_id` | uuid | |
| `provider` | text | e.g. `mindbody` |
| `encrypted_credentials` | text | AES-256-GCM envelope, `v1:` prefixed; column carries `REVOKE SELECT` from all non-`service_role` roles |
| `status` | text | `disconnected` (the only status reachable in this feature — `connected` requires a live call, out of scope) |
| `created_at` | timestamptz | |

## EntitlementGrant

A time-boxed grant of paid-feature access, independent of subscription state.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | |
| `source` | text | `cohort_graduation` (only source in this feature; extensible) |
| `source_ref` | uuid | e.g. the `cohort_enrollments.id` that produced it |
| `starts_at` | timestamptz | |
| `ends_at` | timestamptz | `starts_at + grant_days_on_completion` |
| `created_at` | timestamptz | |

## Subscription / StripeCustomer / SeatAssignment / PlanFeature / StripeEvent

Billing tables, detailed in `docs/design/002-schema.md` §C ("Billing"). Application-level
summary:

- **PlanFeature**: features as data (`{feature_key, plan_key}` rows), so a tier can be
  re-cut without a deploy.
- **StripeCustomer**: 1:1 `user_id` ↔ Stripe customer ID.
- **Subscription**: mirrors Stripe subscription state (`active`, `canceled`,
  `past_due`, etc.) and current period end — the source FR-015's "access continues to
  period end" reads from.
- **SeatAssignment**: an org-provided entitlement seat assigned to a member (distinct
  from a personal Subscription).
- **StripeEvent**: `{stripe_event_id PRIMARY KEY, processed_at}` — the idempotency
  ledger (research.md item 8).

## Entitlement resolution (derived, not a table)

`app_entitlements(user_id uuid) → jsonb` (or a typed composite) is a `SECURITY DEFINER`
function, **not** a table, computed on read: `UNION` of
(a) an active Subscription for `user_id`,
(b) an active SeatAssignment for `user_id`,
(c) any EntitlementGrant for `user_id` where `now() BETWEEN starts_at AND ends_at`.
Raises `insufficient_privilege` unless `user_id = (SELECT auth.uid())` or caller is
`service_role` (research.md item 6).

## Entity relationship summary

```text
Profile 1───1 ProfileCard
Profile 1───* Membership *───1 Organization
Organization 1───* Invitation
Organization 1───* Cohort 1───* CohortEnrollment *───1 Profile
Cohort 1───* CohortTeacher *───1 Profile
Organization 1───* IntegrationConnection
CohortEnrollment 1───0..1 EntitlementGrant (via app_grant_ytt_completion)
Profile 1───0..1 StripeCustomer 1───* Subscription
Organization 1───* SeatAssignment *───1 Profile
(Profile, Subscription, SeatAssignment, EntitlementGrant) ──→ app_entitlements() [computed union]
```
