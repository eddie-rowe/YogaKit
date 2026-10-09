import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES, migratePreferences } from '@/lib/settings/preferences'

const reader = (m: Record<string, string>) => ({ getItem: (k: string) => (k in m ? m[k] : null) })

describe('migratePreferences', () => {
  it('carries valid existing values over unchanged', () => {
    const custom = { ...DEFAULT_PREFERENCES.poseDetailCustomFields, chakras: false }
    const r = migratePreferences(
      reader({
        'krama-compose-layer': 'expert',
        'krama-pose-detail-layer': 'custom',
        'krama-pose-detail-custom-fields': JSON.stringify(custom),
        'krama-claim-flows-decided': '1',
      }),
    )
    expect(r).toEqual({
      composeLayer: 'expert',
      poseDetailLayer: 'custom',
      poseDetailCustomFields: custom,
      claimFlowsDecided: true,
    })
  })

  it('absent values yield defaults', () => {
    expect(migratePreferences(reader({}))).toEqual(DEFAULT_PREFERENCES)
  })

  it('corrupt values yield defaults, never an error', () => {
    const r = migratePreferences(
      reader({
        'krama-compose-layer': 'bogus',
        'krama-pose-detail-layer': '{',
        'krama-pose-detail-custom-fields': '{not json',
      }),
    )
    expect(r).toEqual(DEFAULT_PREFERENCES)
  })

  it('custom fields: non-boolean and unknown keys are ignored, valid keys kept', () => {
    const r = migratePreferences(
      reader({ 'krama-pose-detail-custom-fields': '{"chakras":false,"dosha":"no","zzz":true}' }),
    )
    expect(r.poseDetailCustomFields.chakras).toBe(false)
    expect(r.poseDetailCustomFields.dosha).toBe(true)
    expect(r.poseDetailCustomFields).not.toHaveProperty('zzz')
  })

  it('custom fields: non-object JSON yields defaults', () => {
    for (const v of ['null', '[1]', '5', '"x"']) {
      expect(
        migratePreferences(reader({ 'krama-pose-detail-custom-fields': v })).poseDetailCustomFields,
      ).toEqual(DEFAULT_PREFERENCES.poseDetailCustomFields)
    }
  })

  it('storage that throws yields defaults', () => {
    const r = migratePreferences({
      getItem: () => {
        throw new Error('SecurityError')
      },
    })
    expect(r).toEqual(DEFAULT_PREFERENCES)
  })

  it('null reader (storage unavailable) yields defaults', () => {
    expect(migratePreferences(null)).toEqual(DEFAULT_PREFERENCES)
  })

  it('returned defaults are not shared mutable state', () => {
    const a = migratePreferences(null)
    a.poseDetailCustomFields.chakras = false
    expect(migratePreferences(null).poseDetailCustomFields.chakras).toBe(true)
  })
})
