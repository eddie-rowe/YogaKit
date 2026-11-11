import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { readFileSync } from 'node:fs'

import { useDetailLayer } from '@/app/poses/PoseDetailContent'

// 006 T054b — pose detail reads its layer and custom fields through migratePreferences.
beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('useDetailLayer reads the migrated model', () => {
  it('honours a valid stored layer and custom fields', () => {
    window.localStorage.setItem('krama-pose-detail-layer', 'custom')
    window.localStorage.setItem('krama-pose-detail-custom-fields', JSON.stringify({ dosha: false }))
    const { result } = renderHook(() => useDetailLayer())
    expect(result.current.layer).toBe('custom')
    expect(result.current.customFields.dosha).toBe(false)
    expect(result.current.customFields.breathing).toBe(true)
  })

  it('ignores non-boolean custom field values rather than spreading them in', () => {
    window.localStorage.setItem('krama-pose-detail-custom-fields', '{"dosha":"no","zzz":true}')
    const { result } = renderHook(() => useDetailLayer())
    expect(result.current.customFields.dosha).toBe(true)
    expect('zzz' in result.current.customFields).toBe(false)
  })

  it('a corrupt layer falls back to simple', () => {
    window.localStorage.setItem('krama-pose-detail-layer', 'bogus')
    expect(renderHook(() => useDetailLayer()).result.current.layer).toBe('simple')
  })

  it('select and toggle write the existing keys and formats', () => {
    const { result } = renderHook(() => useDetailLayer())
    act(() => result.current.selectLayer('expert'))
    act(() => result.current.toggleCustomField('chakras'))
    expect(result.current.layer).toBe('expert')
    expect(window.localStorage.getItem('krama-pose-detail-layer')).toBe('expert')
    expect(JSON.parse(window.localStorage.getItem('krama-pose-detail-custom-fields')!).chakras).toBe(false)
  })

  it('throwing getItem/setItem: renders defaults and changes do not throw', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('SecurityError')
      },
    })
    const { result } = renderHook(() => useDetailLayer())
    expect(result.current.layer).toBe('simple')
    expect(() => act(() => result.current.selectLayer('advanced'))).not.toThrow()
    expect(() => act(() => result.current.toggleCustomField('dosha'))).not.toThrow()
    expect(result.current.layer).toBe('advanced')
    expect(result.current.customFields.dosha).toBe(false)
  })
})

describe('one key source', () => {
  it('neither surface touches localStorage or defines its own key constant', () => {
    for (const f of ['src/app/poses/PoseDetailContent.tsx', 'src/app/compose/ComposeClient.tsx']) {
      const src = readFileSync(f, 'utf8')
      expect(src, f).not.toMatch(/localStorage/)
      expect(src, f).not.toMatch(/'krama-(compose|pose-detail)-/)
    }
  })
})
