# Contract: Billing (Stripe)

## `POST /billing/checkout` — create a Checkout session

**Auth**: any authenticated user.
**Request**: `{ plan_key }`.
**Behavior**: looks up/creates a `stripe_customers` row for the caller (1:1
`user_id ↔ stripe_customer_id`), creates a Stripe Checkout session for `plan_key`,
returns the redirect URL.
**Errors**: `unknown_plan` if `plan_key` doesn't match a `plan_features`-backed plan.

## `GET /billing` — plan view / manage / cancel entry point

Renders current `subscriptions` state (from `app_entitlements()`, not a direct table
read, so the UI and the enforcement path never disagree) plus a link to the Stripe
customer portal for self-serve plan changes/cancellation (FR-013/FR-014).

## `POST /api/webhooks/stripe` — webhook receiver

**Auth**: Stripe signature verification (`stripe.webhooks.constructEvent`), not
Supabase auth — this endpoint is unauthenticated in the app-session sense by design.

**Idempotency (research.md item 8, FR-016, SC-005)**:
1. Verify signature; reject with 400 on failure (no DB write).
2. `INSERT INTO stripe_events (stripe_event_id, processed_at) VALUES (...) ON CONFLICT
   (stripe_event_id) DO NOTHING RETURNING *`. If no row is returned, the event was
   already processed — return 200 immediately, no further action. This makes the
   handler correct under Stripe's documented at-least-once delivery without a
   separate lock.
3. Only on a fresh insert: dispatch on `event.type`
   (`checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`, …) and update
   `subscriptions`/`seat_assignments` accordingly, in the same transaction as the
   `stripe_events` insert (so a crash between insert and effect cannot happen —
   either both commit or neither does).

**`stripe_events` RLS**: `ENABLE ROW LEVEL SECURITY` with **zero policies** (not RLS
disabled) — `service_role` is `BYPASSRLS` and unaffected; every other role gets zero
rows, fail-closed at no cost to the webhook path (research.md item 8, diverging
deliberately from the NextMove reference).

**Cancellation semantics (FR-015)**: on `customer.subscription.deleted` (or
`updated` with `cancel_at_period_end = true`), access continues until
`current_period_end`, mirrored into `subscriptions.current_period_end` —
`app_entitlements()` reads this column directly, so there is no separate
"is still within paid period" branch to keep in sync.

## Verification obligations carried to the Verification section

- A duplicate webhook delivery (same `stripe_event_id` twice) MUST produce exactly one
  entitlement effect — test by POSTing the same signed payload twice and asserting the
  second is a no-op (SC-005).
- A canceled subscription MUST continue granting access until `current_period_end`, then
  stop — test by asserting `app_entitlements()` before/after a synthetic `ends_at` in
  the past.
