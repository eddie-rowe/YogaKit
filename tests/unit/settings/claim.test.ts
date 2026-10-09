import { describe, expect, it } from 'vitest'
import { itemize } from '@/lib/settings/claim'

const flows = (n: number) => Array.from({ length: n }, (_, i) => ({ title: `Flow ${i + 1}` }))

describe('itemize', () => {
  it('empty input: empty list and count 0', () => {
    expect(itemize([])).toEqual({ names: [], count: 0 })
  })

  it('one flow: its name and count 1', () => {
    expect(itemize([{ title: 'Morning' }])).toEqual({ names: ['Morning'], count: 1 })
  })

  it('long list stays fully reviewable, never truncated to a count', () => {
    const r = itemize(flows(200))
    expect(r.count).toBe(200)
    expect(r.names).toHaveLength(200)
    expect(r.names[0]).toBe('Flow 1')
    expect(r.names[199]).toBe('Flow 200')
  })

  it('does not mutate its input', () => {
    const input = flows(3)
    const snap = JSON.stringify(input)
    itemize(input)
    expect(JSON.stringify(input)).toBe(snap)
  })
})
