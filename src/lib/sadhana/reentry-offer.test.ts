import { describe, expect, it } from 'vitest'
import type { FlowItem, Phase } from '@/lib/flow/types'
import { reentryOffer, type ReentryFlow } from './reentry-offer'

const item = (id: string, order: number, phaseId: string | null = null): FlowItem => ({
  id,
  poseSlug: `pose-${id}`,
  mode: 'yang',
  measure: { breaths: 5 },
  phaseId,
  order,
})
const phase = (id: string, order: number): Phase => ({
  id,
  name: `phase ${id}`,
  intentTag: 'samana',
  order,
})
const flow = (items: FlowItem[], phases: Phase[] = []): ReentryFlow => ({ items, phases })

describe('reentryOffer', () => {
  it('offers the first phase by order, with its poses in order', () => {
    const f = flow(
      [item('c', 3, 'p2'), item('b', 2, 'p1'), item('a', 1, 'p1')],
      [phase('p2', 2), phase('p1', 1)],
    )
    expect(reentryOffer(f)).toEqual({ kind: 'phase', phaseId: 'p1', itemIds: ['a', 'b'] })
  })

  it('skips a leading phase that holds no poses', () => {
    const f = flow([item('a', 1, 'p2')], [phase('p1', 1), phase('p2', 2)])
    expect(reentryOffer(f)).toEqual({ kind: 'phase', phaseId: 'p2', itemIds: ['a'] })
  })

  it('offers the first pose when the flow has no phases', () => {
    const f = flow([item('b', 2), item('a', 1)])
    expect(reentryOffer(f)).toEqual({ kind: 'pose', itemId: 'a', poseSlug: 'pose-a' })
  })

  it('falls back to the first pose when no phase holds any pose', () => {
    const f = flow([item('a', 1)], [phase('p1', 1)])
    expect(reentryOffer(f)).toEqual({ kind: 'pose', itemId: 'a', poseSlug: 'pose-a' })
  })

  it('is null for an empty flow', () => {
    expect(reentryOffer(flow([], [phase('p1', 1)]))).toBeNull()
  })

  it('is null for a null or undefined flow', () => {
    expect(reentryOffer(null)).toBeNull()
    expect(reentryOffer(undefined)).toBeNull()
  })

  it('carries no catch-up, count or copy field (FR-033)', () => {
    const offers = [
      reentryOffer(flow([item('a', 1, 'p1')], [phase('p1', 1)])),
      reentryOffer(flow([item('a', 1)])),
    ]
    for (const o of offers) {
      expect(o).not.toBeNull()
      const keys = Object.keys(o!)
      expect(keys.some((k) => /catch|missed|count|days|total|cue|name|copy/i.test(k))).toBe(false)
    }
  })

  it('is deterministic and does not mutate its input', () => {
    const f = flow([item('b', 2), item('a', 1)])
    const before = JSON.stringify(f)
    expect(reentryOffer(f)).toEqual(reentryOffer(f))
    expect(JSON.stringify(f)).toBe(before)
  })
})
