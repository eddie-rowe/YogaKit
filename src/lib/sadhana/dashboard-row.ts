// Per-student dashboard row view-model (T052 lib half, FR-053/FR-055).
//
// Input is a RosterRow from visibleRoster(): practice signals only, so reflections, intentions
// and notes are structurally unreachable. Output is exactly the four FR-053 fields.
// `daysSinceLastCheckin` is null with no check-ins, never a number implying lapse. The streak
// reuses computeStreak (distinct practised days), so it only ever grows (Principle VII).
// Pure: `today` is a parameter; no clock, storage or network.

import type { RosterRow } from './dashboard-roster'
import { computeStreak } from './streak'

export interface DashboardRow {
  studentName: string
  daysSinceLastCheckin: number | null
  streak: number
  milestoneProgress: number
}

const DAY_MS = 86_400_000

function dayNumber(localDate: string): number {
  return Math.floor(Date.parse(`${localDate}T00:00:00Z`) / DAY_MS)
}

export function toDashboardRow(row: RosterRow, today: string): DashboardRow {
  let latest: string | null = null
  for (const d of row.checkinDates) if (latest === null || d > latest) latest = d
  return {
    studentName: row.studentName,
    daysSinceLastCheckin: latest === null ? null : dayNumber(today) - dayNumber(latest),
    streak: computeStreak(row.checkinDates.map((localDate) => ({ localDate, kind: 'practice' as const }))),
    milestoneProgress: row.milestoneProgress,
  }
}
