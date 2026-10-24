import { describe, it, expect } from 'vitest'
import { seamGeometry, insertionSlot } from '@/lib/compose/seam-geometry'

describe('seamGeometry (004 US5 s4/s5)', () => {
  it('widens and lengthens the line with tier, not height alone', () => {
    const g1 = seamGeometry(1)
    const g2 = seamGeometry(2)
    const g3 = seamGeometry(3)
    expect(g1.lineWidthPx).toBeLessThan(g2.lineWidthPx)
    expect(g2.lineWidthPx).toBeLessThan(g3.lineWidthPx)
    expect(g1.lineLengthPct).toBeLessThan(g2.lineLengthPct)
    expect(g2.lineLengthPct).toBeLessThan(g3.lineLengthPct)
  })

  it('increases the surrounding row gap only at the top tier', () => {
    expect(seamGeometry(1).rowGapRem).toBe(seamGeometry(2).rowGapRem)
    expect(seamGeometry(3).rowGapRem).toBeGreaterThan(seamGeometry(2).rowGapRem)
  })
})

describe('insertionSlot (004 US5 s1)', () => {
  it('is null when nothing is dragged or the pointer is over the dragged row', () => {
    expect(insertionSlot(null, 'b', ['a', 'b'])).toBeNull()
    expect(insertionSlot('a', null, ['a', 'b'])).toBeNull()
    expect(insertionSlot('a', 'a', ['a', 'b'])).toBeNull()
  })

  it('opens below the over row when dragging downward, above it when dragging upward', () => {
    expect(insertionSlot('a', 'c', ['a', 'b', 'c'])).toEqual({ overId: 'c', side: 'after' })
    expect(insertionSlot('c', 'a', ['a', 'b', 'c'])).toEqual({ overId: 'a', side: 'before' })
  })

  it('is null for ids not in the list', () => {
    expect(insertionSlot('x', 'a', ['a'])).toBeNull()
    expect(insertionSlot('a', 'x', ['a'])).toBeNull()
  })
})
