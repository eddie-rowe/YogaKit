import 'server-only'

import type Stripe from 'stripe'

// Narrow interface, not the full Supabase client shape — keeps this module
// testable with a plain in-memory fake (T053/T054's unit tests), no network
// and no real Postgres. src/app/api/webhooks/stripe/route.ts supplies the
// real implementation backed by createServiceClient().
export interface BillingStore {
  getUserIdForStripeCustomer(stripeCustomerId: string): Promise<string | null>
  upsertSubscription(row: SubscriptionRow): Promise<void>
}

export interface SubscriptionRow {
  user_id: string
  stripe_subscription_id: string
  plan_key: string
  status: string
  current_period_end: string
}

// A subscription's plan_key travels as the Stripe Price's lookup_key — the
// same value the checkout route resolves plan_key -> Price through
// (src/app/billing/checkout/route.ts), so no separate app-side price-id map
// exists to drift out of sync. Falls back to subscription-level metadata for
// a subscription created before a given Price had a lookup_key.
function resolvePlanKey(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0]
  const lookupKey = item?.price && typeof item.price !== 'string' ? item.price.lookup_key : null
  if (lookupKey) return lookupKey
  const metadataPlanKey = subscription.metadata.plan_key
  return typeof metadataPlanKey === 'string' ? metadataPlanKey : null
}

// current_period_end lives on the subscription item, not the subscription
// itself, per the Stripe API's per-item billing periods.
function resolveCurrentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0]
  if (!item) return null
  return new Date(item.current_period_end * 1000).toISOString()
}

async function upsertFromSubscription(store: BillingStore, subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const userId = await store.getUserIdForStripeCustomer(customerId)
  const planKey = resolvePlanKey(subscription)
  const currentPeriodEnd = resolveCurrentPeriodEnd(subscription)

  if (!userId || !planKey || !currentPeriodEnd) {
    // Nothing safe to write. The caller (the webhook route) logs this case;
    // returning quietly here means a webhook this handler cannot fully
    // resolve does not throw and does not retry forever — Stripe's own
    // customer.subscription.updated event, sent moments later in the normal
    // checkout flow, is expected to fill in whatever is still missing.
    return
  }

  await store.upsertSubscription({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    plan_key: planKey,
    status: subscription.status,
    current_period_end: currentPeriodEnd,
  })
}

// The dispatch table behind src/app/api/webhooks/stripe/route.ts
// (contracts/billing-webhooks.md). Idempotency is the caller's job — the
// route's stripe_events claim-then-process insert decides whether this ever
// runs for a given delivery. This function is additionally safe to call
// twice with the same event on its own, because every write here is an
// upsert keyed on stripe_subscription_id, never a bare insert (T053).
//
// Status mapping rule (contracts/billing-webhooks.md "Cancellation
// semantics", FR-015): `customer.subscription.updated` with
// `cancel_at_period_end = true` must keep access alive until
// `current_period_end`. This function writes `subscription.status` exactly
// as Stripe reports it rather than deriving a status of its own — Stripe
// itself keeps `status: 'active'` while `cancel_at_period_end` is true, and
// only reports `'canceled'` once the subscription is actually deleted at
// period end. Mirroring Stripe's status verbatim means this rule holds by
// construction; a bespoke status derivation here is exactly the kind of
// thing that could drift from Stripe's own semantics later (T054).
export async function handleStripeEvent(event: Stripe.Event, store: BillingStore): Promise<void> {
  switch (event.type) {
    // checkout.session.completed carries the new subscription only as an
    // unexpanded id — webhook payloads never expand nested references. The
    // customer.subscription.created event Stripe sends around the same time
    // carries the full Subscription object, so that event does the actual
    // write; this case is a deliberate no-op rather than an omission.
    case 'checkout.session.completed':
      return

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await upsertFromSubscription(store, subscription)
      return
    }

    default:
      // Stripe sends far more event types than this feature reacts to.
      // Ignoring the rest is correct behaviour, not a gap.
      return
  }
}
