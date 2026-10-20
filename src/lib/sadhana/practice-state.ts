// The per-day practice state (FR-011, FR-012, FR-014).
//
// Exactly three states. Only practised and rested days earn a calendar chip; a silently
// absent day is the default and renders nothing and produces no notice. A day holding both
// kinds resolves to practised and is counted once. Day bucketing is the caller's job via
// `resolveLocalDay()`; this module only reads the `localDate` already on each check-in.
// Pure: no storage, network, copy or UI.

import type { Checkin } from './streak'

export type PracticeState = 'practised' | 'rested' | 'silently-absent'
export type ChipState = Exclude<PracticeState, 'silently-absent'>

/** The state of `localDate` given the recorded check-ins. */
export function practiceStateOn(checkins: readonly Checkin[], localDate: string): PracticeState {
  let rested = false
  for (const c of checkins) {
    if (c.localDate !== localDate) continue
    if (c.kind === 'practice') return 'practised'
    rested = true
  }
  return rested ? 'rested' : 'silently-absent'
}

/** The chip a state renders, or null — silently-absent yields no chip and no notice. */
export function chipFor(state: PracticeState): ChipState | null {
  return state === 'silently-absent' ? null : state
}

/** Chip-bearing days only; gap days are simply not in the map. */
export function practiceStates(checkins: readonly Checkin[]): Map<string, ChipState> {
  const states = new Map<string, ChipState>()
  for (const c of checkins) {
    if (c.kind === 'practice') states.set(c.localDate, 'practised')
    else if (!states.has(c.localDate)) states.set(c.localDate, 'rested')
  }
  return states
}
