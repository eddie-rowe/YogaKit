import type { DefaultMeasure } from '@/lib/pose-types'
import type { FlowItem } from './types'

// One breath ≈ 5 seconds at a teaching pace. Rough, display-only — never used for
// anything the friction engine or validator reasons about.
export const SECONDS_PER_BREATH = 5

export function measureToSeconds(measure: DefaultMeasure): number {
  if (typeof measure.seconds === 'number') return measure.seconds
  if (typeof measure.breaths === 'number') return measure.breaths * SECONDS_PER_BREATH
  return 0
}

export function totalSeconds(items: FlowItem[]): number {
  return items.reduce((sum, item) => sum + measureToSeconds(item.measure), 0)
}

export function formatMeasure(measure: DefaultMeasure): string {
  if (measure.breaths != null) return `${measure.breaths} breath${measure.breaths === 1 ? '' : 's'}`
  return `${measure.seconds}s`
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return `${Math.round(seconds)} sec`
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

/** A duration split into the number the eye lands on and the unit beside it.
 *  Half-minute resolution, because rounding a 90-second hold to "2 min" loses the
 *  half a teacher deliberately wrote (`001` FR-017, specs/001-krama-mvp-spec/spec.md:343).
 *  `formatDuration` above keeps its whole-minute rounding — it is on five other
 *  surfaces and none of them are the mat.
 *
 *  Structured rather than a string so the read view can render the count large and
 *  the unit small inside one element (FR-001). Exported from here, not from the read
 *  view, so the composer's phase headers (FR-049) show the same number for the same
 *  phase rather than a second, disagreeing one. */
export function approxDuration(seconds: number): { count: string; unit: string } {
  if (seconds < 60) return { count: `${Math.round(seconds)}`, unit: 's' }
  const minutes = seconds / 60
  if (minutes < 60) return { count: `${Math.round(minutes * 2) / 2}`, unit: 'min' }
  return { count: `${Math.round((minutes / 60) * 2) / 2}`, unit: 'hr' }
}

/** The same number as one string, for surfaces that don't split it.
 *  Always approximate: a phase measured in breaths is converted at
 *  `SECONDS_PER_BREATH`, which is a teaching pace, not a clock. */
export function formatApproxDuration(seconds: number): string {
  const { count, unit } = approxDuration(seconds)
  return `~${count} ${unit}`
}
