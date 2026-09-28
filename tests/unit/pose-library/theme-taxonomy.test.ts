import { describe, it, expect } from 'vitest'
import { THEME_TAXONOMY, getThemeTaxonomyEntry } from '@/lib/pose-library/theme-taxonomy'

describe('THEME_TAXONOMY', () => {
  it('has exactly 13 entries, the closed set from theme-taxonomy.md', () => {
    expect(THEME_TAXONOMY).toHaveLength(13)
  })

  it('has a unique, non-empty slug/label/subhead/tcm_organs on every entry', () => {
    const slugs = new Set<string>()
    for (const entry of THEME_TAXONOMY) {
      expect(entry.slug.length).toBeGreaterThan(0)
      expect(entry.label.length).toBeGreaterThan(0)
      expect(entry.subhead.length).toBeGreaterThan(0)
      expect(entry.tcm_organs.length).toBeGreaterThan(0)
      expect(slugs.has(entry.slug)).toBe(false)
      slugs.add(entry.slug)
    }
  })
})

describe('getThemeTaxonomyEntry', () => {
  it('resolves every real slug to its own entry', () => {
    for (const entry of THEME_TAXONOMY) {
      expect(getThemeTaxonomyEntry(entry.slug)).toEqual(entry)
    }
  })

  it('returns undefined for a slug outside the closed set', () => {
    expect(getThemeTaxonomyEntry('nostalgia')).toBeUndefined()
  })
})
