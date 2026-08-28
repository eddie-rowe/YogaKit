# Schema Design: Auth, Tenancy & Billing Foundation (002)

This document reproduces the schema design decided during the platform-pivot planning
pass (`/Users/eddie.rowe/.claude/plans/i-met-with-giaconda-declarative-dewdrop.md`,
Appendices A–G) as the durable design record for feature `002`. It is scoped to the
tables `002` actually creates — **identity & tenancy, cohorts, and billing**. Flows,
poses, and sadhana tables are documented for context (they attach to this feature's org
graph) but belong to `003`/`004`/`005` respectively and are NOT created by this feature's
migrations.

## §A. RLS foundation — the recursion-avoidance pattern

NextMove's `get_user_business_id()` assumes one org per user and does not transfer to a
many-to-many graph. The naive many-to-many version deadlocks: a policy on `memberships`
that queries `memberships` raises `42P17 infinite recursion detected in policy`.

**The mechanism that breaks the cycle**: RLS is not enforced against a table's *owner*.
Migrations run as `postgres`, so a `SECURITY DEFINER` function created in a migration
reads `memberships` with RLS bypassed. A policy whose body is only a function call never
references `memberships` directly, so the planner never re-enters the policy.

**Three non-negotiable rules**:
1. **Never `ALTER TABLE memberships FORCE ROW LEVEL SECURITY`.** It would break every
   helper. Documented via `COMMENT ON TABLE memberships IS '... never FORCE RLS ...'`.
2. **Every `SECURITY DEFINER` function pins `SET search_path = public, pg_temp`.**
   Without it, a caller who can create objects earlier on the search path hijacks the
   definer's privileges.
3. **`REVOKE EXECUTE ... FROM public; GRANT EXECUTE ... TO authenticated;`** on every
   helper — a definer function granted to `public` is granted to `anon`.

**Additional hardening**:
- Helpers return `uuid[]`, not `SETOF uuid`, so `org_id = ANY(app_org_ids())` evaluates
  once per query as an InitPlan rather than once per row.
- Every `auth.uid()` reference inside a policy is wrapped `(SELECT auth.uid())`.
- Every policy names its role (`TO authenticated`); every write policy carries both
  `USING` and `WITH CHECK` — `USING` alone lets a row be re-owned or moved to another org.

**Core helper functions** (all `SECURITY DEFINER`, all following the rules above):

| Function | Returns | Purpose |
|---|---|---|
| `app_org_ids()` | `uuid[]` | Orgs the caller belongs to |
| `app_org_ids_with_role(text[])` | `uuid[]` | Orgs where caller holds one of the given roles |
| `app_is_org_member(uuid)` | `boolean` | Membership check for a specific org |
| `app_has_org_role(uuid, text[])` | `boolean` | Role check for a specific org |
| `app_co_member_ids()` | `uuid[]` | User IDs sharing any org with the caller |
| `app_visible_student_ids()` | `uuid[]` | Students whose signals the caller (as teacher) may read — respects `share_signals` |

**CI assertion**: a bare `SELECT count(*) FROM memberships` as role `authenticated` MUST
NOT raise `42P17`. This is the cheapest possible regression check for the whole pattern.

## §B. The privacy boundary is structural, not conditional

Principle VIII requires practice *content* stay teacher-unreadable. The mechanism is
giving content **no column a policy could join on** — this feature owns the org/cohort
graph these tables will attach to; the tables themselves are `005`'s.

- **`practice_checkins`** (005, signal table): `local_date`, `duration_minutes`, `kind`.
  No content, by construction. A cohort teacher's `SELECT` is gated by
  `app_visible_student_ids()`.
- **`practice_reflections`** (005, content table), 1:1 with a check-in: `mood`, `energy`,
  `note`, `flow_id`. One policy, `user_id = (SELECT auth.uid())`, on all four verbs. No
  teacher policy, no org policy, and **no `org_id`/`cohort_id` column to write one
  against**.

**Why not column-level grants**: RLS is row-level only; Postgres column grants are
role-level, so "teacher may read two columns of these rows" is inexpressible without also
blocking the owner from their own columns. The table split makes widening the boundary
require a schema migration a reviewer will see.

**This feature's obligation**: `cohort_enrollments.share_signals` (boolean,
student-writable, teacher-read-only) is created here, in `002`, even though no content
table exists yet — it's the row a user can flip to revoke, satisfying Principle VIII's
"every visibility grant MUST be a row a user can delete/revoke" requirement at the
membership layer immediately, ahead of `005`'s content tables.

**Placement decisions flagged for `speckit-clarify`** (carried forward, not re-litigated
here): `flow_id` lives on `reflections` not `checkins` (on the signal table it would give
a teacher a cross-student correlation handle); `mood`/`energy` are classified as content
(visible mood would make students stop recording it honestly).

**CI assertion (stubbed now, filled in by `005`)**: a placeholder RLS test asserting the
*absence* of any content table a teacher role can query — this feature creates no content
table, so the assertion is trivially true today and becomes meaningful once `005` lands.

## §C. Tables by domain

### Identity & tenancy (IN SCOPE for 002)

**`profiles`** — 1:1 with `auth.users`. `id uuid PRIMARY KEY REFERENCES auth.users(id)`,
`display_name text NOT NULL`, `timezone text NOT NULL`, `created_at timestamptz`.
Policy: `user_id = (SELECT auth.uid())`, all verbs.

**`profile_cards`** — the *only* identity data a co-member may read. A separate physical
table, not a view (Postgres 15+ defaults views to `security_invoker = false`; a view over
`profiles` would run as owner with RLS bypassed, silently exposing every `profiles`
column). `user_id uuid PRIMARY KEY REFERENCES profiles(id)`, `display_name text`. Kept in
sync by an `AFTER INSERT OR UPDATE` trigger on `profiles`. Policy: readable by
`app_co_member_ids()`.

**`organizations`** — `id uuid PRIMARY KEY`, `name text NOT NULL`,
`org_types text[] NOT NULL CHECK (array_length(org_types,1) > 0)` with each element
`CHECK`ed against a known set (`'school'`, `'studio'`, `'certifying_body'`) — a
`CHECK` list, not a Postgres `ENUM`, so a later migration can widen it without an
`ALTER TYPE` migration hazard. `created_at timestamptz`, `created_by uuid`. A studio that
is also a certifying body is one row with two elements in `org_types`.

**`memberships`** — `id uuid PRIMARY KEY`, `org_id uuid REFERENCES organizations(id)`,
`user_id uuid REFERENCES profiles(id)`, `roles text[] NOT NULL`,
`status text NOT NULL CHECK (status IN ('active','suspended'))`, `created_at timestamptz`,
`UNIQUE(org_id, user_id)` — one relationship, one lifecycle; a second invite unions roles
onto the existing row (exactly how a studio owner also becomes a teacher).
**`COMMENT ON TABLE memberships IS 'Never FORCE ROW LEVEL SECURITY on this table — it
would break every app_* SECURITY DEFINER helper that reads it with RLS bypassed.'`**

Two escalation holes RLS cannot close, closed with triggers (not policies, since a policy
can't easily express "unless this is the last row matching X"):
- `trg_prevent_last_owner_removal` — `BEFORE UPDATE OR DELETE` on `memberships`: raises
  `restrict_violation` if the change would leave an org with zero `owner` memberships.
- `trg_prevent_self_escalation` — `BEFORE UPDATE` on `memberships`: raises
  `insufficient_privilege` if the caller is adding `'owner'` to their own row (an
  existing owner or a service-role-driven process may still grant ownership to others).

`app_create_organization(name, org_types)` — `SECURITY DEFINER` RPC, since creating an
org requires an owner membership that cannot yet exist; inserts both rows transactionally.

**`invitations`** — `id uuid PRIMARY KEY`, `org_id uuid`, `email text NOT NULL`,
`roles text[] NOT NULL`, `token_hash text NOT NULL` (sha256 of the raw token; the raw
token is never persisted), `expires_at timestamptz NOT NULL`,
`revoked_at timestamptz`, `accepted_at timestamptz`, `created_by uuid`. **No `SELECT`
policy for any role, including the invitee** — there is no email-enumeration surface.
Acceptance is `app_accept_invitation(raw_token)`, a `SECURITY DEFINER` RPC keyed on the
raw token, checked against the accepting account's verified email.

**`integration_connections`** — modeled only, no live API calls in this feature. `id`,
`org_id`, `provider text`, `encrypted_credentials text` (AES-256-GCM versioned envelope,
`v1:` prefix, ported from NextMove's `src/services/integrations/crypto.ts`),
`status text CHECK (status = 'disconnected')` (the only status reachable without a live
call), `created_at`. Column-level `REVOKE SELECT` on `encrypted_credentials` from every
role but `service_role`, so ciphertext can never reach the browser even via a
misconfigured client query.

### Cohorts (IN SCOPE for 002)

**`cohorts`** — `id`, `org_id`, `name text`, `kind text` (e.g. `'ytt_200'`),
`grant_days_on_completion int NOT NULL DEFAULT 90`, `created_at`.

**`cohort_enrollments`** — `id`, `cohort_id`, `user_id`,
`status text CHECK (status IN ('enrolled','graduated'))`, `graduated_at timestamptz`,
`share_signals boolean NOT NULL DEFAULT true` — the Principle VIII revocation row,
created here ahead of `005`'s content tables.

**`cohort_teachers`** — `cohort_id`, `user_id` — optional narrowing of which org members
are recognized teachers of a specific cohort (distinct from the org-wide `teacher` role).

`app_grant_ytt_completion(cohort_id, user_id)` — `SECURITY DEFINER` RPC, idempotent
(checks current `status` before granting), authorized against the caller's cohort/org
role; marks the enrollment `graduated` and inserts an `entitlement_grants` row in one
transaction.

### Flows & poses (OUT OF SCOPE for 002 — documented for context only)

`flows` + `flow_items` + `phases` (normalized, document-level write semantics) and the
generated read-only `poses` mirror table belong to `003`/`004`. They are noted here only
because `flow_items.pose_slug` will eventually carry a real FK into the `poses` mirror,
and because entitlement gates on flow limits (§Entitlements below) will reference
`flows.user_id`, which this feature's `profiles`/`memberships` graph must support.

**`claimed_flows` (IN SCOPE for 002, deliberately temporary)** — added in Phase 3 (T030)
because the user chose to migrate a device's IndexedDB v1 flows at sign-up time rather
than only record a claim/decline decision. `004`'s normalized schema above doesn't exist
yet, and designing it early to receive one claim-time write would mean designing it
twice — so `002` gets a minimal landing table instead: `id`, `user_id references
auth.users`, `source_flow_id text` (the IndexedDB `Flow.id`), `payload jsonb` (the whole
`.krama.json`-shape export via `exportKramaFile()`), `claimed_at timestamptz`. Self-only
RLS on all four verbs, same pattern as every other self-scoped table in §C. No FK to
`flows` — `004` reads straight out of `payload` when it builds the real normalized rows,
then may retire this table or keep it as an audit trail; that decision belongs to `004`.

### Sadhana (OUT OF SCOPE for 002 — documented for context only)

`intentions`, `practice_checkins`, `practice_reflections`, `practice_ritual_state`,
`practice_milestones` belong to `005`. §B above documents the structural privacy split
these tables must respect; `002` provides the `cohort_enrollments.share_signals` column
they will read.

### Billing (IN SCOPE for 002)

**`plan_features`** — `plan_key text`, `feature_key text`, `PRIMARY KEY (plan_key,
feature_key)` — features as data, so a tier can be re-cut without a deploy.

**`stripe_customers`** — `user_id uuid PRIMARY KEY REFERENCES profiles(id)`,
`stripe_customer_id text UNIQUE NOT NULL`.

**`subscriptions`** — `id`, `user_id`, `stripe_subscription_id text UNIQUE`,
`plan_key text`, `status text` (mirrors Stripe: `active`, `canceled`, `past_due`, etc.),
`current_period_end timestamptz` — the column FR-015's "access continues to period end"
reads directly, so there is no separate "still within paid period" branch to keep in
sync with Stripe's own state.

**`seat_assignments`** — `id`, `org_id`, `user_id`, `plan_key text` — an org-provided
entitlement seat assigned to a member, distinct from a personal `subscriptions` row.

**`entitlement_grants`** — `id`, `user_id`, `source text` (`'cohort_graduation'` in this
feature; extensible), `source_ref uuid`, `starts_at timestamptz`, `ends_at timestamptz`,
`created_at`.

**`stripe_events`** — `stripe_event_id text PRIMARY KEY`, `processed_at timestamptz`.
`ENABLE ROW LEVEL SECURITY` with **zero policies** (not RLS disabled) — `service_role` is
`BYPASSRLS` and unaffected; every other role gets zero rows, fail-closed at no cost to
the webhook path (diverges deliberately from the NextMove reference, which disables RLS
entirely on the equivalent table).

## §D. Entitlement resolution

`app_entitlements(user_id uuid) → jsonb` — the single `SECURITY DEFINER` function
resolving the union of: (a) an active `subscriptions` row, (b) an active
`seat_assignments` row, (c) any `entitlement_grants` row where
`now() BETWEEN starts_at AND ends_at`.

**The escalation trap**: a definer function accepting an arbitrary subject `uuid` is a
read-anyone vector unless guarded. `app_entitlements` raises `insufficient_privilege`
unless `user_id = (SELECT auth.uid())` or the caller is `service_role`. This is the
single most safety-critical line in this feature's schema and carries its own CI
assertion (mirrored into `tests/integration/rls/`).

App code calls one module, `src/lib/entitlements/index.ts`, wrapping the RPC in React
`cache()` for one round trip per request. Where a limit must be **unbypassable** rather
than merely UI-hidden, it is encoded in the relevant table's `WITH CHECK` clause directly
— a forged client request cannot exceed it (this specific enforcement point belongs to
whichever feature owns the limited resource, e.g. `004` for a flow-count cap).

## §F. Client & auth setup — the four gaps NextMove has, closed here

1. **Generated types.** `supabase gen types typescript` → committed
   `src/types/database.ts`. `scripts/db-types-check.sh` regenerates against
   locally-applied migrations in CI and fails the build on any diff.
2. **Session refresh via `src/proxy.ts`, not `middleware.ts`.** Next 16.2.9 registers
   both `middleware` and `proxy` as recognized filenames; `proxy` is canonical. The wrong
   filename fails **silently** — no build error, no runtime error, just no session
   refresh, and Server Components quietly render as anonymous. Use `getUser()` (JWT
   revalidation), never `getSession()` (trusts a possibly-stale cookie). Return the same
   mutated `response` object, not a fresh `NextResponse`, or the refreshed `Set-Cookie`
   is dropped.
3. **`/auth/callback` (PKCE) and `/auth/confirm` (OTP), as two distinct handlers.**
   `/auth/callback` calls `exchangeCodeForSession` with an open-redirect guard on `next`
   (reject anything not starting with `/`, and explicitly reject `//`). `/auth/confirm`
   calls `verifyOtp({ token_hash, type })` — calling `exchangeCodeForSession` on this path
   fails silently.
4. **`supabase/config.toml`, committed**, with every deploy origin — including Vercel
   preview-branch URLs — in `additional_redirect_urls`, so preview-branch login doesn't
   silently break.

Service client (`src/lib/supabase/service.ts`) gets `persistSession: false`, a
module-level `typeof window !== 'undefined'` throw, and an ESLint
`no-restricted-imports` rule banning it from any `'use client'` module.

## §G. Carried-forward questions for `speckit-clarify`

Resolved above with a stated default; worth re-confirming with fresh eyes, not blocking
for this feature's launch scope:

- **`memberships.roles text[]`** forfeits per-role status (e.g. "suspended as teacher,
  active as owner" is not representable — `status` applies to the whole membership row).
  Cheap to change now (before real membership data exists), expensive later.
- **Content classification of `mood`/`energy` and `flow_id`** on the future `005`
  reflections table (§B) — confirmed here as content/signal-adjacent respectively, but
  `005`'s spec should re-affirm before the table is created.
- **`ENCRYPTION_KEY` rotation runbook** for `integration_connections.encrypted_credentials`
  — the `v1:` envelope prefix supports future versioning, but no `v2` path or
  re-encryption job exists yet. Not blocking since this feature writes no real credential,
  but should exist before the first real MindBody (or similar) credential is stored.
