import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import PreferencesSection from '@/app/settings/sections/PreferencesSection'
import { CUSTOM_FIELD_KEYS } from '@/lib/settings/preferences'

// 006 T054a — the preferences section (FR-034, FR-035, FR-036, SC-013).
beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

const checked = (testid: string) => screen.getByTestId(testid).getAttribute('aria-checked')

describe('PreferencesSection', () => {
  it('renders the migrated values from storage (FR-035)', () => {
    window.localStorage.setItem('krama-compose-layer', 'expert')
    window.localStorage.setItem('krama-pose-detail-layer', 'custom')
    window.localStorage.setItem(
      'krama-pose-detail-custom-fields',
      JSON.stringify({ chakras: false }),
    )
    render(<PreferencesSection />)
    expect(screen.getByTestId('settings-section-preferences')).toBeTruthy()
    expect(checked('settings-pref-compose-expert')).toBe('true')
    expect(checked('settings-pref-compose-simple')).toBe('false')
    expect(checked('settings-pref-detail-custom')).toBe('true')
    expect(checked('settings-pref-field-chakras')).toBe('false')
    expect(checked('settings-pref-field-breathing')).toBe('true')
  })

  it('has a visible control for every stranded preference (SC-013)', () => {
    render(<PreferencesSection />)
    for (const l of ['simple', 'advanced', 'expert']) {
      expect(screen.getByTestId(`settings-pref-compose-${l}`)).toBeTruthy()
    }
    for (const l of ['simple', 'advanced', 'expert', 'custom']) {
      expect(screen.getByTestId(`settings-pref-detail-${l}`)).toBeTruthy()
    }
    for (const k of CUSTOM_FIELD_KEYS) {
      expect(screen.getByTestId(`settings-pref-field-${k}`)).toBeTruthy()
    }
    expect(screen.getAllByRole('radiogroup')).toHaveLength(2)
  })

  it('selecting an option writes the existing key and value format', () => {
    render(<PreferencesSection />)
    fireEvent.click(screen.getByTestId('settings-pref-compose-advanced'))
    expect(window.localStorage.getItem('krama-compose-layer')).toBe('advanced')
    expect(checked('settings-pref-compose-advanced')).toBe('true')

    fireEvent.click(screen.getByTestId('settings-pref-detail-expert'))
    expect(window.localStorage.getItem('krama-pose-detail-layer')).toBe('expert')

    fireEvent.click(screen.getByTestId('settings-pref-field-dosha'))
    const fields = JSON.parse(window.localStorage.getItem('krama-pose-detail-custom-fields')!)
    expect(fields.dosha).toBe(false)
    expect(fields.breathing).toBe(true)
    expect(checked('settings-pref-field-dosha')).toBe('false')
  })

  it('corrupt or absent storage renders the defaults', () => {
    window.localStorage.setItem('krama-compose-layer', 'bogus')
    window.localStorage.setItem('krama-pose-detail-custom-fields', '{not json')
    render(<PreferencesSection />)
    expect(checked('settings-pref-compose-simple')).toBe('true')
    expect(checked('settings-pref-detail-simple')).toBe('true')
    for (const k of CUSTOM_FIELD_KEYS) expect(checked(`settings-pref-field-${k}`)).toBe('true')
  })

  it('throwing storage renders defaults and a click does not crash (FR-036)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('SecurityError')
      },
    })
    expect(() => render(<PreferencesSection />)).not.toThrow()
    expect(checked('settings-pref-compose-simple')).toBe('true')
    expect(() => fireEvent.click(screen.getByTestId('settings-pref-compose-expert'))).not.toThrow()
    expect(() => fireEvent.click(screen.getByTestId('settings-pref-field-dosha'))).not.toThrow()
  })
})
