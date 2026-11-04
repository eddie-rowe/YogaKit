import { describe, expect, it } from 'vitest'
import { toDashboardRow } from './dashboard-row'

const row = (checkinDates: string[], over = {}) => ({
  studentName: 'Asha',
  checkinDates,
  milestoneProgress: 2,
  ...over,
})

describe('toDashboardRow (T052 lib, FR-053/FR-055)', () => {
  it('returns null days and a zero streak when there are no check-ins', () => {
    const out = toDashboardRow(row([]), '2026-11-04')
    expect(out.daysSinceLastCheckin).toBeNull()
    expect(out.streak).toBe(0)
  })

  it('is 0 days for a same-day check-in', () => {
    expect(toDashboardRow(row(['2026-11-04']), '2026-11-04').daysSinceLastCheckin).toBe(0)
  })

  it('counts whole days across a multi-day gap', () => {
    expect(toDashboardRow(row(['2026-10-25']), '2026-11-04').daysSinceLastCheckin).toBe(10)
  })

  it('uses the latest date when input is unsorted, and counts distinct days for the streak', () => {
    const out = toDashboardRow(row(['2026-11-02', '2026-10-30', '2026-11-03', '2026-11-03']), '2026-11-04')
    expect(out.daysSinceLastCheckin).toBe(1)
    expect(out.streak).toBe(3)
  })

  it('never lets the streak fall once a first check-in exists', () => {
    const out = toDashboardRow(row(['2026-01-01']), '2026-11-04')
    expect(out.streak).toBe(1)
  })

  it('exposes exactly the four FR-053 keys and drops anything else', () => {
    const out = toDashboardRow(row(['2026-11-03'], { reflection: 'private', intention: 'x', note: 'y' }), '2026-11-04')
    expect(Object.keys(out).sort()).toEqual(['daysSinceLastCheckin', 'milestoneProgress', 'streak', 'studentName'])
    expect(JSON.stringify(out)).not.toMatch(/private/)
    expect(out.studentName).toBe('Asha')
    expect(out.milestoneProgress).toBe(2)
  })
})
