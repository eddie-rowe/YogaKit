import { describe, it, expect } from 'vitest'

import { safeNextPath } from '@/lib/auth/redirect'

// The value safeNextPath returns is handed straight to `new URL(next, origin)`
// by /auth/callback and /auth/confirm, so every case asserts the final resolved
// URL too — a return value that only looks relative is exactly the bug this
// helper exists to prevent.
const ORIGIN = 'https://yoga-kit.vercel.app'
const resolve = (next: string | null) => new URL(safeNextPath(next), ORIGIN).href

describe('safeNextPath', () => {
  it('keeps an ordinary in-app path', () => {
    expect(safeNextPath('/account')).toBe('/account')
    expect(resolve('/account')).toBe(`${ORIGIN}/account`)
  })

  it('preserves query and hash on an in-app path', () => {
    expect(safeNextPath('/org/new?type=studio#roles')).toBe('/org/new?type=studio#roles')
  })

  it('falls back to / when absent or not root-relative', () => {
    expect(safeNextPath(null)).toBe('/')
    expect(safeNextPath('')).toBe('/')
    expect(safeNextPath('account')).toBe('/')
    expect(safeNextPath('https://evil.com')).toBe('/')
  })

  it.each([
    ['protocol-relative', '//evil.com'],
    ['backslash normalized to a slash by WHATWG URL parsing', '/\\evil.com'],
    ['doubled backslash', '/\\\\evil.com'],
    ['backslash then slash', '/\\/evil.com'],
    ['slash then backslash', '//\\evil.com'],
  ])('refuses to leave the origin: %s', (_label, candidate) => {
    expect(resolve(candidate)).toBe(`${ORIGIN}/`)
    expect(new URL(safeNextPath(candidate), ORIGIN).hostname).toBe('yoga-kit.vercel.app')
  })
})
