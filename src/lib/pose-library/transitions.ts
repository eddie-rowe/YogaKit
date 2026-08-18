/**
 * Algorithmic pose transition scoring.
 *
 * Computes which poses flow well before or after a given pose based on the
 * rich metadata in the pose library. This is intentionally external to the
 * JSON data — the data carries facts (muscle_groups, type_tags, meridians,
 * complexity), while this module carries the sequencing intelligence.
 *
 * See also the optional `before_poses`/`after_poses` editorial hints in each
 * pose file — those can be surfaced as a curated override if desired, but this
 * function does not consult them.
 */

import type { Pose, FiveElement, PoseTypeTag, SessionContext } from '@/lib/pipeline/types'
import { getAllPoses } from './index'

export interface TransitionCandidate {
  pose: Pose
  score: number
  reasons: string[]
}

// ─── Body-position flow arcs ─────────────────────────────────────────────────
// Yin classes commonly follow these arcs. Bonus points when candidates
// respect the arc relative to the target pose.

const POSITION_FLOW: Record<string, string[]> = {
  supine:   ['supine', 'seated', 'kneeling'],
  seated:   ['seated', 'kneeling', 'prone', 'supine'],
  kneeling: ['kneeling', 'prone', 'seated', 'standing'],
  prone:    ['prone', 'kneeling', 'supine'],
  standing: ['standing', 'kneeling', 'seated'],
  inverted: ['supine', 'seated'],
}

// ─── Type-tag complementarity ─────────────────────────────────────────────────
// Tags that pair well AFTER another tag (the key) — deepening or natural follow.
// Separate from counterposes (those live in the pose data).

const AFTER_AFFINITIES: Partial<Record<PoseTypeTag, PoseTypeTag[]>> = {
  'forward-fold':      ['backbend', 'forward-fold', 'restorative'],
  'backbend':          ['restorative', 'forward-fold', 'integration', 'twist'],
  'hip-opener':        ['hip-opener', 'outer-hip', 'restorative', 'forward-fold'],
  'outer-hip':         ['hip-opener', 'groin-opener', 'restorative', 'forward-fold'],
  'groin-opener':      ['hip-opener', 'outer-hip', 'restorative'],
  'hip-flexor-release':['backbend', 'hip-opener', 'forward-fold'],
  'twist':             ['restorative', 'integration', 'forward-fold'],
  'inversion':         ['restorative', 'integration'],
  'lateral-stretch':   ['restorative', 'lateral-stretch', 'twist'],
  'spinal-compression':['restorative', 'forward-fold', 'integration'],
  'spinal-traction':   ['restorative', 'integration', 'backbend'],
  'restorative':       ['restorative', 'integration'],
  'integration':       ['restorative', 'integration'],
}

const BEFORE_AFFINITIES: Partial<Record<PoseTypeTag, PoseTypeTag[]>> = {
  'backbend':           ['forward-fold', 'hip-flexor-release', 'restorative', 'integration'],
  'inversion':          ['forward-fold', 'restorative', 'hamstring-stretch', 'spinal-traction'],
  'hip-opener':         ['restorative', 'hip-opener', 'groin-opener', 'outer-hip'],
  'outer-hip':          ['restorative', 'hip-opener', 'groin-opener'],
  'groin-opener':       ['restorative', 'hip-opener', 'hip-flexor-release'],
  'quad-stretch':       ['hip-flexor-release', 'hip-opener', 'restorative'],
  'spinal-compression': ['restorative', 'forward-fold', 'integration'],
  'twist':              ['restorative', 'forward-fold', 'hip-opener'],
  'hamstring-stretch':  ['restorative', 'hip-opener', 'forward-fold'],
}

// ─── Complexity gradient rules ────────────────────────────────────────────────
// Ideal: candidates within ±2 complexity when preparing, or ≤+1 when following.

function complexityDelta(from: Pose, to: Pose, direction: 'before' | 'after'): number {
  const delta = to.complexity - from.complexity
  if (direction === 'before') {
    // Approaching pose should not be much harder than the target
    if (delta > 2) return -3
    if (delta >= 0) return 1  // slightly easier or same — good approach
    return 2                  // easier — good warm-up
  } else {
    // Following pose: slight step down preferred (cooldown arc)
    if (delta > 2) return -2  // big jump up — unexpected
    if (delta >= -1) return 2  // same or slightly easier — smooth
    if (delta >= -3) return 1  // cooling down — fine
    return 0                   // big drop — neutral
  }
}

// ─── Main scoring functions ───────────────────────────────────────────────────

function scoreCandidate(
  target: Pose,
  candidate: Pose,
  direction: 'before' | 'after',
  ctx?: Partial<SessionContext>
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // 1. Meridian overlap — shared meridian lines feel connected
  const meridianOverlap = (candidate.meridians ?? []).filter(m => (target.meridians ?? []).includes(m)).length
  if (meridianOverlap > 0) {
    score += meridianOverlap * 2
    reasons.push(`shared meridian${meridianOverlap > 1 ? 's' : ''}: ${(candidate.meridians ?? []).filter(m => (target.meridians ?? []).includes(m)).join(', ')}`)
  }

  // 2. Element continuity — same TCM element deepens thematic coherence
  if (candidate.element && candidate.element === target.element) {
    score += 2
    reasons.push(`same element (${candidate.element})`)
  } else if (ctx?.elementFocus && candidate.element === ctx.elementFocus) {
    score += 1
    reasons.push(`aligns with session element focus`)
  }

  // 3. Body position flow
  const flowTargets = POSITION_FLOW[target.body_position] ?? []
  const posIndex = flowTargets.indexOf(candidate.body_position)
  if (posIndex === 0) {
    score += 3
    reasons.push(`same body position (${candidate.body_position})`)
  } else if (posIndex === 1) {
    score += 2
    reasons.push(`natural position transition (${target.body_position} → ${candidate.body_position})`)
  } else if (posIndex === 2) {
    score += 1
  }

  // 4. Type tag complementarity
  const affinityMap = direction === 'after' ? AFTER_AFFINITIES : BEFORE_AFFINITIES
  let tagScore = 0
  const matchedAffinities: string[] = []
  for (const tag of target.type_tags ?? []) {
    const affinities = affinityMap[tag] ?? []
    const matched = (candidate.type_tags ?? []).filter(ct => affinities.includes(ct))
    tagScore += matched.length
    matchedAffinities.push(...matched)
  }
  if (tagScore > 0) {
    score += Math.min(tagScore * 2, 6)
    const unique = [...new Set(matchedAffinities)].slice(0, 2)
    reasons.push(`type complementarity: ${unique.join(', ')}`)
  }

  // 5. Muscle group overlap — continuity in the same fascial chain
  const muscleOverlap = (candidate.muscle_groups ?? []).filter(m => (target.muscle_groups ?? []).includes(m)).length
  if (muscleOverlap > 2) {
    score += 2
    reasons.push(`same fascial line (${muscleOverlap} shared muscle groups)`)
  } else if (muscleOverlap > 0) {
    score += 1
  }

  // 6. Complexity gradient
  const compScore = complexityDelta(target, candidate, direction)
  score += compScore

  // 7. Injury risk — penalise jumping from low-risk to high-risk without preparation
  if (direction === 'after' && (candidate.injury_risk ?? 0) - (target.injury_risk ?? 0) > 3) {
    score -= 2
    reasons.push(`injury risk jump flagged`)
  }

  // 7b. Nervous system arc — parasympathetic should follow sympathetic (not precede it)
  if (direction === 'after') {
    if (target.nervous_system_effect === 'sympathetic' && candidate.nervous_system_effect === 'parasympathetic') {
      score += 2
      reasons.push('NS arc: activation → rest')
    } else if (target.nervous_system_effect === 'parasympathetic' && candidate.nervous_system_effect === 'sympathetic') {
      score -= 1 // jarring to jump from deep rest to activation
    }
  }

  // 7c. Sequencing position arc — reward forward progression through the class arc
  const ARC_ORDER: Record<string, number> = { opening: 0, building: 1, peak: 2, cooldown: 3, integration: 4 }
  if (direction === 'after' && target.sequencing_position && candidate.sequencing_position) {
    const targetMax = Math.max(...target.sequencing_position.map(p => ARC_ORDER[p] ?? 0))
    const candidateMin = Math.min(...candidate.sequencing_position.map(p => ARC_ORDER[p] ?? 4))
    if (candidateMin >= targetMax) score += 1     // forward motion or same stage
    if (candidateMin > targetMax + 1) score -= 1  // big jump forward
  }

  // 8. Energetic quality continuity
  const eqOverlap = candidate.energetic_quality.filter(eq =>
    target.energetic_quality.includes(eq)
  ).length
  if (eqOverlap > 0) {
    score += eqOverlap
    reasons.push(`energetic quality match`)
  }

  return { score, reasons }
}

export function suggestBefore(
  target: Pose,
  options?: {
    excludeSlugs?: string[]
    ctx?: Partial<SessionContext>
    limit?: number
  }
): TransitionCandidate[] {
  const { excludeSlugs = [], ctx, limit = 5 } = options ?? {}
  const all = getAllPoses()
  const candidates = all.filter(
    p => p.slug !== target.slug && !excludeSlugs.includes(p.slug)
  )

  return candidates
    .map(pose => {
      const { score, reasons } = scoreCandidate(target, pose, 'before', ctx)
      return { pose, score, reasons }
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function suggestAfter(
  target: Pose,
  options?: {
    excludeSlugs?: string[]
    ctx?: Partial<SessionContext>
    limit?: number
  }
): TransitionCandidate[] {
  const { excludeSlugs = [], ctx, limit = 5 } = options ?? {}
  const all = getAllPoses()
  const candidates = all.filter(
    p => p.slug !== target.slug && !excludeSlugs.includes(p.slug)
  )

  return candidates
    .map(pose => {
      const { score, reasons } = scoreCandidate(target, pose, 'after', ctx)
      return { pose, score, reasons }
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Score a specific two-pose transition (used by constrain stage to rank paths).
 * Returns a score and human-readable reasons for why this pair flows well.
 */
export function scoreTransition(
  from: Pose,
  to: Pose,
  ctx?: Partial<SessionContext>
): { score: number; reasons: string[] } {
  return scoreCandidate(from, to, 'after', ctx)
}

/**
 * Given an ordered sequence, compute a transition score for each step.
 * Lower-scoring transitions are candidates for intervention by the constrain stage.
 */
export function scoreSequenceTransitions(
  poses: Pose[],
  ctx?: Partial<SessionContext>
): Array<{ from: Pose; to: Pose; score: number; reasons: string[] }> {
  const results = []
  for (let i = 0; i < poses.length - 1; i++) {
    const { score, reasons } = scoreTransition(poses[i], poses[i + 1], ctx)
    results.push({ from: poses[i], to: poses[i + 1], score, reasons })
  }
  return results
}
