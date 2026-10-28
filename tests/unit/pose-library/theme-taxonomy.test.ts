import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'

import { THEMES, themeBySlug } from '@/lib/pose-library/theme-taxonomy'
import { checkTaxonomy } from '../../../scripts/lib/theme-taxonomy.mjs'

// 003 US5 (FR-027, FR-029, SC-010). The closed set is the 14 themes of
// specs/003-pose-library/contracts/theme-taxonomy.md (signed off 2026-10-17, with the
// two reversals: `sadness` is its own theme, and `grief and letting go` is `letting-go`).

const schema = JSON.parse(fs.readFileSync('data/schemas/pose.schema.json', 'utf8'))
const allPoses = fs
  .readdirSync('data/poses')
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join('data/poses', f), 'utf8')))

const EXPECTED_SLUGS = [
  'grief', 'sadness', 'fear', 'frustration', 'vulnerability', 'control', 'courage',
  'surrender', 'groundedness', 'anger', 'openness', 'letting-go', 'trust', 'integration',
]

describe('theme taxonomy data (T057)', () => {
  it('is exactly the 14 themes of the signed-off contract', () => {
    expect(THEMES.map(t => t.slug).sort()).toEqual([...EXPECTED_SLUGS].sort())
  })

  it('gives every theme a label, a subhead and at least one TCM organ', () => {
    for (const t of THEMES) {
      expect(t.label.length, t.slug).toBeGreaterThan(0)
      expect(t.subhead.length, t.slug).toBeGreaterThan(0)
      expect(t.tcm_organs.length, t.slug).toBeGreaterThan(0)
    }
  })

  it('carries the sign-off subhead for the new sadness theme', () => {
    expect(themeBySlug('sadness')?.subhead).toBe(
      'Deep-tissue holds at the chest and inner groin, along the lung and liver lines.'
    )
  })

  it('returns undefined for a slug outside the closed set', () => {
    expect(themeBySlug('chronic-vigilance')).toBeUndefined()
  })
})

describe('pose schema enum (T058, FR-029)', () => {
  const emotion =
    schema.properties.emotional_release_potential.items.properties.emotion

  it('closes emotion to the taxonomy slugs', () => {
    expect([...emotion.enum].sort()).toEqual([...EXPECTED_SLUGS].sort())
  })

  it('stays Tier-2 so the Tier-1 gate shape is unchanged', () => {
    expect(schema['x-tier2-properties']).toContain('emotional_release_potential')
    expect(schema.required).not.toContain('emotional_release_potential')
  })
})

describe('pose data patch (T059)', () => {
  const emotions = allPoses.flatMap(p => (p.emotional_release_potential ?? []).map((e: { emotion: string }) => e.emotion))

  it('keeps all 101 occurrences', () => {
    expect(emotions).toHaveLength(101)
  })

  it('resolves every occurrence to a taxonomy slug', () => {
    expect(emotions.filter(e => !themeBySlug(e))).toEqual([])
  })

  it('applies the contract counts, including the two reversals', () => {
    const n = (s: string) => emotions.filter(e => e === s).length
    expect(n('grief')).toBe(14)
    expect(n('sadness')).toBe(2)
    expect(n('letting-go')).toBe(4)
  })

  it('files the two sadness values under supported-fish and butterfly, and the bridge under letting-go', () => {
    const slugsFor = (emo: string) =>
      allPoses.filter(p => (p.emotional_release_potential ?? []).some((e: { emotion: string }) => e.emotion === emo)).map(p => p.slug)
    expect(slugsFor('sadness').sort()).toEqual(['butterfly', 'supported-fish'])
    expect(slugsFor('letting-go')).toContain('snail')
  })
})

describe('checkTaxonomy (T065, SC-010)', () => {
  const taxonomy = { themes: [{ slug: 'grief', label: 'Grief', subhead: 'x', tcm_organs: ['lung'] }] }
  const enumOf = ['grief']
  const pose = (slug: string, ...emotions: string[]) => ({
    slug,
    emotional_release_potential: emotions.map(emotion => ({ emotion, tcm_organ: 'lung' })),
  })

  it('passes on the real library', () => {
    expect(checkTaxonomy({ taxonomy: { themes: THEMES }, schemaEnum: EXPECTED_SLUGS, poses: allPoses })).toEqual([])
  })

  it('passes a clean fixture, including a pose with no emotions', () => {
    expect(checkTaxonomy({ taxonomy, schemaEnum: enumOf, poses: [pose('a', 'grief'), { slug: 'b' }] })).toEqual([])
  })

  it('names a pose emotion that resolves to no theme', () => {
    const problems = checkTaxonomy({ taxonomy, schemaEnum: enumOf, poses: [pose('a', 'anxiety')] })
    expect(problems).toEqual(['pose "a": emotion "anxiety" is not in the theme taxonomy'])
  })

  it('names a theme with a blank subhead', () => {
    const t = { themes: [{ slug: 'grief', label: 'Grief', subhead: '  ', tcm_organs: ['lung'] }] }
    expect(checkTaxonomy({ taxonomy: t, schemaEnum: enumOf, poses: [] })).toEqual([
      'theme "grief": subhead is empty',
    ])
  })

  it('names a theme missing from the schema enum and an enum value with no theme', () => {
    const problems = checkTaxonomy({ taxonomy, schemaEnum: ['fear'], poses: [] })
    expect(problems).toEqual([
      'theme "grief": missing from the emotion enum in pose.schema.json',
      'emotion enum value "fear" has no theme in theme-taxonomy.json',
    ])
  })

  it('names duplicate theme slugs', () => {
    const t = { themes: [...taxonomy.themes, ...taxonomy.themes] }
    expect(checkTaxonomy({ taxonomy: t, schemaEnum: enumOf, poses: [] })).toEqual([
      'theme "grief": duplicate slug',
    ])
  })
})
