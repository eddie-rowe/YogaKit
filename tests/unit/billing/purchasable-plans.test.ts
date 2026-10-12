import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

// vi.mock factories are hoisted above these declarations, so each factory must
// reach the mock lazily through a wrapper rather than capturing it by value —
// a bare `getPlanFeatures: getPlanFeaturesMock` throws "Cannot access before
// initialization".
const { listMock, getPlanFeaturesMock, loggerErrorMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  getPlanFeaturesMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}))

vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: () => ({ prices: { list: listMock } }),
}))
vi.mock('@/lib/entitlements', () => ({
  getPlanFeatures: getPlanFeaturesMock,
}))
vi.mock('@/lib/utils/logger', () => ({
  logger: { error: loggerErrorMock, info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { getPurchasablePlans } from '@/lib/stripe/plans'

function recurringPrice(amount: number, currency = 'usd', interval = 'month') {
  return { unit_amount: amount, currency, recurring: { interval } }
}

beforeEach(() => {
  listMock.mockReset()
  getPlanFeaturesMock.mockReset()
  loggerErrorMock.mockReset()
})

describe('getPurchasablePlans', () => {
  it('offers a plan that plan_features names and Stripe prices', async () => {
    getPlanFeaturesMock.mockResolvedValue([
      { plan_key: 'pro', feature_key: 'composing' },
      { plan_key: 'pro', feature_key: 'cloud_sync' },
    ])
    listMock.mockResolvedValue({ data: [recurringPrice(1200)] })

    expect(await getPurchasablePlans()).toEqual([
      {
        plan_key: 'pro',
        unit_amount: 1200,
        currency: 'usd',
        interval: 'month',
        feature_keys: ['cloud_sync', 'composing'],
      },
    ])
  })

  it('withholds a plan with no active Stripe Price — the org_seat case', async () => {
    // This is the whole mechanism: `org_seat` is in plan_features because a seat
    // grants real features, but an organization provisions it. No self-serve
    // Price is how that is expressed, so it must not reach the billing page.
    getPlanFeaturesMock.mockResolvedValue([
      { plan_key: 'pro', feature_key: 'composing' },
      { plan_key: 'org_seat', feature_key: 'composing' },
    ])
    listMock.mockImplementation(async ({ lookup_keys }) =>
      lookup_keys[0] === 'pro' ? { data: [recurringPrice(1200)] } : { data: [] },
    )

    const plans = await getPurchasablePlans()
    expect(plans.map(p => p.plan_key)).toEqual(['pro'])
  })

  it('never offers a plan checkout would reject as unknown_plan', async () => {
    // checkout/route.ts gates on plan_features first, then on lookup_key. A plan
    // priced in Stripe but absent from plan_features would 400 — so it must not
    // be offered either. Guards the two gates staying in agreement.
    getPlanFeaturesMock.mockResolvedValue([])
    listMock.mockResolvedValue({ data: [recurringPrice(1200)] })

    expect(await getPurchasablePlans()).toEqual([])
    expect(listMock).not.toHaveBeenCalled()
  })

  it('skips a one-off Price, since subscriptions are the only mode checkout creates', async () => {
    getPlanFeaturesMock.mockResolvedValue([{ plan_key: 'pro', feature_key: 'composing' }])
    listMock.mockResolvedValue({ data: [{ unit_amount: 1200, currency: 'usd', recurring: null }] })

    expect(await getPurchasablePlans()).toEqual([])
  })

  it('skips a Price with a null unit_amount rather than rendering NaN', async () => {
    getPlanFeaturesMock.mockResolvedValue([{ plan_key: 'pro', feature_key: 'composing' }])
    listMock.mockResolvedValue({
      data: [{ unit_amount: null, currency: 'usd', recurring: { interval: 'month' } }],
    })

    expect(await getPurchasablePlans()).toEqual([])
  })

  it('sorts by amount ascending', async () => {
    getPlanFeaturesMock.mockResolvedValue([
      { plan_key: 'team', feature_key: 'composing' },
      { plan_key: 'pro', feature_key: 'composing' },
    ])
    listMock.mockImplementation(async ({ lookup_keys }) =>
      lookup_keys[0] === 'team' ? { data: [recurringPrice(4900)] } : { data: [recurringPrice(1200)] },
    )

    expect((await getPurchasablePlans()).map(p => p.plan_key)).toEqual(['pro', 'team'])
  })

  it('returns no plans and logs when plan_features cannot be read', async () => {
    // Failing closed is the safe direction: the page still renders current state,
    // it just cannot offer a purchase.
    getPlanFeaturesMock.mockRejectedValue(new Error('permission denied'))

    expect(await getPurchasablePlans()).toEqual([])
    expect(loggerErrorMock).toHaveBeenCalledWith(
      'billing.plans.features_read_failed',
      {},
      expect.any(Error),
    )
  })

  it('keeps the plans it could price when one price lookup fails', async () => {
    getPlanFeaturesMock.mockResolvedValue([
      { plan_key: 'pro', feature_key: 'composing' },
      { plan_key: 'team', feature_key: 'composing' },
    ])
    listMock.mockImplementation(async ({ lookup_keys }) => {
      if (lookup_keys[0] === 'team') throw new Error('stripe is down')
      return { data: [recurringPrice(1200)] }
    })

    expect((await getPurchasablePlans()).map(p => p.plan_key)).toEqual(['pro'])
    expect(loggerErrorMock).toHaveBeenCalledWith(
      'billing.plans.price_lookup_failed',
      { plan_key: 'team' },
      expect.any(Error),
    )
  })

  it('never logs a plan price as content-bearing telemetry', async () => {
    // RULE-L7: logs carry event types and IDs, never user-authored content. A
    // plan_key is an identifier; nothing else from the price may be logged.
    getPlanFeaturesMock.mockResolvedValue([{ plan_key: 'pro', feature_key: 'composing' }])
    listMock.mockImplementation(async () => {
      throw new Error('boom')
    })

    await getPurchasablePlans()
    const [, fields] = loggerErrorMock.mock.calls[0]
    expect(Object.keys(fields)).toEqual(['plan_key'])
  })
})
