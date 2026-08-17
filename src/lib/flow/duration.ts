import type { DefaultMeasure } from '@/lib/pipeline/types'
import type { FlowItem } from './types'

// One breath ≈ 5 seconds at a teaching pace. Rough, display-only — never used for
// anything the friction engine or validator reasons about.
const SECONDS_PER_BREATH = 5

export function measureToSeconds(measure: DefaultMeasure): number {
  if (typeof measure.seconds === 'number') return measure.seconds
  if (typeof measure.breaths === 'number') return measure.breaths * SECONDS_PER_BREATH
  return 0
}

export function totalSeconds(items: FlowItem[]): number {
  return items.reduce((sum, item) => sum + measureToSeconds(item.measure), 0)
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return `${Math.round(seconds)} sec`
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}
