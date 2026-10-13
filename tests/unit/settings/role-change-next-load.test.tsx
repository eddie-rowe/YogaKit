import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLoadTimeSections } from '@/lib/settings/use-load-time-sections'
import type { AccountState } from '@/lib/settings/sections'

const member: AccountState = { orgs: [{ id: 'a', name: 'A', role: 'member' }] }
const owner: AccountState = { orgs: [{ id: 'a', name: 'A', role: 'owner' }] }
const ids = (s: { id: string }[]) => s.map((x) => x.id)

describe('useLoadTimeSections (FR-039)', () => {
  it('a role change after the first render does not change the rendered sections', () => {
    const { result, rerender } = renderHook(({ state }) => useLoadTimeSections(state), {
      initialProps: { state: member },
    })
    const before = ids(result.current)
    expect(before).not.toContain('studio')
    rerender({ state: owner })
    expect(ids(result.current)).toEqual(before)
  })

  it('the next load (fresh mount) reflects the new role', () => {
    const { result } = renderHook(({ state }) => useLoadTimeSections(state), {
      initialProps: { state: owner },
    })
    expect(ids(result.current)).toContain('studio')
  })
})
