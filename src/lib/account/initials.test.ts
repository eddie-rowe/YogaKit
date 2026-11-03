import { describe, it, expect } from 'vitest'
import { initialsFor, NEUTRAL_INITIAL } from './initials'

describe('initialsFor', () => {
  it('uses first and last word for two or more words', () => {
    expect(initialsFor('Asha Rao')).toBe('AR')
    expect(initialsFor('Mary Anne Smith')).toBe('MS')
  })
  it('uses the first letter for one word, uppercased', () => {
    expect(initialsFor('asha')).toBe('A')
    expect(initialsFor('x')).toBe('X')
  })
  it('is unicode-safe', () => {
    expect(initialsFor('Åsa')).toBe('Å')
    expect(initialsFor('😀 Smile')).toBe('😀S')
    expect(initialsFor('😀')).toBe('😀')
  })
  it('trims whitespace and ignores leading punctuation', () => {
    expect(initialsFor('  asha   rao  ')).toBe('AR')
    expect(initialsFor('"asha" (rao)')).toBe('AR')
  })
  it('treats hyphenated words as one word', () => {
    expect(initialsFor('Anne-Marie')).toBe('A')
    expect(initialsFor('Anne-Marie Dupont')).toBe('AD')
  })
  it('falls back to the email local part for blank names', () => {
    expect(initialsFor('   ', 'sam@example.com')).toBe('S')
    expect(initialsFor(null, 'sam@example.com')).toBe('S')
    expect(initialsFor(undefined, '.dot@example.com')).toBe('D')
  })
  it('falls back to a neutral character when nothing is usable', () => {
    expect(initialsFor(null)).toBe(NEUTRAL_INITIAL)
    expect(initialsFor('   ', '  ')).toBe(NEUTRAL_INITIAL)
    expect(initialsFor('!!!', '@x.com')).toBe(NEUTRAL_INITIAL)
    expect(NEUTRAL_INITIAL).toBe('·')
  })
})
