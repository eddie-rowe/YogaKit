import { describe, expect, it } from 'vitest'
import { practicedToday } from './practiced-today'

describe('practicedToday', () => {
  it('is true when a check-in exists for today', () => {
    expect(practicedToday(['2026-03-09', '2026-03-10'], '2026-03-10')).toBe(true)
  })

  it('is false when today has no check-in', () => {
    expect(practicedToday(['2026-03-08', '2026-03-09'], '2026-03-10')).toBe(false)
  })

  it('is false for an empty list', () => {
    expect(practicedToday([], '2026-03-10')).toBe(false)
  })

  it('is false when only other days exist, including a later one', () => {
    expect(practicedToday(['2026-03-11'], '2026-03-10')).toBe(false)
  })

  it('is false for a rest day the caller did not pass as practice', () => {
    const practiceDates: string[] = []
    expect(practicedToday(practiceDates, '2026-03-10')).toBe(false)
  })

  it('does not mutate its input', () => {
    const dates = Object.freeze(['2026-03-10'])
    expect(practicedToday(dates, '2026-03-10')).toBe(true)
  })

  it('accepts dates only — no content field can be passed (FR-059)', () => {
    // @ts-expect-error a check-in object carrying content is not a CheckinDate
    practicedToday([{ localDate: '2026-03-10', reflection: 'private' }], '2026-03-10')
    expect(practicedToday.length).toBe(2)
  })
})
