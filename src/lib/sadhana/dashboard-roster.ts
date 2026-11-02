// Cohort dashboard roster filter (T056, FR-058/FR-055/FR-060/FR-061).
//
// A student who stopped sharing, or whose enrollment has ended, is omitted entirely: the output
// carries no "stopped sharing", "absent" or "inactive" marker, so absence is never itself a
// status. The input type holds practice *signals* only (name, check-in dates, milestone
// progress); reflections, intentions and notes are structurally unreachable (FR-055).
// This is a presentation-layer filter. RLS remains the authority (Principle VIII).
// Pure: no clock, storage or network.

export interface RosterEnrollment {
  studentName: string
  shareSignals: boolean
  /** Local day the enrollment ended, or null while it is active. */
  endedAt: string | null
  checkinDates: readonly string[]
  milestoneProgress: number
}

export interface RosterRow {
  studentName: string
  checkinDates: readonly string[]
  milestoneProgress: number
}

/** Rows for enrollments that are active and sharing signals; everyone else is simply absent. */
export function visibleRoster(enrollments: readonly RosterEnrollment[]): RosterRow[] {
  return enrollments
    .filter((e) => e.shareSignals && e.endedAt === null)
    .map(({ studentName, checkinDates, milestoneProgress }) => ({ studentName, checkinDates, milestoneProgress }))
}
