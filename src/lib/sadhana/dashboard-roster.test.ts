import { describe, expect, it } from 'vitest'
import { visibleRoster, type RosterEnrollment } from './dashboard-roster'

const e = (over: Partial<RosterEnrollment> = {}): RosterEnrollment => ({
  studentName: 'Asha',
  shareSignals: true,
  endedAt: null,
  checkinDates: ['2026-11-01'],
  milestoneProgress: 3,
  ...over,
})

describe('visibleRoster (T056, FR-058)', () => {
  it('keeps students who are sharing on an active enrollment', () => {
    const out = visibleRoster([e()])
    expect(out).toHaveLength(1)
    expect(out[0].studentName).toBe('Asha')
  })

  it('omits a student who stopped sharing, leaving no trace', () => {
    const out = visibleRoster([e({ studentName: 'Ben', shareSignals: false }), e()])
    expect(out).toHaveLength(1)
    expect(JSON.stringify(out)).not.toContain('Ben')
  })

  it('omits an ended enrollment', () => {
    const out = visibleRoster([e({ studentName: 'Cy', endedAt: '2026-10-01' })])
    expect(out).toEqual([])
  })

  it('shows a re-enrolled student through the new active enrollment only', () => {
    const out = visibleRoster([
      e({ studentName: 'Dee', endedAt: '2026-09-01', checkinDates: ['2026-08-01'] }),
      e({ studentName: 'Dee', checkinDates: ['2026-11-01'] }),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].checkinDates).toEqual(['2026-11-01'])
  })

  it('returns an empty roster for empty input', () => {
    expect(visibleRoster([])).toEqual([])
  })

  it('adds no status marker: output keys are exactly the signal fields', () => {
    const [row] = visibleRoster([e()])
    expect(Object.keys(row).sort()).toEqual(['checkinDates', 'milestoneProgress', 'studentName'])
    expect(JSON.stringify(row)).not.toMatch(/stopped|absent|inactive/i)
  })

  describe('two cohorts and ended enrollments (T056, FR-060/FR-061)', () => {
    const KEYS = ['checkinDates', 'milestoneProgress', 'studentName']

    it('one sharing and one not: only the sharing enrollment yields a row', () => {
      const out = visibleRoster([
        e({ studentName: 'Eli', checkinDates: ['2026-11-01'] }),
        e({ studentName: 'Eli', shareSignals: false, checkinDates: ['2026-11-02'] }),
      ])
      expect(out).toHaveLength(1)
      expect(out[0].checkinDates).toEqual(['2026-11-01'])
      expect(Object.keys(out[0]).sort()).toEqual(KEYS)
    })

    it('both sharing: two rows', () => {
      const out = visibleRoster([e({ studentName: 'Fay' }), e({ studentName: 'Fay', milestoneProgress: 5 })])
      expect(out).toHaveLength(2)
    })

    it('one ended: only the active enrollment is returned, with no marker for the other', () => {
      const out = visibleRoster([
        e({ studentName: 'Gus', endedAt: '2026-10-01', checkinDates: ['2026-09-01'] }),
        e({ studentName: 'Gus', checkinDates: ['2026-11-01'] }),
      ])
      expect(out).toHaveLength(1)
      expect(out[0].checkinDates).toEqual(['2026-11-01'])
      expect(Object.keys(out[0]).sort()).toEqual(KEYS)
      expect(JSON.stringify(out)).not.toMatch(/ended|stopped|absent|inactive/i)
    })
  })
})
