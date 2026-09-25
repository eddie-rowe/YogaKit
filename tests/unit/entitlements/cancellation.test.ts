import { describe, it, expect, vi } from 'vitest'
import type Stripe from 'stripe'

vi.mock('server-only', () => ({}))

import { handleStripeEvent, type BillingStore, type SubscriptionRow } from '@/lib/stripe/handle-event'

// T054, the webhook-layer half of the belt-and-suspenders pair —
// scripts/verify-migrations.sh's T054a/T054b assert the same rule at the
// enforcement layer (app_entitlements() itself). This half asserts the
// mapping rule contracts/billing-webhooks.md states explicitly: a
// cancel-at-period-end subscription must keep granting access until
// current_period_end, not the moment cancellation is requested.
class FakeBillingStore implements BillingStore {
  subscriptionsById = new Map<string, SubscriptionRow>()

  async getUserIdForStripeCustomer() {
    return 'user_1'
  }

  async upsertSubscription(row: SubscriptionRow) {
    this.subscriptionsById.set(row.stripe_subscription_id, row)
  }
}

function subscriptionEvent(type: string, subscription: Partial<Stripe.Subscription>): Stripe.Event {
  return {
    id: `evt_${type}`,
    type,
    data: {
      object: {
        id: 'sub_test_cancel',
        customer: 'cus_test_1',
        items: {
          data: [
            {
              current_period_end: Math.floor(Date.parse('2026-10-25T00:00:00Z') / 1000),
              price: { lookup_key: 'pro' },
            },
          ],
        },
        metadata: {},
        ...subscription,
      },
    },
  } as unknown as Stripe.Event
}

describe('cancellation status mapping (T054)', () => {
  it('cancel_at_period_end=true keeps status active and refreshes current_period_end', async () => {
    const store = new FakeBillingStore()

    await handleStripeEvent(
      subscriptionEvent('customer.subscription.updated', { status: 'active', cancel_at_period_end: true }),
      store,
    )

    const row = store.subscriptionsById.get('sub_test_cancel')
    expect(row?.status).toBe('active')
    expect(row?.current_period_end).toBe('2026-10-25T00:00:00.000Z')
  })

  it('customer.subscription.deleted at the true end of the period writes status canceled', async () => {
    const store = new FakeBillingStore()

    await handleStripeEvent(
      subscriptionEvent('customer.subscription.deleted', { status: 'canceled', cancel_at_period_end: true }),
      store,
    )

    const row = store.subscriptionsById.get('sub_test_cancel')
    expect(row?.status).toBe('canceled')
  })

  it('never writes status canceled off an updated event alone, only off what Stripe reports', async () => {
    const store = new FakeBillingStore()

    // Even if a caller mistakenly believed cancellation should be applied
    // eagerly, this handler has no branch that derives 'canceled' itself —
    // it only ever mirrors subscription.status verbatim.
    await handleStripeEvent(
      subscriptionEvent('customer.subscription.updated', { status: 'active', cancel_at_period_end: true }),
      store,
    )

    expect(store.subscriptionsById.get('sub_test_cancel')?.status).not.toBe('canceled')
  })
})
