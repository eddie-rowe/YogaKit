import { describe, expect, it } from 'vitest'
import graceBudgetData from '../../../data/sadhana/grace-budget.json'
import { graceBudgetDetail } from './grace-budget'
import type { Checkin } from './streak'

const day = (offset: number): string =>
  new Date(Date.UTC(2026, 0, 1) + offset * 86_400_000).toISOString().slice(0, 10)
const practice = (offset: number): Checkin => ({ localDate: day(offset), kind: 'practice' })

describe('graceBudgetDetail', () => {
  it('reports nothing used with the full budget remaining', () => {
    const d = graceBudgetDetail([practice(0), practice(1), practice(2)], day(2))
    expect(d).toEqual({
      used: 0,
      remaining: graceBudgetData.size,
      size: graceBudgetData.size,
      periodDays: graceBudgetData.periodDays,
    })
  })

  it('reports a partly used budget', () => {
    const d = graceBudgetDetail([practice(0), practice(3)], day(3))
    expect(d.used).toBe(2)
    expect(d.remaining).toBe(graceBudgetData.size - 2)
  })

  it('reports a fully used budget without going negative', () => {
    const d = graceBudgetDetail([practice(0), practice(4)], day(4))
    expect(d.used).toBe(graceBudgetData.size)
    expect(d.remaining).toBe(0)
  })

  it('clamps an over-budget history to the budget size', () => {
    const d = graceBudgetDetail([practice(0), practice(20)], day(20))
    expect(d.used).toBe(graceBudgetData.size)
    expect(d.remaining).toBe(0)
  })

  it('reads size and period from the supplied budget data', () => {
    const d = graceBudgetDetail([practice(0), practice(2)], day(2), { size: 7, periodDays: 10 })
    expect(d).toEqual({ used: 1, remaining: 6, size: 7, periodDays: 10 })
  })

  it('has no used days before any practice exists', () => {
    const d = graceBudgetDetail([], day(5))
    expect(d.used).toBe(0)
    expect(d.remaining).toBe(graceBudgetData.size)
  })
})
