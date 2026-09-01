import fs from 'node:fs'
import path from 'node:path'

import type { Pose, BodyPosition, EnergeticQ, FiveElement, PoseDifficulty, ModeType } from '@/lib/pose-types'

// Reads data/poses/*.json from disk with fs, at whatever time this module is first
// evaluated. This is server-only, and the comment that used to sit here claimed the
// opposite — "bundled at compile time, never fetched at runtime (RULE-L3)" — directly
// above a runtime readdirSync of process.cwd(). RULE-L3 is satisfied for the *reader*
// by the pose pages being SSG (generateStaticParams over all 67 slugs) and by the
// service worker caching them, not by this function. Anything that would make a pose
// route dynamic re-runs this per request.
function loadPoseLibrary(): Pose[] {
  const posesDir = path.join(process.cwd(), 'data', 'poses')

  if (!fs.existsSync(posesDir)) {
    return []
  }

  const files = fs.readdirSync(posesDir).filter((f: string) => f.endsWith('.json'))
  return files.map((file: string) => {
    const content = fs.readFileSync(path.join(posesDir, file), 'utf-8')
    return JSON.parse(content) as Pose
  })
}

let _poseCache: Pose[] | null = null

export function getAllPoses(): Pose[] {
  if (!_poseCache) {
    _poseCache = loadPoseLibrary()
  }
  return _poseCache
}

export function getPoseBySlug(slug: string): Pose | undefined {
  return getAllPoses().find(p => p.slug === slug)
}

export interface PoseFilter {
  bodyPositions?: BodyPosition[]
  meridians?: string[]
  energeticQualities?: EnergeticQ[]
  elements?: FiveElement[]
  maxDifficulty?: PoseDifficulty
  excludeContraindications?: string[]
  modeType?: ModeType
  bilateral?: boolean
}

const DIFFICULTY_ORDER: Record<PoseDifficulty, number> = {
  accessible: 0,
  intermediate: 1,
  advanced: 2,
}

export function filterPoses(filter: PoseFilter): Pose[] {
  return getAllPoses().filter(pose => {
    // Exclude contraindicated poses
    if (filter.excludeContraindications?.length) {
      const hasContraindication = pose.contraindications.some(c =>
        filter.excludeContraindications!.includes(c)
      )
      if (hasContraindication) return false
    }

    // Filter by body position
    if (filter.bodyPositions?.length && !filter.bodyPositions.includes(pose.body_position)) {
      return false
    }

    // Filter by meridian overlap
    if (filter.meridians?.length) {
      const hasOverlap = (pose.meridians ?? []).some(m => filter.meridians!.includes(m))
      if (!hasOverlap) return false
    }

    // Filter by element
    if (filter.elements?.length && pose.element && !filter.elements.includes(pose.element)) {
      return false
    }

    // Filter by max difficulty
    if (filter.maxDifficulty !== undefined) {
      if (DIFFICULTY_ORDER[pose.difficulty] > DIFFICULTY_ORDER[filter.maxDifficulty]) {
        return false
      }
    }

    // Filter by energetic quality overlap
    if (filter.energeticQualities?.length) {
      const hasOverlap = pose.energetic_quality.some(eq =>
        filter.energeticQualities!.includes(eq)
      )
      if (!hasOverlap) return false
    }

    // Filter by mode type
    if (filter.modeType) {
      const hasMode = pose.modes.some(m => m.type === filter.modeType || m.type === 'both')
      if (!hasMode) return false
    }

    // Filter by bilateral
    if (filter.bilateral !== undefined && pose.bilateral !== filter.bilateral) {
      return false
    }

    return true
  })
}

export function rankAlternatesForPose(
  targetPose: Pose,
  sessionMeridians: string[],
  sessionElement: FiveElement | undefined,
  excludeSlugs: string[]
): Pose[] {
  const candidates = getAllPoses().filter(
    p => p.slug !== targetPose.slug && !excludeSlugs.includes(p.slug)
  )

  return candidates
    .map(pose => {
      let score = 0
      // Meridian overlap
      const meridianOverlap = (pose.meridians ?? []).filter(m => sessionMeridians.includes(m)).length
      score += meridianOverlap * 3
      // Same element
      if (pose.element && pose.element === sessionElement) score += 2
      // Same body position
      if (pose.body_position === targetPose.body_position) score += 2
      // Same difficulty
      if (pose.difficulty === targetPose.difficulty) score += 1
      // Shared energetic quality
      const eqOverlap = pose.energetic_quality.filter(eq =>
        targetPose.energetic_quality.includes(eq)
      ).length
      score += eqOverlap
      // Same tissue depth (similar structural demand makes a good alternate)
      if (pose.tissue_depth && pose.tissue_depth === targetPose.tissue_depth) score += 1
      // Same NS effect (alternate should feel similar in the sequence)
      if (pose.nervous_system_effect && pose.nervous_system_effect === targetPose.nervous_system_effect) score += 1
      // Shared type tags (functional similarity = good alternate)
      const typeTagOverlap = (pose.type_tags ?? []).filter(t => (targetPose.type_tags ?? []).includes(t)).length
      score += Math.min(typeTagOverlap, 3)
      return { pose, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ pose }) => pose)
}
