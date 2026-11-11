import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useStoredPreference } from '@/lib/settings/use-stored-preference'
import { DEFAULT_PREFERENCES, migratePreferences } from '@/lib/settings/preferences'

// 006 T054b — one read/write path for the stranded preferences (FR-035, FR-036).
beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

const throwingStorage = () =>
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('SecurityError')
    },
    setItem: () => {
      throw new Error('SecurityError')
    },
  })

describe('useStoredPreference', () => {
  it('honours a valid stored value', () => {
    window.localStorage.setItem('krama-compose-layer', 'expert')
    const { result } = renderHook(() => useStoredPreference('composeLayer'))
    expect(result.current[0]).toBe('expert')
  })

  it('a corrupt stored value falls back to the default', () => {
    window.localStorage.setItem('krama-pose-detail-layer', 'bogus')
    window.localStorage.setItem('krama-pose-detail-custom-fields', '{nope')
    expect(renderHook(() => useStoredPreference('poseDetailLayer')).result.current[0]).toBe('simple')
    expect(renderHook(() => useStoredPreference('poseDetailCustomFields')).result.current[0]).toEqual(
      DEFAULT_PREFERENCES.poseDetailCustomFields,
    )
  })

  it('setting writes the existing key and updates the value', () => {
    const { result } = renderHook(() => useStoredPreference('poseDetailLayer'))
    act(() => result.current[1]('custom'))
    expect(result.current[0]).toBe('custom')
    expect(window.localStorage.getItem('krama-pose-detail-layer')).toBe('custom')
  })

  it('custom fields round-trip as the JSON object the pose detail reads', () => {
    const { result } = renderHook(() => useStoredPreference('poseDetailCustomFields'))
    act(() => result.current[1]({ ...result.current[0], chakras: false }))
    expect(result.current[0].chakras).toBe(false)
    expect(migratePreferences(window.localStorage).poseDetailCustomFields.chakras).toBe(false)
  })

  it('throwing storage: defaults on read, and a change still applies in memory without throwing', () => {
    throwingStorage()
    const { result } = renderHook(() => useStoredPreference('composeLayer'))
    expect(result.current[0]).toBe('simple')
    expect(() => act(() => result.current[1]('advanced'))).not.toThrow()
    expect(result.current[0]).toBe('advanced')
  })
})

describe('two controls on the same key', () => {
  it('a write from one shows in the other', () => {
    const a = renderHook(() => useStoredPreference('composeLayer'))
    const b = renderHook(() => useStoredPreference('composeLayer'))
    act(() => a.result.current[1]('expert'))
    act(() => b.result.current[1]('advanced'))
    expect(a.result.current[0]).toBe('advanced')
    expect(b.result.current[0]).toBe('advanced')
  })
})

describe('legacy compose value', () => {
  it("a stored compose 'custom' (removed layer) carries over as 'advanced', as the composer always did", () => {
    expect(migratePreferences({ getItem: k => (k === 'krama-compose-layer' ? 'custom' : null) }).composeLayer).toBe(
      'advanced',
    )
  })
})
