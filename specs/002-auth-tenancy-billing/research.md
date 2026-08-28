# Phase 0 Research: Auth, Tenancy & Billing Foundation

All decisions below were resolved during the platform-pivot planning pass (see
`/Users/eddie.rowe/.claude/plans/i-met-with-giaconda-declarative-dewdrop.md`, Appendices
A, D, F, G) against the NextMove reference implementation
(`/Users/eddie.rowe/Repos/NextMove/nextmove`). This document organizes those resolutions
for this feature's implementation; none are left open.

## 1. RLS recursion avoidance for a many-to-many org graph

**Decision**: Every cross-table visibility check is a `SECURITY DEFINER` SQL function
(`app_org_ids()`, `app_org_ids_with_role(text[])`, `app_is_org_member(uuid)`,
`app_has_org_role(uuid, text[])`, `app_co_member_ids()`, `app_visible_student_ids()`)
returning `uuid[]`, never `SETOF uuid`. Policies reference only the function call
(`org_id = ANY(app_org_ids())`), never `memberships` directly.

**Rationale**: RLS is not enforced against a table's owner. A migration-created
`SECURITY DEFINER` function reads `memberships` with RLS bypassed; since the policy body
never mentions `memberships`, the planner never re-enters the policy, avoiding
`42P17 infinite recursion detected in policy`. `uuid[]` (not `SETOF`) lets the planner
evaluate the call once per query as an InitPlan rather than once per row.

**Alternatives considered**: NextMove's `get_user_business_id()` (single business ID
column on `users`) — rejected outright, does not express many-to-many membership.
A `SETOF uuid` table function — rejected, re-evaluates per row, correctness-equivalent
but a needless performance regression at any real scale.

**Hardening rules, non-negotiable**:
- Never `ALTER TABLE memberships FORCE ROW LEVEL SECURITY` (would break every helper);
  documented in a `COMMENT ON TABLE`.
- Every `SECURITY DEFINER` function pins `SET search_path = public, pg_temp`.
- Every helper: `REVOKE EXECUTE ... FROM public; GRANT EXECUTE ... TO authenticated;`.
- Every `auth.uid()` reference inside a policy is wrapped `(SELECT auth.uid())`.
- Every policy names its role (`TO authenticated`) and every write policy carries both
  `USING` and `WITH CHECK`.

## 2. Session refresh: `proxy.ts`, not `middleware.ts`

**Decision**: Session-refresh logic lives in `src/proxy.ts`, calling `getUser()` (never
`getSession()`), and returns the same mutated `response` object rather than constructing
a fresh `NextResponse`.

**Rationale**: Next 16.2.9 registers both `middleware` and `proxy` as recognized
filenames (verified in `node_modules/next/dist/lib/constants.js`) — `proxy` is the new
canonical name. The wrong filename fails **silently**: no build error, no runtime error,
just no session refresh, and Server Components quietly render as anonymous. Only
`getUser()` revalidates the JWT server-side and actually refreshes the cookie;
`getSession()` trusts the (possibly stale) local cookie without revalidation. Returning a
fresh `NextResponse` instead of the mutated one silently drops the refreshed `Set-Cookie`
header.

**Alternatives considered**: `middleware.ts` (NextMove's approach, and the more
web-searchable convention) — explicitly rejected per the plan's stated goal of not
inheriting NextMove's gap. This is the single highest-value catch from the reference
review because it fails silently rather than loudly.

**Verification obligation carried to Verification/tasks**: a smoke test asserting a
*refreshed cookie* value changes across a request boundary, not merely that the build
succeeds — a passing build proves nothing about this bug.

## 3. `/auth/callback` and `/auth/confirm`

**Decision**: Two distinct route handlers. `/auth/callback` handles the OAuth/PKCE flow
(`exchangeCodeForSession`, for Google sign-in) with an open-redirect guard on the `next`
parameter (reject anything not starting with `/`, and explicitly reject `//`, which
URL-parses as a protocol-relative host). `/auth/confirm` handles the email-link flow,
which arrives with `token_hash` + `type` and requires `verifyOtp` — calling
`exchangeCodeForSession` on this path fails silently.

**Rationale**: NextMove has neither handler (its only sign-in path in that repo is
password-based). Both are required here since Story 1/2 require Google sign-in and an
email-based method. Conflating the two flows is a known failure mode (each verifies a
different token shape).

**Alternatives considered**: A single unified `/auth/callback` branching on query params
— rejected as fragile; the two flows have different security invariants (PKCE code
exchange vs. OTP verification) and conflating them is exactly the kind of thing that
"works in the demo, breaks for the second auth provider."

## 4. `supabase/config.toml`, committed

**Decision**: Commit `supabase/config.toml`, with every deploy origin — including Vercel
preview-branch URLs — listed in `additional_redirect_urls`.

**Rationale**: NextMove has no committed `config.toml` despite CI running
`supabase start`, meaning local dev and CI silently rely on implicit defaults. Missing a
preview URL in the redirect allowlist breaks login only on preview branches — a
class of bug that is invisible in local dev and production alike, and only surfaces to
whoever happens to test a preview deploy.

## 5. Generated types + drift check

**Decision**: `supabase gen types typescript` output is committed at
`src/types/database.ts`. `scripts/db-types-check.sh` regenerates against the
locally-applied migrations in CI and fails the build on any diff.

**Rationale**: NextMove has no generated types at all — every query there is untyped,
which is explicitly called out in the approved plan as a gap not to inherit. A CI drift
check (rather than a one-time generation) is what keeps the types honest as migrations
accumulate across `002`–`006`.

## 6. Entitlement resolution: one function, one escalation trap

**Decision**: `app_entitlements(uuid)` is the single `SECURITY DEFINER` function
resolving the union of personal subscription ∪ org seat assignment ∪ time-boxed grant.
It raises `insufficient_privilege` unless the subject argument equals the caller's own
`auth.uid()` or the caller is `service_role`.

**Rationale**: A definer function that accepts an arbitrary subject `uuid` and doesn't
check the caller is a read-anyone vector — anyone could resolve any other user's
entitlement state. This check is the single most important line in the function and gets
its own CI assertion (mirrored into `tests/integration/rls/`).

**Alternatives considered**: Resolving entitlements in application code by querying each
source table separately — rejected; it multiplies the number of places a policy mistake
or a forgotten `WHERE` clause could leak cross-user state, and duplicates the union logic
across every call site (composer feature gates, sadhana feature gates, teacher dashboard
gates in later features).

## 7. Encrypted credentials for `integration_connections`

**Decision**: Port NextMove's AES-256-GCM versioned-envelope pattern
(`src/services/integrations/crypto.ts`) verbatim, with a `v1:` prefix. Ciphertext columns
carry a column-level `REVOKE SELECT` so plaintext or ciphertext can never reach the
browser even via a misconfigured client query.

**Rationale**: This feature models `integration_connections` (e.g., a future MindBody
link) but makes **no live API calls** — the encryption-at-rest requirement exists so that
whenever a real credential is first stored (in a later feature), the safe path already
exists and doesn't get retrofitted under time pressure.

**Deferred, tracked in Appendix G / carried to `speckit-clarify` if this feature's scope
grows to include a real integration**: key-rotation runbook for the `ENCRYPTION_KEY` —
NextMove has no `v2` envelope path or re-encryption job. Not blocking for this feature
since no real credential is written yet, but flagged so it isn't forgotten.

## 8. Stripe idempotency

**Decision**: `stripe_events` table records every processed webhook event ID before
acting on it; the webhook handler is a no-op on a duplicate ID. `stripe_events` has row
level security **enabled with zero policies** (not RLS disabled) — `service_role`
bypasses RLS regardless (`BYPASSRLS`), so this is fail-closed for every other role with no
practical cost to the webhook path.

**Rationale**: Stripe explicitly documents at-least-once delivery; FR-016 and SC-005
require exactly-once entitlement effect regardless. Diverges from NextMove's approach
(RLS off entirely) for defense-in-depth at zero cost.

## 9. Reference-implementation gaps deliberately not ported

Confirmed exclusion list, each with why it matters for this feature specifically:
- NextMove's untyped Supabase queries → addressed by item 5 above.
- NextMove's `middleware.ts` (no session refresh at all in some paths) → addressed by
  item 2.
- NextMove's uncommitted `supabase/config.toml` → addressed by item 4.
- NextMove's missing `/auth/callback` → addressed by item 3.
- NextMove's disabled coverage thresholds → not inherited; this feature's own new
  RLS-assertion suite and entitlement-resolution unit tests are added to CI as gating
  checks, not advisory ones (see quickstart.md and the Verification section of the
  platform-pivot plan).
- NextMove's `get_user_business_id()` single-tenant assumption → addressed by item 1;
  this is the one gap that would have caused a silent correctness bug (not just a missing
  feature) had it been ported as-is.
