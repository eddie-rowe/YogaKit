// Friction engine — pure function over Tier-1 pose geometry. No I/O, no async.
// Contract: specs/001-krama-mvp-spec/contracts/friction-engine.md
// Governs constitution RULE-H4 (weights live in one exported constant) and RULE-E3
// (reasons derived only from measured deltas).

import type { Pose, CogHeight } from '@/lib/pose-types'

export type FrictionTier = 1 | 2 | 3

export interface FrictionResult {
  score: number
  tier: FrictionTier
  reasons: string[]
}

export type FrictionMatrix = Record<string, Record<string, FrictionResult>>

export const WEIGHTS = {
  contact: 0.35,
  orientation: 0.25,
  cog: 0.2,
  spine: 0.1,
  plane: 0.1,
} as const

const COG_SCALE: CogHeight[] = ['floor', 'low', 'mid', 'high']

function contactDelta(from: Pose, to: Pose): number {
  const a = new Set(from.base_of_support ?? [])
  const b = new Set(to.base_of_support ?? [])
  const union = new Set([...a, ...b])
  if (union.size === 0) return 0
  const intersection = [...a].filter(x => b.has(x))
  return 1 - intersection.length / union.size
}

function orientationDelta(from: Pose, to: Pose): number {
  if (!from.orientation || !to.orientation) return 0
  if (from.orientation !== to.orientation) return 1
  if (from.level && to.level && from.level !== to.level) return 0.5
  return 0
}

function cogDelta(from: Pose, to: Pose): number {
  const a = from.cog_height ? COG_SCALE.indexOf(from.cog_height) : -1
  const b = to.cog_height ? COG_SCALE.indexOf(to.cog_height) : -1
  if (a === -1 || b === -1) return 0
  return Math.abs(a - b) / (COG_SCALE.length - 1)
}

function spineDelta(from: Pose, to: Pose): number {
  if (!from.spinal_action || !to.spinal_action) return 0
  return from.spinal_action !== to.spinal_action ? 1 : 0
}

function planeDelta(from: Pose, to: Pose): number {
  if (!from.plane || !to.plane) return 0
  if (from.plane === to.plane) return 0
  if (from.plane === 'multi' || to.plane === 'multi') return 0.5
  return 1
}

export function tierFor(score: number): FrictionTier {
  if (score < 0.34) return 1
  if (score < 0.67) return 2
  return 3
}

export function friction(fromPose: Pose, toPose: Pose): FrictionResult {
  const cContact = contactDelta(fromPose, toPose)
  const cOrientation = orientationDelta(fromPose, toPose)
  const cCog = cogDelta(fromPose, toPose)
  const cSpine = spineDelta(fromPose, toPose)
  const cPlane = planeDelta(fromPose, toPose)

  const score =
    WEIGHTS.contact * cContact +
    WEIGHTS.orientation * cOrientation +
    WEIGHTS.cog * cCog +
    WEIGHTS.spine * cSpine +
    WEIGHTS.plane * cPlane

  const weighted: Array<{ weight: number; reason: string }> = []

  if (cContact > 0) {
    const a = new Set(fromPose.base_of_support ?? [])
    const b = new Set(toPose.base_of_support ?? [])
    const shared = [...a].filter(x => b.has(x))
    weighted.push({
      weight: WEIGHTS.contact * cContact,
      reason:
        shared.length > 0
          ? `${shared.join(' and ')} stay planted`
          : `${fromPose.english} and ${toPose.english} share no contact points`,
    })
  }

  if (cOrientation > 0) {
    weighted.push({
      weight: WEIGHTS.orientation * cOrientation,
      reason:
        fromPose.orientation !== toPose.orientation
          ? `flips from ${fromPose.orientation} to ${toPose.orientation}`
          : `shifts kinesphere level from ${fromPose.level} to ${toPose.level}`,
    })
  }

  if (cCog > 0) {
    weighted.push({
      weight: WEIGHTS.cog * cCog,
      reason: `center of gravity moves from ${fromPose.cog_height} to ${toPose.cog_height}`,
    })
  }

  if (cSpine > 0) {
    weighted.push({
      weight: WEIGHTS.spine * cSpine,
      reason: `spine shifts from ${fromPose.spinal_action} to ${toPose.spinal_action}`,
    })
  }

  if (cPlane > 0) {
    weighted.push({
      weight: WEIGHTS.plane * cPlane,
      reason: `changes plane from ${fromPose.plane} to ${toPose.plane}`,
    })
  }

  // Sort by weighted contribution (descending, stable) so the most tier-driving
  // delta surfaces first — the UI shows reasons[0] as the seam's headline reason,
  // and a low-weight contact match ("feet stay planted") shouldn't outrank a
  // bigger driver like an orientation flip just because it was computed first.
  weighted.sort((x, y) => y.weight - x.weight)
  const reasons = weighted.map(w => w.reason)

  return { score, tier: tierFor(score), reasons }
}

export function buildFrictionMatrix(poses: Pose[]): FrictionMatrix {
  const matrix: FrictionMatrix = {}
  for (const from of poses) {
    matrix[from.slug] = {}
    for (const to of poses) {
      matrix[from.slug][to.slug] = friction(from, to)
    }
  }
  return matrix
}
