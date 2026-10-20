import { describe, expect, it } from 'vitest'
import { resolveLocalDay } from './local-day'
import {
  chipFor,
  practiceStateOn,
  practiceStates,
  type PracticeState,
} from './practice-state'
import type { Checkin } from './streak'

const practice = (localDate: string): Checkin => ({ localDate, kind: 'practice' })
const rest = (localDate: string): Checkin => ({ localDate, kind: 'rest' })

describe('practiceStateOn', () => {
  it('is practised on a day with a practice check-in', () => {
    expect(practiceStateOn([practice('2026-01-05')], '2026-01-05')).toBe('practised')
  })

  it('is rested on a day with only a rest log', () => {
    expect(practiceStateOn([rest('2026-01-05')], '2026-01-05')).toBe('rested')
  })

  it('is silently-absent on a day with nothing recorded', () => {
    expect(practiceStateOn([practice('2026-01-04')], '2026-01-05')).toBe('silently-absent')
    expect(practiceStateOn([], '2026-01-05')).toBe('silently-absent')
  })

  it('resolves practice + rest on one day to practised, regardless of order (FR-014)', () => {
    const a = [practice('2026-01-05'), rest('2026-01-05')]
    const b = [rest('2026-01-05'), practice('2026-01-05')]
    expect(practiceStateOn(a, '2026-01-05')).toBe('practised')
    expect(practiceStateOn(b, '2026-01-05')).toBe('practised')
  })
})

describe('chipFor', () => {
  it('gives chips to practised and rested only (FR-012)', () => {
    expect(chipFor('practised')).toBe('practised')
    expect(chipFor('rested')).toBe('rested')
    expect(chipFor('silently-absent')).toBeNull()
  })
})

describe('practiceStates', () => {
  it('maps only chip-bearing days; gap days are absent from the map', () => {
    const states = practiceStates([practice('2026-01-01'), rest('2026-01-03')])
    expect([...states.keys()].sort()).toEqual(['2026-01-01', '2026-01-03'])
    expect(states.has('2026-01-02')).toBe(false)
  })

  it('counts a both-on-one-day date once, as practised (FR-014)', () => {
    const states = practiceStates([rest('2026-01-05'), practice('2026-01-05')])
    expect(states.size).toBe(1)
    expect(states.get('2026-01-05')).toBe<PracticeState>('practised')
  })

  it('buckets by local day across a DST transition', () => {
    const zone = 'America/New_York' // spring-forward 2026-03-08
    const late = resolveLocalDay(new Date('2026-03-08T04:59:00Z'), zone) // 23:59 EST, 03-07
    const early = resolveLocalDay(new Date('2026-03-08T05:01:00Z'), zone) // 00:01 EST, 03-08
    const states = practiceStates([practice(late), rest(early)])
    expect(states.get('2026-03-07')).toBe('practised')
    expect(states.get('2026-03-08')).toBe('rested')
  })
})
