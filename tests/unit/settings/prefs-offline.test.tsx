import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { DEFAULT_PREFERENCES, migratePreferences } from '@/lib/settings/preferences'
import SecuritySection from '@/app/settings/sections/SecuritySection'

const createClient = vi.fn()
vi.mock('@/lib/supabase/client', () => ({ createClient: (...a: unknown[]) => createClient(...a) }))

afterEach(() => {
  vi.unstubAllGlobals()
  createClient.mockClear()
})

describe('settings preference reads: no auth gate, defaults when storage is unavailable (FR-010, FR-036)', () => {
  it('the preference module has no auth, Supabase, or network dependency', () => {
    const src = readFileSync('src/lib/settings/preferences.ts', 'utf8')
    expect(src).not.toMatch(/supabase|auth|fetch\(|XMLHttpRequest/i)
  })

  it('signed out: reading cached preferences makes no Supabase call and returns stored values', () => {
    const r = migratePreferences({ getItem: (k) => (k === 'krama-compose-layer' ? 'expert' : null) })
    expect(r.composeLayer).toBe('expert')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('a localStorage that throws on access yields defaults', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError')
      },
    })
    expect(migratePreferences(localStorage)).toEqual(DEFAULT_PREFERENCES)
  })

  it('settings sections render with defaults and no error when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
    })
    expect(() => render(<SecuritySection email="a@b.co" provider="email" />)).not.toThrow()
    expect(screen.getByText('a@b.co')).toBeTruthy()
    expect(createClient).not.toHaveBeenCalled()
  })
})
