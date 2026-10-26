export interface ActiveConstraints {
  search: string
  element: string
  position: string
  typeTags: string[]
  muscleGroups: string[]
  nervousSystem: string
  seqPosition: string
  complexityMax: number
  riskMax: number
}

/** Human-readable list of the constraints currently narrowing the catalog (FR-024).
 *  Used to say *which* combination produced an empty result instead of a bare "no match". */
export function describeConstraints(c: ActiveConstraints): string[] {
  const out: string[] = []
  if (c.search.trim()) out.push(`search “${c.search.trim()}”`)
  if (c.element) out.push(`element: ${c.element}`)
  if (c.position) out.push(`position: ${c.position}`)
  if (c.nervousSystem) out.push(`nervous system: ${c.nervousSystem}`)
  if (c.seqPosition) out.push(`sequencing: ${c.seqPosition}`)
  if (c.typeTags.length) out.push(`type: ${c.typeTags.join(' + ')}`)
  if (c.muscleGroups.length) out.push(`muscles: ${c.muscleGroups.join(' + ')}`)
  if (c.complexityMax < 10) out.push(`complexity up to ${c.complexityMax}`)
  if (c.riskMax < 10) out.push(`injury risk up to ${c.riskMax}`)
  return out
}
