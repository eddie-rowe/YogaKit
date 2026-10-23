// Trigger/priority selection for guidance cards.
//
// specs/005-daily-sadhana FR-037..FR-039. Several triggers can fire at once; at most one card
// is returned, by authored priority (lower number wins), ties broken by id so the result never
// depends on input order. A consumed trigger is never re-selected. Pure: fired and consumed
// triggers are passed in as data; no clock, storage, network or copy. Nothing here counts missed
// days or emits countdown data, and no corpus-browsing API is exported (FR-043).

export interface GuidanceEntry {
  id: string
  trigger: string
  priority: number
}

/** The single card to show, or null when nothing eligible fired. */
export function selectGuidance<T extends GuidanceEntry>(
  entries: readonly T[],
  fired: readonly string[],
  consumed: readonly string[],
): T | null {
  let best: T | null = null
  for (const e of entries) {
    if (!fired.includes(e.trigger) || consumed.includes(e.trigger)) continue
    if (best === null || e.priority < best.priority || (e.priority === best.priority && e.id < best.id)) best = e
  }
  return best
}
