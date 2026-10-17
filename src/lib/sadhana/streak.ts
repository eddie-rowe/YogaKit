// The streak, and the grace allowance shown beside it.
//
// specs/005-daily-sadhana/research.md §3. The streak is the count of distinct practised
// days, which is the one definition that cannot decrease under any appended history and
// cannot return to zero once a first practice exists (FR-015, SC-004, Principle VII).
// Rest never adds and is never a miss; a silently absent day does nothing, so no gap
// resets anything and there is nothing to repair (FR-024).
//
// The grace budget is reported, not subtracted. It is read from data (FR-019) and feeds
// only the on-request streak detail (FR-018). Pure: no storage, network, copy or UI.

export interface Checkin {
  /** `YYYY-MM-DD`, from `resolveLocalDay()`. */
  localDate: string
  kind: 'practice' | 'rest'
}

export interface GraceBudget {
  size: number
  periodDays: number
}

export interface GraceStatus {
  used: number
  remaining: number
}

const DAY_MS = 86_400_000

function dayNumber(localDate: string): number {
  return Math.floor(Date.parse(`${localDate}T00:00:00Z`) / DAY_MS)
}

/** Distinct practised days. A day holding both kinds counts once, as practice (FR-014). */
export function computeStreak(checkins: readonly Checkin[]): number {
  const practised = new Set<string>()
  for (const c of checkins) if (c.kind === 'practice') practised.add(c.localDate)
  return practised.size
}

/** Silently absent days in the trailing `periodDays` ending `today`, counted from the first
 *  practice. Rest days are not absent. Exhaustion is a plain number, not a consequence
 *  (FR-020): `remaining` bottoms out at 0. */
export function graceStatus(
  checkins: readonly Checkin[],
  budget: GraceBudget,
  today: string,
): GraceStatus {
  let first = Infinity
  const recorded = new Set<number>()
  for (const c of checkins) {
    const n = dayNumber(c.localDate)
    recorded.add(n)
    if (c.kind === 'practice' && n < first) first = n
  }
  const end = dayNumber(today)
  const start = Math.max(end - budget.periodDays + 1, first)
  let used = 0
  for (let d = start; d <= end; d++) if (!recorded.has(d)) used++
  return { used, remaining: Math.max(0, budget.size - used) }
}

/** Validates the shape of `data/sadhana/grace-budget.json`. */
export function parseGraceBudget(raw: unknown): GraceBudget {
  const r = raw as Partial<GraceBudget> | null
  if (
    typeof r !== 'object' ||
    r === null ||
    !Number.isInteger(r.size) ||
    (r.size as number) < 0 ||
    !Number.isInteger(r.periodDays) ||
    (r.periodDays as number) < 1
  ) {
    throw new Error('grace-budget.json: size must be an integer >= 0 and periodDays an integer >= 1')
  }
  return { size: r.size as number, periodDays: r.periodDays as number }
}
