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

export interface ReturnCardInput<T extends IntentionRevision> {
  revisions: readonly T[]
  /** `YYYY-MM-DD` the current lapse began. Also the lapse's identity. */
  lapseStart: string
  /** Days lapsed so far, computed by the caller. */
  lapseDays: number
  /** The person's current lapse threshold, in days. */
  threshold: number
  /** Lapse-start dates already answered (keep / update / rest). */
  answeredLapses: readonly string[]
}

export interface ReturnCardDecision<T extends IntentionRevision> {
  due: boolean
  intention: T | null
}

/**
 * Whether a return card is due (FR-031, FR-034, FR-035). Data only, no copy.
 *
 * No intention active at the lapse start: not due, and nothing is substituted. An answered
 * lapse, including a "rest" answer, is keyed by its start date, so changing the threshold
 * in either direction mid-lapse cannot re-offer it; a new lapse is a new key.
 */
export function returnCardDue<T extends IntentionRevision>(
  input: ReturnCardInput<T>,
): ReturnCardDecision<T> {
  const intention = activeIntentionAtLapseStart(input.revisions, input.lapseStart)
  const answered = input.answeredLapses.includes(input.lapseStart)
  const due = intention !== null && !answered && input.lapseDays >= input.threshold
  return { due, intention: due ? intention : null }
}
