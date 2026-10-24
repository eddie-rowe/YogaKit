// Pure view helpers for 004 US5. They only READ the friction tier the engine already
// produced — no weights, no engine code (constitution Principle III).
import type { FrictionTier } from '@/lib/friction'

export interface SeamGeometry {
  lineWidthPx: number
  lineLengthPct: number
  rowGapRem: number
}

const GEOMETRY: Record<FrictionTier, SeamGeometry> = {
  1: { lineWidthPx: 1, lineLengthPct: 30, rowGapRem: 0.25 },
  2: { lineWidthPx: 2, lineLengthPct: 60, rowGapRem: 0.25 },
  3: { lineWidthPx: 3, lineLengthPct: 100, rowGapRem: 1 },
}

/** Tier → seam line geometry: length and width both progress with tier, and only the
 *  top tier widens the surrounding row gap (US5 s4, s5). */
export function seamGeometry(tier: FrictionTier): SeamGeometry {
  return GEOMETRY[tier]
}

export interface InsertionSlot {
  overId: string
  side: 'before' | 'after'
}

/** Where a dragged row will land: below the row under the pointer when moving down,
 *  above it when moving up (US5 s1). */
export function insertionSlot(
  activeId: string | null,
  overId: string | null,
  ids: string[],
): InsertionSlot | null {
  if (!activeId || !overId || activeId === overId) return null
  const from = ids.indexOf(activeId)
  const to = ids.indexOf(overId)
  if (from < 0 || to < 0) return null
  return { overId, side: from < to ? 'after' : 'before' }
}
