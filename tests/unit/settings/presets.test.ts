import { describe, expect, it } from 'vitest'
import {
  applyPreset,
  deletePreset,
  parsePresets,
  renamePreset,
  savePreset,
  type Preset,
} from '@/lib/settings/presets'

const base: Preset[] = [
  { name: 'Teaching', fields: ['cue', 'anatomy'] },
  { name: 'Home', fields: ['breath'] },
]

describe('savePreset', () => {
  it('appends a new preset without mutating the input', () => {
    const snap = JSON.stringify(base)
    const r = savePreset(base, 'Quick', ['cue'])
    expect(r).toEqual({ ok: true, presets: [...base, { name: 'Quick', fields: ['cue'] }] })
    expect(JSON.stringify(base)).toBe(snap)
  })
  it('rejects blank and duplicate names with a typed result', () => {
    expect(savePreset(base, '   ', [])).toEqual({ ok: false, reason: 'blank' })
    expect(savePreset(base, 'Home', [])).toEqual({ ok: false, reason: 'duplicate' })
  })
  it('trims the name', () => {
    const r = savePreset([], '  Hi ', ['a'])
    expect(r.ok && r.presets[0].name).toBe('Hi')
  })
})

describe('applyPreset', () => {
  it('returns a copy of the named preset fields', () => {
    const f = applyPreset(base, 'Teaching')
    expect(f).toEqual(['cue', 'anatomy'])
    f!.push('x')
    expect(base[0].fields).toEqual(['cue', 'anatomy'])
  })
  it('returns null for an unknown name', () => {
    expect(applyPreset(base, 'Nope')).toBeNull()
  })
})

describe('renamePreset', () => {
  it('renames only the target', () => {
    const r = renamePreset(base, 'Home', 'House')
    expect(r).toEqual({
      ok: true,
      presets: [base[0], { name: 'House', fields: ['breath'] }],
    })
  })
  it('rejects blank, duplicate, and missing', () => {
    expect(renamePreset(base, 'Home', '')).toEqual({ ok: false, reason: 'blank' })
    expect(renamePreset(base, 'Home', 'Teaching')).toEqual({ ok: false, reason: 'duplicate' })
    expect(renamePreset(base, 'Nope', 'X')).toEqual({ ok: false, reason: 'missing' })
  })
  it('allows renaming to the same name', () => {
    expect(renamePreset(base, 'Home', 'Home').ok).toBe(true)
  })
})

describe('deletePreset', () => {
  it('removes only the target', () => {
    expect(deletePreset(base, 'Home')).toEqual([base[0]])
  })
  it('is a no-op for an unknown name', () => {
    expect(deletePreset(base, 'Nope')).toEqual(base)
  })
})

describe('parsePresets', () => {
  it('round-trips valid JSON', () => {
    expect(parsePresets(JSON.stringify(base))).toEqual(base)
  })
  it.each([null, undefined, '', 'not json', '{}', '"s"', '[1,2]', '[{"name":"a"}]', '[{"name":"a","fields":[1]}]'])(
    'treats %j as empty',
    (raw) => {
      expect(parsePresets(raw as string | null | undefined)).toEqual([])
    },
  )
  it('drops malformed entries but keeps valid ones', () => {
    expect(parsePresets(JSON.stringify([base[0], { name: 3 }]))).toEqual([base[0]])
  })
})
