import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PREFERENCES,
  migratePreferences,
  writePreference,
} from '@/lib/settings/preferences'
import { browserStorage } from '@/lib/settings/browser-storage'

function memory() {
  const m = new Map<string, string>()
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe('writePreference (006 T054, FR-034/FR-036)', () => {
  it('writes layers under the existing keys as bare names', () => {
    const s = memory()
    expect(writePreference(s, 'composeLayer', 'expert')).toBe(true)
    expect(writePreference(s, 'poseDetailLayer', 'custom')).toBe(true)
    expect(s.m.get('krama-compose-layer')).toBe('expert')
    expect(s.m.get('krama-pose-detail-layer')).toBe('custom')
  })

  it('writes custom fields as the JSON object the pose detail already reads', () => {
    const s = memory()
    const fields = { ...DEFAULT_PREFERENCES.poseDetailCustomFields, dosha: false }
    writePreference(s, 'poseDetailCustomFields', fields)
    expect(JSON.parse(s.m.get('krama-pose-detail-custom-fields')!)).toEqual(fields)
  })

  it('round-trips through migratePreferences', () => {
    const s = memory()
    writePreference(s, 'composeLayer', 'advanced')
    writePreference(s, 'poseDetailLayer', 'expert')
    const r = migratePreferences(s)
    expect(r.composeLayer).toBe('advanced')
    expect(r.poseDetailLayer).toBe('expert')
  })

  it('returns false and does not throw when storage is missing or throws', () => {
    expect(writePreference(null, 'composeLayer', 'expert')).toBe(false)
    const throwing = {
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(() => writePreference(throwing, 'composeLayer', 'expert')).not.toThrow()
    expect(writePreference(throwing, 'composeLayer', 'expert')).toBe(false)
  })
})

describe('browserStorage', () => {
  it('returns window.localStorage when it is readable', () => {
    expect(browserStorage()).toBe(window.localStorage)
  })

  it('returns null when reading localStorage throws', () => {
    const spy = Object.getOwnPropertyDescriptor(window, 'localStorage')!
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError')
      },
    })
    try {
      expect(browserStorage()).toBeNull()
    } finally {
      Object.defineProperty(window, 'localStorage', spy)
    }
  })
})
