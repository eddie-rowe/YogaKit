import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock('@/lib/storage/flow-store', () => ({
  saveFlow: vi.fn(async () => undefined),
  getFlow: vi.fn(async () => null),
  getAllFlows: vi.fn(async () => []),
}))
vi.mock('@/lib/storage/sync', () => ({ queueUpsert: vi.fn() }))

import ComposeClient from '@/app/compose/ComposeClient'

// 006 T054b — the composer reads its layer through migratePreferences (FR-035, FR-036).
beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

const active = () =>
  Array.from(document.querySelectorAll('[data-testid^="compose-layer-"]'))
    .filter(b => b.getAttribute('data-active') === 'true')
    .map(b => b.getAttribute('data-testid'))

const mount = () => render(<ComposeClient poses={[]} builtins={[]} />)

describe('ComposeClient layer preference', () => {
  it('honours a valid stored layer', () => {
    window.localStorage.setItem('krama-compose-layer', 'expert')
    mount()
    expect(active()).toEqual(['compose-layer-expert'])
  })

  it('a corrupt stored layer falls back to simple', () => {
    window.localStorage.setItem('krama-compose-layer', '{bad')
    mount()
    expect(active()).toEqual(['compose-layer-simple'])
  })

  it('picking a layer writes the existing key', () => {
    mount()
    fireEvent.click(screen.getByTestId('compose-layer-advanced'))
    expect(window.localStorage.getItem('krama-compose-layer')).toBe('advanced')
    expect(active()).toEqual(['compose-layer-advanced'])
  })

  it('throwing getItem/setItem: renders with defaults and a pick does not throw', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('SecurityError')
      },
    })
    expect(() => mount()).not.toThrow()
    expect(active()).toEqual(['compose-layer-simple'])
    expect(() => fireEvent.click(screen.getByTestId('compose-layer-expert'))).not.toThrow()
    expect(active()).toEqual(['compose-layer-expert'])
  })
})
