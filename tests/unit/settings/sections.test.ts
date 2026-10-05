import { describe, expect, it } from 'vitest'
import { visibleSections, type AccountState } from '@/lib/settings/sections'

const ids = (s: AccountState) => visibleSections(s).map((x) => x.id)

describe('visibleSections', () => {
  it('zero orgs: neither conditional section appears', () => {
    expect(ids({ orgs: [] })).toEqual([
      'profile',
      'appearance',
      'notifications',
      'privacy',
      'account-security',
      'data',
      'billing',
    ])
  })

  it('member only: memberships appears, studio is absent', () => {
    const r = ids({ orgs: [{ id: 'a', name: 'A', role: 'member' }] })
    expect(r).toContain('memberships')
    expect(r).not.toContain('studio')
  })

  it.each(['owner', 'admin'] as const)('%s: both conditional sections appear', (role) => {
    const r = ids({ orgs: [{ id: 'a', name: 'A', role }] })
    expect(r.slice(-2)).toEqual(['memberships', 'studio'])
  })

  it('owner of one org and member of another: studio names only the governed org', () => {
    const studio = visibleSections({
      orgs: [
        { id: 'a', name: 'Alpha', role: 'member' },
        { id: 'b', name: 'Beta', role: 'owner' },
      ],
    }).find((s) => s.id === 'studio')
    expect(studio?.governedOrgs).toEqual([{ id: 'b', name: 'Beta' }])
  })

  it('ordering is fixed regardless of org order', () => {
    const r = ids({
      orgs: [
        { id: 'b', name: 'B', role: 'admin' },
        { id: 'a', name: 'A', role: 'member' },
      ],
    })
    expect(r).toEqual([
      'profile',
      'appearance',
      'notifications',
      'privacy',
      'account-security',
      'data',
      'billing',
      'memberships',
      'studio',
    ])
  })

  it('does not mutate its input', () => {
    const state: AccountState = { orgs: [{ id: 'a', name: 'A', role: 'owner' }] }
    const copy = JSON.stringify(state)
    visibleSections(state)
    expect(JSON.stringify(state)).toBe(copy)
  })
})
