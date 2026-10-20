import { describe, expect, it } from 'vitest'
import { MILESTONE_THRESHOLDS, nextMilestone } from './milestones'

describe('MILESTONE_THRESHOLDS', () => {
  it('is the single source of the 10 / 30 / 90 thresholds', () => {
    expect([...MILESTONE_THRESHOLDS]).toEqual([10, 30, 90])
  })
})

describe('nextMilestone', () => {
  it('returns null below the first threshold', () => {
    expect(nextMilestone(0, [])).toBeNull()
    expect(nextMilestone(9, [])).toBeNull()
  })

  it('returns a threshold once the streak reaches it', () => {
    expect(nextMilestone(10, [])).toBe(10)
    expect(nextMilestone(29, [])).toBe(10)
  })

  it('never returns an acknowledged milestone (FR-021)', () => {
    expect(nextMilestone(10, [10])).toBeNull()
    expect(nextMilestone(45, [10, 30])).toBeNull()
  })

  it('queues two milestones reached together: one at a time, neither lost (FR-023)', () => {
    expect(nextMilestone(30, [])).toBe(10)
    expect(nextMilestone(30, [10])).toBe(30)
    expect(nextMilestone(30, [10, 30])).toBeNull()
  })

  it('yields the same card when the streak is unchanged and nothing is acknowledged', () => {
    expect(nextMilestone(12, [])).toBe(nextMilestone(12, []))
  })

  it('does not depend on the order acknowledgements were recorded', () => {
    expect(nextMilestone(90, [30, 10])).toBe(90)
  })
})
