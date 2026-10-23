import { describe, expect, it } from 'vitest'
import { selectGuidance } from './guidance'

const card = (id: string, trigger: string, priority: number) => ({ id, trigger, priority })

describe('selectGuidance', () => {
  const corpus = [card('a', 'first-week', 30), card('b', 'gap', 10), card('c', 'milestone', 20)]

  it('returns null for empty input', () => {
    expect(selectGuidance([], ['gap'], [])).toBeNull()
    expect(selectGuidance(corpus, [], [])).toBeNull()
  })

  it('resolves simultaneous triggers to exactly one card, by authored priority', () => {
    const picked = selectGuidance(corpus, ['first-week', 'gap', 'milestone'], [])
    expect(picked?.id).toBe('b')
  })

  it('never re-selects a consumed trigger', () => {
    expect(selectGuidance(corpus, ['first-week', 'gap', 'milestone'], ['gap'])?.id).toBe('c')
    expect(selectGuidance(corpus, ['gap'], ['gap'])).toBeNull()
  })

  it('ignores cards whose trigger did not fire', () => {
    expect(selectGuidance(corpus, ['first-week'], [])?.id).toBe('a')
  })

  it('breaks ties stably by id, independent of input order', () => {
    const tied = [card('z', 'gap', 5), card('m', 'milestone', 5)]
    expect(selectGuidance(tied, ['gap', 'milestone'], [])?.id).toBe('m')
    expect(selectGuidance([...tied].reverse(), ['gap', 'milestone'], [])?.id).toBe('m')
  })

  it('returns the card as given, with no count, countdown or missed-day data added', () => {
    const picked = selectGuidance(corpus, ['gap'], [])
    expect(picked).toEqual(card('b', 'gap', 10))
  })
})
