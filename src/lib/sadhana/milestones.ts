// Which milestone card to show next (FR-021, FR-023).
//
// The thresholds are data: one exported constant, not literals scattered through callers.
// Each milestone is surfaced once; acknowledged ones never return. When a streak jumps past
// two thresholds together, the lower is returned first and the other stays queued until the
// first is acknowledged, so neither is lost. Card copy and UI live elsewhere (FR-022).
// Pure: no storage, network, copy or UI.

export const MILESTONE_THRESHOLDS = [10, 30, 90] as const

export type Milestone = (typeof MILESTONE_THRESHOLDS)[number]

/** The lowest reached, unacknowledged milestone, or null when there is none to show. */
export function nextMilestone(
  streak: number,
  acknowledged: readonly number[],
): Milestone | null {
  const seen = new Set(acknowledged)
  for (const m of MILESTONE_THRESHOLDS) {
    if (streak >= m && !seen.has(m)) return m
  }
  return null
}
