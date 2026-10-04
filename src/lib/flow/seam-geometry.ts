// Seam tier → line geometry (004 US5 s4/s5/s6). Pure and presentational: it only
// READS the friction tier the engine already produced — no weights, no scoring here.

import type { FrictionTier } from '@/lib/friction'

export interface SeamGeometry {
  /** Share of the row width the seam line spans — length rises with tier. */
  lengthPct: number
  /** Stroke weight in px — width rises with tier, so tier never rests on height alone. */
  weightPx: number
  /** Extra vertical space (rem) around the seam; only the top tier opens the row gap. */
  rowGapRem: number
}

const GEOMETRY: Record<FrictionTier, SeamGeometry> = {
  1: { lengthPct: 40, weightPx: 1, rowGapRem: 0 },
  2: { lengthPct: 70, weightPx: 2, rowGapRem: 0 },
  3: { lengthPct: 100, weightPx: 3, rowGapRem: 0.5 },
}

export function seamGeometry(tier: FrictionTier): SeamGeometry {
  return GEOMETRY[tier]
}

/** Where the insertion gap opens while dragging: before the hovered row when moving
 *  up, after it when moving down. Null when there is no drag or no target. */
export function insertionGapIndex(
  activeIndex: number,
  overIndex: number
): number | null {
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return null
  return overIndex > activeIndex ? overIndex + 1 : overIndex
}
