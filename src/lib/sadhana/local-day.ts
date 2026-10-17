// The local calendar day a check-in belongs to (FR-005, decision #1).
//
// Computed from the instant and zone passed in, and — when no zone is given — from the
// browser's zone read at call time. Callers pass `new Date()` at submission, never the
// time the sheet was opened, so a page opened before midnight and submitted after lands
// on the later day. Pure: no storage, no network, no telemetry.

/** `YYYY-MM-DD` for `now` in `timeZone`, or in the runtime's current zone. */
export function resolveLocalDay(now: Date, timeZone?: string): string {
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  // formatToParts, not toLocaleDateString: field order is a locale's business, and
  // reading named parts leaves nothing to parse. getTimezoneOffset() is not used — it
  // is the offset now, which is wrong on a DST transition day.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find((p) => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
