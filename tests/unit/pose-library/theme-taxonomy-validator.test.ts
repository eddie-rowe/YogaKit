import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'

// Imported from scripts/ rather than src/ on purpose, same rationale as
// tier1-report.test.ts: this is build tooling, not something the app reads.
import { findUnresolvedEmotions, validateThemeTaxonomy } from '../../../scripts/lib/theme-taxonomy.mjs'

// 003 US5 / T065: proves SC-010 ("every emotion resolves to a taxonomy entry, every
// taxonomy entry has a non-empty subhead") mechanically rather than by inspection.

const schema = JSON.parse(fs.readFileSync('data/schemas/pose.schema.json', 'utf8'))
const realTaxonomy = JSON.parse(fs.readFileSync('data/schemas/theme-taxonomy.json', 'utf8'))
const realEmotionEnum = schema.properties.emotional_release_potential.items.properties.emotion.enum as string[]

function allRealPoses(): Record<string, unknown>[] {
  return fs
    .readdirSync('data/poses')
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join('data/poses', f), 'utf8')))
}

describe('validateThemeTaxonomy', () => {
  it('passes against the real taxonomy file and the real emotion enum', () => {
    expect(validateThemeTaxonomy(realTaxonomy, realEmotionEnum)).toEqual([])
  })

  it('is not an accident of an empty taxonomy — the real file actually has 13 entries', () => {
    expect(realTaxonomy).toHaveLength(13)
  })

  it('rejects a non-array input', () => {
    expect(validateThemeTaxonomy(null as never, [])).toEqual(['theme-taxonomy.json must be an array'])
    expect(validateThemeTaxonomy(undefined as never, [])).toEqual(['theme-taxonomy.json must be an array'])
  })

  it('flags an entry missing or with an empty slug, and skips its other checks', () => {
    const errors = validateThemeTaxonomy([{ slug: '', label: 'x', subhead: 'x', tcm_organs: ['heart'] }], [])
    expect(errors).toEqual(['theme-taxonomy.json[0]: missing or empty "slug"'])
  })

  it('flags a duplicate slug', () => {
    const entry = { slug: 'grief', label: 'Grief', subhead: 'x', tcm_organs: ['lung'] }
    const errors = validateThemeTaxonomy([entry, { ...entry }], ['grief'])
    expect(errors).toContain('theme-taxonomy.json: duplicate slug "grief"')
  })

  it('flags a missing or empty label', () => {
    const errors = validateThemeTaxonomy(
      [{ slug: 'grief', label: '', subhead: 'x', tcm_organs: ['lung'] }],
      ['grief']
    )
    expect(errors).toContain('theme-taxonomy.json["grief"]: missing or empty "label"')
  })

  it('flags a missing or empty subhead (SC-010)', () => {
    const errors = validateThemeTaxonomy(
      [{ slug: 'grief', label: 'Grief', subhead: '', tcm_organs: ['lung'] }],
      ['grief']
    )
    expect(errors).toContain('theme-taxonomy.json["grief"]: missing or empty "subhead" (SC-010)')
  })

  it('flags a missing or empty tcm_organs array', () => {
    const errors = validateThemeTaxonomy(
      [{ slug: 'grief', label: 'Grief', subhead: 'x', tcm_organs: [] }],
      ['grief']
    )
    expect(errors).toContain('theme-taxonomy.json["grief"]: "tcm_organs" must be a non-empty array')

    const errors2 = validateThemeTaxonomy(
      [{ slug: 'grief', label: 'Grief', subhead: 'x', tcm_organs: 'lung' as never }],
      ['grief']
    )
    expect(errors2).toContain('theme-taxonomy.json["grief"]: "tcm_organs" must be a non-empty array')
  })

  it('flags a taxonomy slug absent from the emotion enum', () => {
    const errors = validateThemeTaxonomy(
      [{ slug: 'nostalgia', label: 'Nostalgia', subhead: 'x', tcm_organs: ['heart'] }],
      ['grief']
    )
    expect(errors).toContain(
      'theme-taxonomy.json has slug "nostalgia" absent from pose.schema.json\'s emotion enum'
    )
  })

  it('flags an enum value with no taxonomy entry', () => {
    const errors = validateThemeTaxonomy(
      [{ slug: 'grief', label: 'Grief', subhead: 'x', tcm_organs: ['lung'] }],
      ['grief', 'fear']
    )
    expect(errors).toContain(
      'pose.schema.json\'s emotion enum has "fear" with no theme-taxonomy.json entry'
    )
  })
})

describe('findUnresolvedEmotions', () => {
  const taxonomySlugs = new Set<string>(realTaxonomy.map((t: { slug: string }) => t.slug))

  it('finds zero unresolved emotions across the real pose corpus', () => {
    expect(findUnresolvedEmotions(allRealPoses() as never, taxonomySlugs)).toEqual([])
  })

  it('treats a pose with no emotional_release_potential as trivially resolved', () => {
    expect(findUnresolvedEmotions([{ slug: 'no-emotions' }] as never, taxonomySlugs)).toEqual([])
  })

  it('flags a pose whose emotion does not resolve to a taxonomy slug', () => {
    const poses = [
      { slug: 'made-up-pose', emotional_release_potential: [{ emotion: 'nostalgia', tcm_organ: 'heart' }] },
    ]
    expect(findUnresolvedEmotions(poses as never, taxonomySlugs)).toEqual([
      'made-up-pose: emotion "nostalgia" does not resolve to a theme-taxonomy.json entry',
    ])
  })
})
