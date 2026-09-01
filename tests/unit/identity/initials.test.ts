import { describe, it, expect } from 'vitest'

import { deriveInitials, toSessionIdentity } from '@/lib/identity/initials'

describe('deriveInitials', () => {
  it('takes the first and last initial of a multi-word name', () => {
    expect(deriveInitials('Synthetics Testing', 'syntheticstesting@gmail.com')).toBe('ST')
  })

  it('skips the middle names rather than running out of room', () => {
    expect(deriveInitials('Ada Byron King Lovelace', 'ada@example.com')).toBe('AL')
  })

  it('takes one letter from a single-word name', () => {
    expect(deriveInitials('Prashant', 'p@example.com')).toBe('P')
  })

  it('collapses irregular whitespace instead of counting it as a word', () => {
    expect(deriveInitials('  Ada   Lovelace  ', 'ada@example.com')).toBe('AL')
  })

  it('falls back to the email local part when there is no name', () => {
    expect(deriveInitials(null, 'syntheticstesting@gmail.com')).toBe('S')
    expect(deriveInitials('', 'bkash@example.com')).toBe('B')
    expect(deriveInitials('   ', 'bkash@example.com')).toBe('B')
  })

  it('uppercases whatever it finds', () => {
    expect(deriveInitials(null, 'ada.lovelace@example.com')).toBe('A')
  })

  it('keeps a non-ASCII glyph whole rather than splitting a surrogate pair', () => {
    expect(deriveInitials('Élodie Durand', 'e@example.com')).toBe('ÉD')
    // A name that is a single astral-plane code point must not yield half of one.
    expect([...deriveInitials('𝒜urora', 'a@example.com')]).toHaveLength(1)
  })

  it('never returns an empty string, even for a malformed email', () => {
    expect(deriveInitials(null, '@example.com')).not.toBe('')
    expect(deriveInitials(null, '')).not.toBe('')
  })
})

describe('toSessionIdentity', () => {
  it('carries the three fields the header needs', () => {
    expect(toSessionIdentity('Ada Lovelace', 'ada@example.com')).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      initials: 'AL',
    })
  })
})
