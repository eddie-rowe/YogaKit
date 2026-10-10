import { describe, it, expect } from 'vitest'

import { PRE_PAINT_SCRIPT, applyTheme, isThemeChoice, readThemeCookie } from '@/lib/theme'

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

// 006 T050 — FR-032/FR-033 conformance: first paint, default, corrupt value, round-trip.
describe('theme persistence conformance', () => {
  const run = (cookie: string) => {
    document.documentElement.removeAttribute('data-theme')
    Object.defineProperty(document, 'cookie', { configurable: true, get: () => cookie, set: () => {} })
    new Function(PRE_PAINT_SCRIPT)()
    return document.documentElement.getAttribute('data-theme')
  }

  it('stamps a persisted theme on first paint', () => {
    expect(run('krama-theme=dark')).toBe('dark')
    expect(run('a=1; krama-theme=light')).toBe('light')
  })

  it('leaves the attribute off when the cookie is absent', () => {
    expect(run('')).toBeNull()
  })

  it('leaves the attribute off for a corrupt value or malformed encoding', () => {
    expect(run('krama-theme=sepia')).toBeNull()
    expect(run('krama-theme=%E0%A4')).toBeNull()
  })

  it('round-trips: applyTheme writes a long-lived cookie readThemeCookie reads back', () => {
    let jar = ''
    Object.defineProperty(document, 'cookie', { configurable: true, get: () => jar, set: (v: string) => { jar = v.split(';')[0] } })
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(readThemeCookie(jar)).toBe('dark')
    applyTheme('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(readThemeCookie(jar)).toBe('system')
  })

  it('writes a one-year, path-wide cookie', () => {
    const writes: string[] = []
    Object.defineProperty(document, 'cookie', { configurable: true, get: () => '', set: (v: string) => { writes.push(v) } })
    applyTheme('light')
    expect(writes[0]).toContain('krama-theme=light')
    expect(writes[0]).toContain('path=/')
    expect(writes[0]).toContain(`max-age=${60 * 60 * 24 * 365}`)
  })
})
