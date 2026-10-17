import { describe, expect, it } from 'vitest'
import graceBudgetData from '../../../data/sadhana/grace-budget.json'
import {
  computeStreak,
  graceStatus,
  parseGraceBudget,
  type Checkin,
  type GraceBudget,
} from './streak'

const day = (offset: number): string => {
  const d = new Date(Date.UTC(2026, 0, 1) + offset * 86_400_000)
  return d.toISOString().slice(0, 10)
}
const practice = (offset: number): Checkin => ({ localDate: day(offset), kind: 'practice' })
const rest = (offset: number): Checkin => ({ localDate: day(offset), kind: 'rest' })

// Small deterministic PRNG so a failing history is reproducible from its seed.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generateHistory(seed: number, days: number): Checkin[] {
  const rand = mulberry32(seed)
  const out: Checkin[] = []
  let i = 0
  while (i < days) {
    const r = rand()
    if (r < 0.45) out.push(practice(i))
    else if (r < 0.6) out.push(rest(i))
    // otherwise silently absent; occasionally a long gap
    i += rand() < 0.05 ? 1 + Math.floor(rand() * 60) : 1
  }
  return out
}

describe('computeStreak', () => {
  it('is 0 before any practice, and rest alone does not start a streak', () => {
    expect(computeStreak([])).toBe(0)
    expect(computeStreak([rest(0), rest(1)])).toBe(0)
  })

  it('counts each practised day once', () => {
    expect(computeStreak([practice(0), practice(1), practice(2)])).toBe(3)
  })

  it('counts a day that holds both a rest and a practice once, as practice', () => {
    expect(computeStreak([rest(0), practice(0)])).toBe(1)
    expect(computeStreak([practice(0), rest(0), practice(0)])).toBe(1)
  })

  it('never counts a rest day as a miss and never adds to the number', () => {
    expect(computeStreak([practice(0), rest(1), rest(2), practice(3)])).toBe(2)
  })

  it('holds across a long gap and resumes counting', () => {
    expect(computeStreak([practice(0), practice(1)])).toBe(2)
    expect(computeStreak([practice(0), practice(1), practice(200)])).toBe(3)
  })

  it('does not depend on input order', () => {
    expect(computeStreak([practice(5), practice(1), practice(3)])).toBe(3)
  })

  it('is monotone non-decreasing and never zero after a first practice, over generated histories', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const history = generateHistory(seed, 400)
      let prev = 0
      let seenPractice = false
      for (let n = 1; n <= history.length; n++) {
        const value = computeStreak(history.slice(0, n))
        expect(value).toBeGreaterThanOrEqual(prev)
        if (history[n - 1].kind === 'practice') seenPractice = true
        if (seenPractice) expect(value).toBeGreaterThanOrEqual(1)
        prev = value
      }
    }
  })

  it('is unchanged by appending a rest day or a later gap', () => {
    const base = [practice(0), practice(1)]
    expect(computeStreak([...base, rest(30)])).toBe(computeStreak(base))
  })
})

describe('graceStatus', () => {
  const budget: GraceBudget = { size: 3, periodDays: 30 }

  it('reads as the full allowance when nothing has been used', () => {
    const history = [practice(0), practice(1), practice(2)]
    expect(graceStatus(history, budget, day(2))).toEqual({ used: 0, remaining: 3 })
  })

  it('counts silently absent days inside the trailing window since the first practice', () => {
    expect(graceStatus([practice(0), practice(3)], budget, day(3))).toEqual({ used: 2, remaining: 1 })
  })

  it('does not count rest days or days before the first practice', () => {
    const history = [practice(5), rest(6), practice(7)]
    expect(graceStatus(history, budget, day(7))).toEqual({ used: 0, remaining: 3 })
  })

  it('stops at zero remaining when exhausted, never negative', () => {
    expect(graceStatus([practice(0), practice(20)], budget, day(20))).toEqual({ used: 19, remaining: 0 })
  })

  it('only looks at the trailing period', () => {
    // Window is days 71..100; of the 99 absent days only the 29 inside it are counted.
    expect(graceStatus([practice(0), practice(100)], budget, day(100)).used).toBe(29)
  })

  it('has nothing used with no practice yet', () => {
    expect(graceStatus([], budget, day(0))).toEqual({ used: 0, remaining: 3 })
  })

  it('treats a rest day as not absent', () => {
    expect(graceStatus([practice(0), rest(1), practice(2)], budget, day(2)).used).toBe(0)
  })
})

describe('parseGraceBudget', () => {
  it('reads the shipped data file', () => {
    expect(parseGraceBudget(graceBudgetData)).toEqual(graceBudgetData)
  })

  it.each([
    null,
    'x',
    {},
    { size: -1, periodDays: 30 },
    { size: 1.5, periodDays: 30 },
    { size: 3, periodDays: 0 },
    { size: 3 },
  ])('rejects %j', (bad) => {
    expect(() => parseGraceBudget(bad)).toThrow()
  })
})
