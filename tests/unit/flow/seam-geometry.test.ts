import { describe, it, expect } from 'vitest'
import { seamGeometry, insertionGapIndex } from '@/lib/flow/seam-geometry'

describe('seamGeometry (004 US5 s4/s5)', () => {
  it('increases line length and weight with tier', () => {
    const [a, b, c] = ([1, 2, 3] as const).map(seamGeometry)
    expect(a.lengthPct).toBeLessThan(b.lengthPct)
    expect(b.lengthPct).toBeLessThan(c.lengthPct)
    expect(a.weightPx).toBeLessThan(b.weightPx)
    expect(b.weightPx).toBeLessThan(c.weightPx)
  })
  it('opens extra row gap only at the top tier', () => {
    expect(seamGeometry(1).rowGapRem).toBe(0)
    expect(seamGeometry(2).rowGapRem).toBe(0)
    expect(seamGeometry(3).rowGapRem).toBeGreaterThan(0)
  })
})

describe('insertionGapIndex (004 US5 s1)', () => {
  it('opens after the hovered row when dragging down', () => {
    expect(insertionGapIndex(0, 2)).toBe(3)
  })
  it('opens before the hovered row when dragging up', () => {
    expect(insertionGapIndex(3, 1)).toBe(1)
  })
  it('is null with no drag or no move', () => {
    expect(insertionGapIndex(-1, 2)).toBeNull()
    expect(insertionGapIndex(2, -1)).toBeNull()
    expect(insertionGapIndex(2, 2)).toBeNull()
  })
})
