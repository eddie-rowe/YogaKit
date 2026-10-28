/** Pure cross-check for the closed theme taxonomy (003 US5, T065 — mechanises SC-010).
 *
 *  Takes data and returns a list of problem strings; no fs, no process. validate-poses.mjs
 *  does the reading and exits non-zero when the list is non-empty, so "every emotion
 *  resolves to a theme and every theme has a subhead" is a gate rather than an inspection.
 */
export function checkTaxonomy({ taxonomy, schemaEnum, poses }) {
  const problems = []
  const slugs = new Set()

  for (const theme of taxonomy.themes) {
    if (slugs.has(theme.slug)) problems.push(`theme "${theme.slug}": duplicate slug`)
    slugs.add(theme.slug)
    if (!theme.subhead || theme.subhead.trim() === '') {
      problems.push(`theme "${theme.slug}": subhead is empty`)
    }
    if (!schemaEnum.includes(theme.slug)) {
      problems.push(`theme "${theme.slug}": missing from the emotion enum in pose.schema.json`)
    }
  }

  for (const value of schemaEnum) {
    if (!slugs.has(value)) {
      problems.push(`emotion enum value "${value}" has no theme in theme-taxonomy.json`)
    }
  }

  for (const pose of poses) {
    for (const { emotion } of pose.emotional_release_potential ?? []) {
      if (!slugs.has(emotion)) {
        problems.push(`pose "${pose.slug}": emotion "${emotion}" is not in the theme taxonomy`)
      }
    }
  }

  return problems
}
