import { describe, it, expect } from 'vitest'

import { isThemeChoice, readThemeCookie } from '@/lib/theme'

describe('readThemeCookie', () => {
  it('reads an explicit choice', () => {
    expect(readThemeCookie('krama-theme=dark')).toBe('dark')
    expect(readThemeCookie('krama-theme=light')).toBe('light')
  })

  it('finds the cookie among others, at either end', () => {
    expect(readThemeCookie('sb-access-token=abc; krama-theme=dark; other=1')).toBe('dark')
    expect(readThemeCookie('other=1; krama-theme=light')).toBe('light')
  })

  // 006 FR-033: an unrecognised value must fall through to the system default,
  // never to a broken or half-applied palette.
  it('falls back to system for anything it does not recognise', () => {
    expect(readThemeCookie('')).toBe('system')
    expect(readThemeCookie('krama-theme=')).toBe('system')
    expect(readThemeCookie('krama-theme=sepia')).toBe('system')
    expect(readThemeCookie('krama-theme=%E0%A4')).toBe('system') // malformed percent-encoding
    expect(readThemeCookie('other=dark')).toBe('system')
  })

  it('does not match a cookie whose name merely ends in the key', () => {
    expect(readThemeCookie('not-krama-theme=dark')).toBe('system')
  })
})

describe('isThemeChoice', () => {
  it('accepts only the three choices', () => {
    expect(isThemeChoice('system')).toBe(true)
    expect(isThemeChoice('dark')).toBe(true)
    expect(isThemeChoice('light')).toBe(true)
    expect(isThemeChoice('Dark')).toBe(false)
    expect(isThemeChoice(null)).toBe(false)
    expect(isThemeChoice(undefined)).toBe(false)
  })
})
