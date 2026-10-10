/** Pure cross-check logic for the theme taxonomy (003 US5, T065, mechanises SC-010).
 *
 *  `data/schemas/theme-taxonomy.json` and the `emotion` enum on
 *  `data/schemas/pose.schema.json` are two separately-edited sources of truth for the
 *  same 13-slug closed set (FR-029). Ajv already rejects a pose file carrying an emotion
 *  outside the enum, but nothing stops the two files drifting apart from each other —
 *  a slug added to one and not the other would pass Ajv while silently breaking the
 *  theme browser (an enum value with no taxonomy entry renders as an empty section
 *  title) or leaving a taxonomy entry that can never be reached. This module is the seam
 *  a test can hold to account for that; see tests/unit/pose-library/theme-taxonomy.test.ts.
 */

/**
 * @param {Array<{slug?: unknown, label?: unknown, subhead?: unknown, tcm_organs?: unknown}>} taxonomy
 * @param {string[]} emotionEnum
 * @returns {string[]} human-readable error strings; empty means valid
 */
export function validateThemeTaxonomy(taxonomy, emotionEnum) {
  const errors = []

  if (!Array.isArray(taxonomy)) {
    return ['theme-taxonomy.json must be an array']
  }

  const seenSlugs = new Set()
  for (const [i, entry] of taxonomy.entries()) {
    if (typeof entry.slug !== 'string' || entry.slug.length === 0) {
      errors.push(`theme-taxonomy.json[${i}]: missing or empty "slug"`)
      continue
    }
    if (seenSlugs.has(entry.slug)) {
      errors.push(`theme-taxonomy.json: duplicate slug "${entry.slug}"`)
    }
    seenSlugs.add(entry.slug)

    if (typeof entry.label !== 'string' || entry.label.length === 0) {
      errors.push(`theme-taxonomy.json["${entry.slug}"]: missing or empty "label"`)
    }
    if (typeof entry.subhead !== 'string' || entry.subhead.length === 0) {
      errors.push(`theme-taxonomy.json["${entry.slug}"]: missing or empty "subhead" (SC-010)`)
    }
    if (!Array.isArray(entry.tcm_organs) || entry.tcm_organs.length === 0) {
      errors.push(`theme-taxonomy.json["${entry.slug}"]: "tcm_organs" must be a non-empty array`)
    }
  }

  const enumSet = new Set(emotionEnum)
  for (const slug of seenSlugs) {
    if (!enumSet.has(slug)) {
      errors.push(`theme-taxonomy.json has slug "${slug}" absent from pose.schema.json's emotion enum`)
    }
  }
  for (const slug of enumSet) {
    if (!seenSlugs.has(slug)) {
      errors.push(`pose.schema.json's emotion enum has "${slug}" with no theme-taxonomy.json entry`)
    }
  }

  return errors
}

/**
 * Every `emotional_release_potential[].emotion` across the corpus must resolve to a
 * taxonomy entry. Ajv's enum check already guarantees this when the enum and the
 * taxonomy file agree (validateThemeTaxonomy above proves that); this walks the actual
 * pose data as a second, independent witness rather than trusting the two checks not to
 * develop a shared blind spot.
 *
 * @param {Array<{slug: string, emotional_release_potential?: Array<{emotion: string}>}>} poses
 * @param {Set<string>} taxonomySlugs
 * @returns {string[]}
 */
export function findUnresolvedEmotions(poses, taxonomySlugs) {
  const errors = []
  for (const pose of poses) {
    for (const entry of pose.emotional_release_potential ?? []) {
      if (!taxonomySlugs.has(entry.emotion)) {
        errors.push(`${pose.slug}: emotion "${entry.emotion}" does not resolve to a theme-taxonomy.json entry`)
      }
    }
  }
  return errors
}
