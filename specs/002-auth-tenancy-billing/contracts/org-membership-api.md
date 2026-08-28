# Contract: Organization, Membership & Invitation Operations

All operations are Postgres RPCs (`SECURITY DEFINER` where noted) called through the
Supabase server client, not hand-rolled multi-statement application logic — the
transactional/authorization boundary lives in the database per research.md item 1.

## `app_create_organization(name text, org_types text[]) → organizations`

**Why an RPC, not a plain `INSERT`**: creating an org requires the creator to become its
first `owner` membership row, which cannot exist before the org does — a definer function
does both inserts in one transaction. (Appendix C.)

**Auth**: any authenticated user.
**Effect**: inserts `organizations` row + a `memberships` row for the caller with
`roles = '{owner}'`.
**Errors**: `check_violation` if `org_types` is empty or contains an unknown type.

## `POST` (application-level) — create invitation

**Request**: `{ org_id, email, roles }`.
**Auth**: caller MUST hold a role in `org_id` authorized to invite (owner or teacher,
per the org's role policy — exact role set finalized in the migration, not re-litigated
here).
**Behavior**:
1. Generate a random token; store only `sha256(token)` in `invitations.token_hash`.
2. Set `expires_at` (default policy: a bounded window, e.g. 7 days — configurable, not a
   magic client-supplied value).
3. Send the raw token embedded in an invitation email link (`/org/invitations/accept?token=…`);
   the raw token is never persisted (FR-005).
4. If an invitation to the same `(org_id, email)` already exists and is pending, this
   call updates its `roles`/`expires_at` in place (idempotent re-invite) rather than
   creating a duplicate row.

**Errors**: `insufficient_privilege` if caller lacks an inviting role in `org_id`.

## `app_accept_invitation(raw_token text) → memberships`

**Auth**: any authenticated user (the accepting account).
**Behavior** (`SECURITY DEFINER`, since the invitation row itself has no `SELECT` policy
— FR-005):
1. Hash `raw_token`, look up by `token_hash`.
2. Reject (generic error, no distinguishing detail per FR-005) if: not found, `revoked_at`
   is set, `accepted_at` is set, or `now() > expires_at`.
3. Reject if the invitation's `email` does not match a verified email on the caller's
   account (FR-006 — cross-account mismatch guard from the Edge Cases section).
4. Upsert `memberships(org_id, user_id)`: if a row exists, `roles = roles ∪ invitation.roles`
   (FR-007 — role union, not replace, not duplicate); if not, insert with
   `roles = invitation.roles`, `status = 'active'`.
5. Set `accepted_at = now()` (terminal state — a second call fails the "already accepted"
   check in step 2, satisfying FR from the double-acceptance edge case).

**Errors**: A single generic `invitation_invalid_or_expired` error for every rejection
branch in step 2/3 — deliberately not distinguishing why, to avoid the existence-leak
FR-005 forbids.

## Membership role/status changes

**`app_set_membership_roles(membership_id uuid, roles text[])`**
**Auth**: caller must hold an authorized role in the same org.
**Guard (trigger, not RLS)**: rejects if this change would remove `'owner'` from the last
remaining owner membership of the org — `restrict_violation` (FR-008, Edge Case
"organization's last owner leaves").
**Guard (trigger)**: rejects an admin adding `'owner'` to their own membership row
(self-escalation) — `insufficient_privilege`.

**`app_set_membership_status(membership_id uuid, status text)`**
**Auth**: caller must hold an authorized role in the same org.
**Effect**: `active ↔ suspended`. A suspended membership is excluded from
`app_org_ids()`/`app_visible_student_ids()` results for that user (loses access
immediately, not on next login).

## Cohort operations

**`app_grant_ytt_completion(cohort_id uuid, user_id uuid) → entitlement_grants | null`**
**Auth**: caller must be an authorized teacher/owner role for the cohort's org (or listed
in `cohort_teachers` for this cohort).
**Behavior** (`SECURITY DEFINER`, idempotent per FR-011):
1. Look up the `cohort_enrollments` row for `(cohort_id, user_id)`.
2. If `status = 'graduated'` already: return the existing grant reference, do nothing
   else (no re-grant, no window extension — Edge Case "double invitation/duplicate
   action" analog for graduation).
3. Else: set `status = 'graduated'`, `graduated_at = now()`; insert an
   `entitlement_grants` row with `source = 'cohort_graduation'`,
   `starts_at = now()`, `ends_at = now() + (cohort.grant_days_on_completion || '90 days')`.
   Both writes in one transaction.

**Errors**: `insufficient_privilege` if caller isn't authorized for the cohort.

## `app_revoke_signal_sharing(enrollment_id uuid)` / re-enable

**Auth**: caller MUST be the enrolled student (`user_id = (SELECT auth.uid())`).
**Effect**: toggles `cohort_enrollments.share_signals`. Immediately changes what
`app_visible_student_ids()` returns for that student's teachers (FR — Principle VIII
one-interaction revocation).
