import { describe, it, expect } from 'vitest'
import {
  SECONDS_PER_BREATH,
  approxDuration,
  formatApproxDuration,
  formatDuration,
  measureToSeconds,
  totalSeconds,
} from '@/lib/flow/duration'

// `approxDuration` exists because `formatDuration` rounds to whole minutes, and a
// 90-second hold rendered as "2 min" throws away the half a teacher wrote on purpose
// (`001` FR-017). These tests pin that difference, so a later tidy-up that collapses
// the two functions fails here rather than silently on the mat.

describe('approxDuration', () => {
  it('keeps the half-minute a teacher wrote', () => {
    expect(approxDuration(90)).toEqual({ count: '1.5', unit: 'min' })
    expect(approxDuration(150)).toEqual({ count: '2.5', unit: 'min' })
    expect(approxDuration(180)).toEqual({ count: '3', unit: 'min' })
  })

  it('stays in seconds below a minute, and never renders a fraction of one', () => {
    expect(approxDuration(45)).toEqual({ count: '45', unit: 's' })
    expect(approxDuration(0)).toEqual({ count: '0', unit: 's' })
    expect(approxDuration(59.6)).toEqual({ count: '60', unit: 's' })
  })

  it('breaks to hours rather than reading "~78 min"', () => {
    expect(approxDuration(60 * 60)).toEqual({ count: '1', unit: 'hr' })
    expect(approxDuration(90 * 60)).toEqual({ count: '1.5', unit: 'hr' })
  })

  it('disagrees with formatDuration exactly where it is meant to', () => {
    expect(formatDuration(90)).toBe('2 min')
    expect(formatApproxDuration(90)).toBe('~1.5 min')
  })
})

describe('formatApproxDuration', () => {
  it('is always marked approximate — a phase summed from breaths is an estimate', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `i${i}`,
      poseSlug: 'tadasana',
      mode: 'yang' as const,
      measure: { breaths: 5 },
      phaseId: null,
      order: i,
    }))
    expect(totalSeconds(items)).toBe(10 * 5 * SECONDS_PER_BREATH)
    expect(formatApproxDuration(totalSeconds(items))).toBe('~4 min')
    expect(formatApproxDuration(totalSeconds(items)).startsWith('~')).toBe(true)
  })

  it('sums an empty phase to something rather than nothing', () => {
    expect(totalSeconds([])).toBe(0)
    expect(formatApproxDuration(0)).toBe('~0 s')
  })

  it('reads a measure with neither breaths nor seconds as zero, not as NaN', () => {
    expect(measureToSeconds({} as never)).toBe(0)
  })
})
