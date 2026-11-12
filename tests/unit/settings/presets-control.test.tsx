import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import PreferencesSection from '@/app/settings/sections/PreferencesSection'
import { PRESETS_KEY } from '@/lib/settings/presets'

// 006 T055 (FR-037) — named presets for the pose-detail custom-field checklist,
// local only until the T006 server table merges.
beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

const checked = (testid: string) => screen.getByTestId(testid).getAttribute('aria-checked')
const stored = () => JSON.parse(window.localStorage.getItem(PRESETS_KEY) ?? 'null')
const storedFields = () =>
  JSON.parse(window.localStorage.getItem('krama-pose-detail-custom-fields') ?? 'null')

function save(name: string) {
  fireEvent.change(screen.getByTestId('settings-preset-name-input'), { target: { value: name } })
  fireEvent.click(screen.getByTestId('settings-preset-save'))
}

describe('pose-detail presets control', () => {
  it('saves the current checklist under a name and lists it', () => {
    render(<PreferencesSection />)
    fireEvent.click(screen.getByTestId('settings-pref-field-chakras'))
    save('  Teaching  ')
    expect(stored()).toEqual([
      {
        name: 'Teaching',
        fields: ['breathing', 'dosha', 'emotional', 'modifications', 'muscles-joints', 'contraindications-props'],
      },
    ])
    const item = screen.getByTestId('settings-preset-item-0')
    expect(within(item).getByText('Teaching')).toBeTruthy()
    expect((screen.getByTestId('settings-preset-name-input') as HTMLInputElement).value).toBe('')
    expect(screen.queryByTestId('settings-preset-error')).toBeNull()
  })

  it('rejects a blank name with inline copy and saves nothing', () => {
    render(<PreferencesSection />)
    save('   ')
    expect(screen.getByTestId('settings-preset-error').textContent).toMatch(/name/i)
    expect(window.localStorage.getItem(PRESETS_KEY)).toBeNull()
  })

  it('rejects a duplicate name with inline copy and keeps the original', () => {
    render(<PreferencesSection />)
    save('Home')
    fireEvent.click(screen.getByTestId('settings-pref-field-dosha'))
    save('Home')
    expect(screen.getByTestId('settings-preset-error').textContent).toMatch(/already/i)
    expect(stored()).toHaveLength(1)
    expect(stored()[0].fields).toContain('dosha')
  })

  it('apply replaces the checked fields through the preference key', () => {
    window.localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: 'Breath only', fields: ['breathing'] }]),
    )
    render(<PreferencesSection />)
    fireEvent.click(screen.getByTestId('settings-preset-apply-0'))
    expect(checked('settings-pref-field-breathing')).toBe('true')
    expect(checked('settings-pref-field-chakras')).toBe('false')
    const fields = storedFields()
    expect(fields.breathing).toBe(true)
    expect(fields.chakras).toBe(false)
    expect(fields.modifications).toBe(false)
  })

  it('apply ignores field names that are no longer known', () => {
    window.localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: 'Old', fields: ['chakras', 'retired-field'] }]),
    )
    render(<PreferencesSection />)
    fireEvent.click(screen.getByTestId('settings-preset-apply-0'))
    const fields = storedFields()
    expect(fields.chakras).toBe(true)
    expect(fields.breathing).toBe(false)
    expect('retired-field' in fields).toBe(false)
  })

  it('rename touches only the target preset', () => {
    window.localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([
        { name: 'A', fields: ['breathing'] },
        { name: 'B', fields: ['chakras'] },
      ]),
    )
    render(<PreferencesSection />)
    fireEvent.click(screen.getByTestId('settings-preset-rename-0'))
    fireEvent.change(screen.getByTestId('settings-preset-renaming-input'), { target: { value: 'Morning' } })
    fireEvent.click(screen.getByTestId('settings-preset-renaming-confirm'))
    expect(stored()).toEqual([
      { name: 'Morning', fields: ['breathing'] },
      { name: 'B', fields: ['chakras'] },
    ])
    expect(screen.getByTestId('settings-preset-item-0').getAttribute('aria-label')).toBe('Morning')
  })

  it('rename to an existing name shows inline copy and changes nothing', () => {
    window.localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([
        { name: 'A', fields: ['breathing'] },
        { name: 'B', fields: ['chakras'] },
      ]),
    )
    render(<PreferencesSection />)
    fireEvent.click(screen.getByTestId('settings-preset-rename-0'))
    fireEvent.change(screen.getByTestId('settings-preset-renaming-input'), { target: { value: 'B' } })
    fireEvent.click(screen.getByTestId('settings-preset-renaming-confirm'))
    expect(screen.getByTestId('settings-preset-error').textContent).toMatch(/already/i)
    expect(stored().map((p: { name: string }) => p.name)).toEqual(['A', 'B'])
  })

  it('rename can be cancelled', () => {
    window.localStorage.setItem(PRESETS_KEY, JSON.stringify([{ name: 'A', fields: [] }]))
    render(<PreferencesSection />)
    fireEvent.click(screen.getByTestId('settings-preset-rename-0'))
    fireEvent.click(screen.getByTestId('settings-preset-renaming-cancel'))
    expect(screen.queryByTestId('settings-preset-renaming-input')).toBeNull()
    expect(stored()).toEqual([{ name: 'A', fields: [] }])
  })

  it('delete touches only the target preset', () => {
    window.localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([
        { name: 'A', fields: ['breathing'] },
        { name: 'B', fields: ['chakras'] },
      ]),
    )
    render(<PreferencesSection />)
    fireEvent.click(screen.getByTestId('settings-preset-delete-0'))
    expect(stored()).toEqual([{ name: 'B', fields: ['chakras'] }])
    expect(screen.getByTestId('settings-preset-item-0').getAttribute('aria-label')).toBe('B')
    expect(screen.queryByTestId('settings-preset-item-1')).toBeNull()
  })

  it('presets survive a remount (reload)', () => {
    const first = render(<PreferencesSection />)
    save('Keep')
    first.unmount()
    render(<PreferencesSection />)
    expect(screen.getByTestId('settings-preset-item-0')).toBeTruthy()
  })

  it('corrupt storage falls back to an empty list', () => {
    window.localStorage.setItem(PRESETS_KEY, '{not json')
    render(<PreferencesSection />)
    expect(screen.queryAllByTestId(/^settings-preset-item-/)).toHaveLength(0)
    expect(screen.getByTestId('settings-preset-empty')).toBeTruthy()
  })

  it('throwing storage renders and still responds for this visit (FR-036)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('SecurityError')
      },
    })
    expect(() => render(<PreferencesSection />)).not.toThrow()
    expect(() => save('Visit')).not.toThrow()
    expect(screen.getByTestId('settings-preset-item-0')).toBeTruthy()
    expect(() => fireEvent.click(screen.getByTestId('settings-preset-apply-0'))).not.toThrow()
    expect(() => fireEvent.click(screen.getByTestId('settings-preset-delete-0'))).not.toThrow()
    expect(screen.queryByTestId('settings-preset-item-0')).toBeNull()
  })

  it('a preset named like an editor control does not collide with it', () => {
    window.localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([
        { name: 'cancel', fields: [] },
        { name: 'B', fields: ['chakras'] },
      ]),
    )
    render(<PreferencesSection />)
    fireEvent.click(screen.getByTestId('settings-preset-rename-1'))
    expect(screen.getAllByTestId('settings-preset-renaming-cancel')).toHaveLength(1)
    fireEvent.click(screen.getByTestId('settings-preset-renaming-cancel'))
    expect(stored().map((p: { name: string }) => p.name)).toEqual(['cancel', 'B'])
  })

  it('a repeated name in storage keeps the first, so delete stays targeted', () => {
    window.localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([
        { name: 'A', fields: ['breathing'] },
        { name: 'A', fields: ['chakras'] },
        { name: 'B', fields: [] },
      ]),
    )
    render(<PreferencesSection />)
    expect(screen.queryAllByTestId(/^settings-preset-item-\d+$/)).toHaveLength(2)
    fireEvent.click(screen.getByTestId('settings-preset-delete-0'))
    expect(stored()).toEqual([{ name: 'B', fields: [] }])
  })
})
