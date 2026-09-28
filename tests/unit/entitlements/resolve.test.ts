import { describe, expect, it, vi, beforeEach } from 'vitest'

// react's cache() memoizes per call-argument identity for the lifetime of a
// request; in Vitest's Node environment (no request scope) it still
// memoizes per process, so each test uses a distinct user id to avoid one
// test's mock answer leaking into another's assertion.
const rpcMock = vi.fn()

// Next.js's webpack build swaps 'server-only' for a no-op on the server; plain
// Node/Vitest has no such swap, so the real package throws unconditionally
// the moment it's imported. Mock it the same way Next.js's server bundle does.
vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc: rpcMock })),
}))

import { getEntitlements, hasActiveEntitlement, activePlanKeys } from '@/lib/entitlements'

beforeEach(() => {
  rpcMock.mockReset()
})

describe('getEntitlements', () => {
  it('calls app_entitlements with the given user id and returns the raw union', async () => {
    const raw = {
      subscriptions: [
        {
          id: 's1',
          user_id: 'user-1',
          stripe_subscription_id: 'sub_123',
          plan_key: 'pro',
          status: 'active',
          current_period_end: '2026-12-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      seat_assignments: [],
      entitlement_grants: [],
    }
    rpcMock.mockResolvedValueOnce({ data: raw, error: null })

    const result = await getEntitlements('user-1')

    expect(rpcMock).toHaveBeenCalledWith('app_entitlements', { user_id: 'user-1' })
    expect(result).toEqual(raw)
  })

  it('preserves an active subscription and a live grant together (T047 union correctness) — neither source is lost or deduplicated', async () => {
    const raw = {
      subscriptions: [
        {
          id: 's1',
          user_id: 'user-5',
          stripe_subscription_id: 'sub_union',
          plan_key: 'pro',
          status: 'active',
          current_period_end: '2026-12-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      seat_assignments: [],
      entitlement_grants: [
        {
          id: 'g1',
          user_id: 'user-5',
          source: 'cohort_graduation',
          source_ref: null,
          starts_at: '2026-01-01T00:00:00Z',
          ends_at: '2026-04-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    }
    rpcMock.mockResolvedValueOnce({ data: raw, error: null })

    const result = await getEntitlements('user-5')

    // Real union correctness is proven at the SQL level in
    // scripts/verify-migrations.sh's T047 assertion — app_entitlements() does
    // the actual unioning. What this test guards is the app layer: the
    // resolver must be a faithful passthrough, since it does no filtering or
    // merging of its own.
    expect(result.subscriptions).toHaveLength(1)
    expect(result.entitlement_grants).toHaveLength(1)
    expect(hasActiveEntitlement(result)).toBe(true)
    expect(activePlanKeys(result)).toEqual(['pro'])
  })

  it('throws the RPC error rather than returning an empty result', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "cannot read another user's entitlements", code: 'insufficient_privilege' },
    })

    await expect(getEntitlements('user-2')).rejects.toMatchObject({ code: 'insufficient_privilege' })
  })
})

describe('hasActiveEntitlement', () => {
  it('is true when any of the three sources is non-empty', () => {
    expect(
      hasActiveEntitlement({
        subscriptions: [],
        seat_assignments: [{ id: 'sa1', org_id: 'org-1', user_id: 'user-3', plan_key: 'org_seat', created_at: 'now' }],
        entitlement_grants: [],
      }),
    ).toBe(true)
  })

  it('is false when all three sources are empty', () => {
    expect(hasActiveEntitlement({ subscriptions: [], seat_assignments: [], entitlement_grants: [] })).toBe(false)
  })
})

describe('activePlanKeys', () => {
  it('deduplicates plan_key across subscriptions and seat assignments', () => {
    const keys = activePlanKeys({
      subscriptions: [
        {
          id: 's1',
          user_id: 'user-4',
          stripe_subscription_id: 'sub_1',
          plan_key: 'pro',
          status: 'active',
          current_period_end: '2026-12-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      seat_assignments: [
        { id: 'sa1', org_id: 'org-1', user_id: 'user-4', plan_key: 'pro', created_at: 'now' },
        { id: 'sa2', org_id: 'org-2', user_id: 'user-4', plan_key: 'org_seat', created_at: 'now' },
      ],
      entitlement_grants: [],
    })

    expect(keys.sort()).toEqual(['org_seat', 'pro'])
  })

  it('is empty when there is no active source', () => {
    expect(activePlanKeys({ subscriptions: [], seat_assignments: [], entitlement_grants: [] })).toEqual([])
  })
})
