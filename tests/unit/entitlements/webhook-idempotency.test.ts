import { describe, it, expect, vi } from 'vitest'
import type Stripe from 'stripe'

// Next.js's webpack build swaps 'server-only' for a no-op on the server; plain
// vitest has no such build step, so this stub matches resolve.test.ts's
// existing pattern for the same import in src/lib/entitlements/index.ts.
vi.mock('server-only', () => ({}))

import { handleStripeEvent, type BillingStore, type SubscriptionRow } from '@/lib/stripe/handle-event'

// A minimal in-memory fake — no network, no real Postgres. T053: a duplicate
// webhook delivery (same event replayed against this pure handler) must
// produce exactly one entitlement effect, not two.
class FakeBillingStore implements BillingStore {
  customersByStripeId = new Map<string, string>()
  subscriptionsById = new Map<string, SubscriptionRow>()
  upsertCalls = 0

  async getUserIdForStripeCustomer(stripeCustomerId: string) {
    return this.customersByStripeId.get(stripeCustomerId) ?? null
  }

  async upsertSubscription(row: SubscriptionRow) {
    this.upsertCalls += 1
    this.subscriptionsById.set(row.stripe_subscription_id, row)
  }
}

function makeSubscriptionEvent(overrides: Partial<Stripe.Subscription> = {}): Stripe.Event {
  const subscription = {
    id: 'sub_test_1',
    customer: 'cus_test_1',
    status: 'active',
    cancel_at_period_end: false,
    metadata: { plan_key: 'pro' },
    items: {
      data: [
        {
          current_period_end: Math.floor(Date.parse('2026-10-25T00:00:00Z') / 1000),
          price: { lookup_key: 'pro' },
        },
      ],
    },
    ...overrides,
  }
  return {
    id: 'evt_test_1',
    type: 'customer.subscription.updated',
    data: { object: subscription },
  } as unknown as Stripe.Event
}

describe('handleStripeEvent idempotency (T053)', () => {
  it('replaying the same event twice leaves exactly one subscription row', async () => {
    const store = new FakeBillingStore()
    store.customersByStripeId.set('cus_test_1', 'user_1')
    const event = makeSubscriptionEvent()

    await handleStripeEvent(event, store)
    await handleStripeEvent(event, store)

    expect(store.upsertCalls).toBe(2) // the handler itself is called twice
    expect(store.subscriptionsById.size).toBe(1) // but the effect is a single row

    const row = store.subscriptionsById.get('sub_test_1')
    expect(row).toEqual({
      user_id: 'user_1',
      stripe_subscription_id: 'sub_test_1',
      plan_key: 'pro',
      status: 'active',
      current_period_end: '2026-10-25T00:00:00.000Z',
    })
  })

  it('is a no-op for an event type this feature does not react to', async () => {
    const store = new FakeBillingStore()
    const event = { id: 'evt_test_2', type: 'invoice.payment_failed', data: { object: {} } } as unknown as Stripe.Event

    await expect(handleStripeEvent(event, store)).resolves.toBeUndefined()
    expect(store.upsertCalls).toBe(0)
  })

  it('is a no-op for checkout.session.completed — the subscription object arrives unexpanded', async () => {
    const store = new FakeBillingStore()
    const event = {
      id: 'evt_test_3',
      type: 'checkout.session.completed',
      data: { object: { subscription: 'sub_test_1' } },
    } as unknown as Stripe.Event

    await handleStripeEvent(event, store)
    expect(store.upsertCalls).toBe(0)
  })

  it('does not write anything when the customer has no known user (yet)', async () => {
    const store = new FakeBillingStore()
    const event = makeSubscriptionEvent()

    await handleStripeEvent(event, store)

    expect(store.upsertCalls).toBe(0)
    expect(store.subscriptionsById.size).toBe(0)
  })
})
