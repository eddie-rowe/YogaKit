import { describe, expect, it } from 'vitest'

// Same 'server-only' shim as resolve.test.ts: Next.js's server bundle swaps the
// package for a no-op, plain Node/Vitest does not, so the real package throws on
// import.
import { vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { featureKeysForPlans, type PlanFeature } from '@/lib/entitlements'

// Mirrors supabase/migrations/20261012120000_seed_plan_features.sql. If that
// migration changes, this fixture should change with it — these tests are about
// the projection, but the fixture doubles as a readable record of the seeded
// catalogue.
const SEEDED: PlanFeature[] = [
  { plan_key: 'pro', feature_key: 'composing' },
  { plan_key: 'pro', feature_key: 'cloud_sync' },
  { plan_key: 'org_seat', feature_key: 'composing' },
  { plan_key: 'org_seat', feature_key: 'cloud_sync' },
  { plan_key: 'org_seat', feature_key: 'teacher_dashboard' },
]

describe('featureKeysForPlans', () => {
  it('returns the features of a single active plan, sorted', () => {
    expect(featureKeysForPlans(SEEDED, ['pro'])).toEqual(['cloud_sync', 'composing'])
  })

  it('unions features across plans without duplicating the overlap', () => {
    // `composing` and `cloud_sync` are in both plans; the union must list each
    // once. A Set-less implementation would return five entries here.
    expect(featureKeysForPlans(SEEDED, ['pro', 'org_seat'])).toEqual([
      'cloud_sync',
      'composing',
      'teacher_dashboard',
    ])
  })

  it('returns nothing for a user with no active plans', () => {
    expect(featureKeysForPlans(SEEDED, [])).toEqual([])
  })

  it('ignores a plan_key with no plan_features rows', () => {
    // A subscription can name a plan_key that was removed from the catalogue.
    // That must yield no features rather than throwing — a stale subscription is
    // a state to render, not a crash.
    expect(featureKeysForPlans(SEEDED, ['retired_tier'])).toEqual([])
  })

  it('grants a seat holder the teacher dashboard but never org_seats', () => {
    // RULE-O7's enumerated features include "org seats", but provisioning seats
    // is the organization's capability, not something a seat confers — a seat
    // holder cannot re-provision further seats. Guards the seed's intent.
    const seat = featureKeysForPlans(SEEDED, ['org_seat'])
    expect(seat).toContain('teacher_dashboard')
    expect(seat).not.toContain('org_seats')
  })

  it('never grants a feature for reading open data', () => {
    // RULE-O6/O7: the pose/meridian/quote files and a person's own flows are
    // readable with no account, subscription or entitlement. No feature_key may
    // exist for them, because its existence invites the gate the constitution
    // forbids. Asserted across every plan, not just the seeded two.
    const all = featureKeysForPlans(SEEDED, ['pro', 'org_seat', 'retired_tier'])
    for (const forbidden of ['pose_library', 'poses', 'read_flows', 'read_own_flows']) {
      expect(all).not.toContain(forbidden)
    }
  })

  it('does not mutate the rows it is given', () => {
    const rows: PlanFeature[] = [{ plan_key: 'pro', feature_key: 'composing' }]
    const snapshot = structuredClone(rows)
    featureKeysForPlans(rows, ['pro'])
    expect(rows).toEqual(snapshot)
  })
})
