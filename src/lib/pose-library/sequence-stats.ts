import type { Pose, MuscleGroup, ChakraName } from '@/lib/pose-types'
import { CHAKRA_DOTS, MERIDIAN_PATH_MAP, ELEMENT_COLORS } from '@/lib/pose-library/body-map'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeightedPose {
  pose: Pose | null
  /** Effective hold minutes — caller should double for bilateral poses already */
  minutes: number
}

export interface DistributionSlice {
  key: string
  label: string
  minutes: number
  pct: number
  color: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Effective minutes for a pose, doubling for bilateral holds. */
export function effectiveMinutes(
  holdMinutes: number,
  pose: Pose | null,
  side?: string,
): number {
  const isBilateral = side === 'both' || (pose?.bilateral === true && !side)
  return holdMinutes * (isBilateral ? 2 : 1)
}

function toTitleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Categorical palette for muscle groups (earth-toned)
const MUSCLE_PALETTE = [
  '#a16207', '#0f766e', '#6d28d9', '#b45309', '#0369a1',
  '#065f46', '#7c2d12', '#1e3a5f', '#4c1d95', '#713f12',
]

function chakraColor(name: ChakraName): string {
  return CHAKRA_DOTS.find(d => d.name === name)?.color ?? '#78716c'
}

function chakraLabel(name: ChakraName): string {
  return CHAKRA_DOTS.find(d => d.name === name)?.english ?? toTitleCase(name)
}

function meridianColor(name: string): string {
  const path = MERIDIAN_PATH_MAP[name]?.[0]
  if (path?.element) return ELEMENT_COLORS[path.element]
  // Fallback palette for unlisted meridians
  const idx = Object.keys(MERIDIAN_PATH_MAP).indexOf(name) % MUSCLE_PALETTE.length
  return MUSCLE_PALETTE[Math.max(0, idx)]
}

// ─── Core computation ─────────────────────────────────────────────────────────

type PoseField = 'chakras' | 'meridians' | 'muscle_groups'

interface DistributionOpts {
  labelFor: (key: string) => string
  colorFor: (key: string, index: number) => string
  topN?: number
}

/**
 * Sums effective minutes per distinct value of a pose array-field across all
 * weighted poses. A pose with N values contributes its full minutes to each.
 * Returns slices sorted descending by minutes, with percentages out of the
 * total summed category-minutes.
 */
export function computeDistribution(
  poses: WeightedPose[],
  field: PoseField,
  opts: DistributionOpts,
): DistributionSlice[] {
  const totals = new Map<string, number>()

  for (const { pose, minutes } of poses) {
    if (!pose || minutes <= 0) continue
    const values: string[] = (pose[field] as string[] | undefined) ?? []
    for (const v of values) {
      totals.set(v, (totals.get(v) ?? 0) + minutes)
    }
  }

  if (totals.size === 0) return []

  const grandTotal = Array.from(totals.values()).reduce((s, m) => s + m, 0)

  const sorted = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])

  const { topN } = opts
  const shown = topN ? sorted.slice(0, topN) : sorted
  const rest  = topN ? sorted.slice(topN) : []

  const slices: DistributionSlice[] = shown.map(([key, minutes], i) => ({
    key,
    label: opts.labelFor(key),
    minutes,
    pct: Math.round((minutes / grandTotal) * 100),
    color: opts.colorFor(key, i),
  }))

  if (rest.length > 0) {
    const otherMinutes = rest.reduce((s, [, m]) => s + m, 0)
    slices.push({
      key: '__other__',
      label: `Other (${rest.length})`,
      minutes: otherMinutes,
      pct: Math.round((otherMinutes / grandTotal) * 100),
      color: '#a8a29e',
    })
  }

  return slices
}

// ─── Pre-configured distributions ────────────────────────────────────────────

export function chakraDistribution(poses: WeightedPose[]): DistributionSlice[] {
  return computeDistribution(poses, 'chakras', {
    labelFor: k => chakraLabel(k as ChakraName),
    colorFor: k => chakraColor(k as ChakraName),
  })
}

export function meridianDistribution(poses: WeightedPose[]): DistributionSlice[] {
  return computeDistribution(poses, 'meridians', {
    labelFor: toTitleCase,
    colorFor: k => meridianColor(k),
  })
}

export function muscleDistribution(poses: WeightedPose[], topN = 8): DistributionSlice[] {
  return computeDistribution(poses, 'muscle_groups', {
    labelFor: (k: string) => toTitleCase(k as MuscleGroup),
    colorFor: (_, i) => MUSCLE_PALETTE[i % MUSCLE_PALETTE.length],
    topN,
  })
}
