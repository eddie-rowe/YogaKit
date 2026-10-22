// Which local day a check-in lands on, and whether "log for yesterday" is offered
// (FR-006/007/008, research.md decision #1).
//
// The only dates a caller can ever request are today and — inside a short window after
// local midnight, and only while nothing newer exists — yesterday. There is no date
// parameter on either function, so free-form backdating cannot be expressed (FR-007).
// Pure: no storage, network, copy or UI.

import { resolveLocalDay } from './local-day'
import type { Checkin } from './streak'

/** How long after local midnight "log for yesterday" stays offered. Tuning is data. */
export const YESTERDAY_WINDOW_HOURS = 6

export type CheckinTarget = 'today' | 'yesterday'

export interface CheckinResolution {
  localDate: string
  /** `update` when a check-in already exists on `localDate`; never a second row (FR-008). */
  action: 'create' | 'update'
}

const DAY_MS = 86_400_000

function previousDay(localDate: string): string {
  return new Date(Date.parse(`${localDate}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10)
}

/** Hours elapsed since local midnight at `now` in `timeZone`; correct on DST days. */
function hoursIntoLocalDay(now: Date, timeZone?: string): number {
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  return part('hour') + part('minute') / 60
}

/** Whether the single "log for yesterday" affordance is visible right now. */
export function canLogYesterday(
  now: Date,
  existing: readonly Checkin[],
  timeZone?: string,
): boolean {
  if (hoursIntoLocalDay(now, timeZone) >= YESTERDAY_WINDOW_HOURS) return false
  const yesterday = previousDay(resolveLocalDay(now, timeZone))
  return !existing.some((c) => c.localDate > yesterday)
}

/**
 * The day a check-in lands on and whether it creates or updates. `target: 'yesterday'`
 * is honoured only while `canLogYesterday` holds; otherwise it falls back to today.
 */
export function resolveCheckinDay(
  now: Date,
  existing: readonly Checkin[],
  target: CheckinTarget = 'today',
  timeZone?: string,
): CheckinResolution {
  const today = resolveLocalDay(now, timeZone)
  const localDate =
    target === 'yesterday' && canLogYesterday(now, existing, timeZone) ? previousDay(today) : today
  const action = existing.some((c) => c.localDate === localDate) ? 'update' : 'create'
  return { localDate, action }
}
