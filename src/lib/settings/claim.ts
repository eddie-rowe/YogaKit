/** Pure itemization for the claim prompt (006 US3, FR-022): every flow is listed by
 *  name alongside the count — never truncated to a count alone. No storage, network,
 *  or DB access. */
export interface ClaimItemization {
  names: string[]
  count: number
}

export function itemize(localFlows: ReadonlyArray<{ title: string }>): ClaimItemization {
  const names = localFlows.map((f) => f.title)
  return { names, count: names.length }
}
