import taxonomy from '../../../data/schemas/theme-taxonomy.json'

// The closed theme set (FR-029). Imported as JSON rather than read with fs so the client
// theme view can use it; the data is a build-time constant, not fetched.
// scripts/validate-poses.mjs checks it against pose.schema.json and the pose data.

export interface Theme {
  slug: string
  label: string
  subhead: string
  tcm_organs: string[]
}

export const THEMES: readonly Theme[] = taxonomy.themes

export function themeBySlug(slug: string): Theme | undefined {
  return THEMES.find(t => t.slug === slug)
}
