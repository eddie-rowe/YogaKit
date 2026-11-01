// Derived "practiced today" signal for the cohort dashboard (T054, FR-059, Decision #2).
//
// The input is a list of local-day strings and nothing else — no reflection, intention,
// mood or note field is reachable from the parameter type, so the signal is derived from
// a check-in *existing*, never from anything a check-in contains. A rest day or a missing
// check-in is simply `false`: it implies no status, lapse or warning (FR-054, FR-058).
// Callers pass the dates of the check-ins that count as practice; rest days they omit
// produce the same neutral `false` as no check-in at all.
// Pure: no clock, storage, network or copy. `today` is passed in, never read.

/** A local day as `YYYY-MM-DD` — the only thing this module is allowed to see. */
export type CheckinDate = string

/** True iff a check-in exists for the local day `today`. */
export function practicedToday(checkinDates: readonly CheckinDate[], today: CheckinDate): boolean {
  return checkinDates.includes(today)
}
