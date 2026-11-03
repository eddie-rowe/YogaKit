import { describe, it, expect } from 'vitest'
import { sharingState, DEFAULT_UNDO_WINDOW_MS } from './sharing-window'

const T = Date.parse('2026-11-03T10:00:00Z')
const W = DEFAULT_UNDO_WINDOW_MS

describe('sharingState', () => {
  it('is sharing when not revoked', () => {
    expect(sharingState({ shareSignals: true, revokedAt: null, now: T, undoWindowMs: W })).toBe('sharing')
  })
  it('is undo-pending inside the window', () => {
    expect(sharingState({ shareSignals: false, revokedAt: T - 1000, now: T, undoWindowMs: W })).toBe('undo-pending')
  })
  it('is stopped at exactly the window (boundary) and after', () => {
    expect(sharingState({ shareSignals: false, revokedAt: T - W, now: T, undoWindowMs: W })).toBe('stopped')
    expect(sharingState({ shareSignals: false, revokedAt: T - W - 1, now: T, undoWindowMs: W })).toBe('stopped')
  })
  it('is sharing again only with a grant later than the revoke', () => {
    expect(sharingState({ shareSignals: true, revokedAt: T - 100000, grantedAt: T - 1000, now: T, undoWindowMs: W })).toBe('sharing')
    expect(sharingState({ shareSignals: true, revokedAt: T - 100000, grantedAt: T - 200000, now: T, undoWindowMs: W })).toBe('stopped')
    expect(sharingState({ shareSignals: true, revokedAt: T - 100000, grantedAt: T - 100000, now: T, undoWindowMs: W })).toBe('stopped')
  })
  it('never reactivates as time passes', () => {
    for (const later of [T, T + W, T + 10 * W, T + 1e12]) {
      expect(sharingState({ shareSignals: false, revokedAt: T - W, now: later, undoWindowMs: W })).toBe('stopped')
    }
  })
  it('treats a revoke in the future (clock skew) as undo-pending', () => {
    expect(sharingState({ shareSignals: false, revokedAt: T + 500, now: T, undoWindowMs: W })).toBe('undo-pending')
  })
  it('default window is within 5000-8000 ms', () => {
    expect(W).toBeGreaterThanOrEqual(5000)
    expect(W).toBeLessThanOrEqual(8000)
  })
})
