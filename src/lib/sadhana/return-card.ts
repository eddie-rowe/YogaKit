// Version-matched intention lookup for the return card.
//
// specs/005-daily-sadhana FR-026/027. The card quotes the intention that was active when the
// lapse began, not the newest revision. Same-day rule: a revision made on the lapse-start day
// counts as active at that start; among several that day, the latest createdAt wins. `createdAt`
// is an ISO timestamp or a `YYYY-MM-DD` local date; only its date part is compared with the
// lapse day. Pure: dates are passed in, no clock, storage, network or copy.

export interface IntentionRevision {
  createdAt: string
}

/** The revision active on `lapseStart` (`YYYY-MM-DD`), or null when none existed yet. */
export function activeIntentionAtLapseStart<T extends IntentionRevision>(
  revisions: readonly T[],
  lapseStart: string,
): T | null {
  let active: T | null = null
  for (const r of revisions) {
    if (r.createdAt.slice(0, 10) > lapseStart) continue
    if (active === null || r.createdAt > active.createdAt) active = r
  }
  return active
}
