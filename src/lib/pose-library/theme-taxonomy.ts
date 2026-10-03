// Pure lookup over the closed theme taxonomy (003 US5, FR-027, FR-029).
// No `fs` — importable by both server and client components, same as display-name.ts.
// `emotion` values in data/poses/*.json are already canonical slugs (T059's data
// patch), so this is a direct slug lookup, not a fuzzy match.
import taxonomy from '../../../data/schemas/theme-taxonomy.json'

export interface ThemeTaxonomyEntry {
  slug: string
  label: string
  subhead: string
  tcm_organs: string[]
}

export const THEME_TAXONOMY = taxonomy as ThemeTaxonomyEntry[]

const BY_SLUG = new Map(THEME_TAXONOMY.map(entry => [entry.slug, entry]))

export function getThemeTaxonomyEntry(slug: string): ThemeTaxonomyEntry | undefined {
  return BY_SLUG.get(slug)
}
