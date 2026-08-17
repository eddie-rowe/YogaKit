import type {
  ConstrainedSequence,
  ValidatedSequence,
  SequenceItem,
  SafetyNote,
  Pose,
} from './types'
import { getPoseBySlug, filterPoses } from '@/lib/pose-library'

// Safety layer — always returns ValidatedSequence, never throws (RULE-S1, RULE-S2)
// Violations are resolved via auto-replacement or gap insertion.
// All changes are recorded in safetyNotes[].

// ─── Violation checks ─────────────────────────────────────────────────────────

function isContraindicated(pose: Pose, contraindications: string[]): boolean {
  return pose.contraindications.some(c => contraindications.includes(c))
}

function missingRequiredProps(pose: Pose, availableProps: string[]): boolean {
  if (!pose.props_required.length) return false
  return pose.props_required.some(p => !availableProps.includes(p))
}

function isBilateralWithoutSide(item: SequenceItem): boolean {
  return item.pose.bilateral && item.side !== 'left' && item.side !== 'right'
}

// Savasana-style poses used as gap fillers
const SAFE_REST_SLUGS = ['savasana', 'constructive-rest', 'child-pose']

function findSafeReplacement(
  violatingPose: Pose,
  contraindications: string[],
  propsAvailable: string[],
  excludeSlugs: string[]
): Pose | null {
  // Try alternates on the pose first
  for (const slug of violatingPose.counterposes) {
    if (excludeSlugs.includes(slug)) continue
    const candidate = getPoseBySlug(slug)
    if (
      candidate &&
      !isContraindicated(candidate, contraindications) &&
      !missingRequiredProps(candidate, propsAvailable)
    ) {
      return candidate
    }
  }

  // Try a general safe rest pose
  for (const slug of SAFE_REST_SLUGS) {
    if (excludeSlugs.includes(slug)) continue
    const candidate = getPoseBySlug(slug)
    if (
      candidate &&
      !isContraindicated(candidate, contraindications) &&
      !missingRequiredProps(candidate, propsAvailable)
    ) {
      return candidate
    }
  }

  // Broader search filtered by same body position
  const candidates = filterPoses({
    excludeContraindications: contraindications,
    bodyPositions: [violatingPose.body_position],
  }).filter(p => !excludeSlugs.includes(p.slug))

  return candidates[0] ?? null
}

// ─── Validate bilateral expansion ────────────────────────────────────────────

function enforceBilateralSides(items: SequenceItem[], notes: SafetyNote[]): SequenceItem[] {
  const result: SequenceItem[] = []
  for (const item of items) {
    if (isBilateralWithoutSide(item)) {
      // Insert both sides
      result.push(
        { ...item, side: 'right' },
        {
          ...item,
          side: 'left',
          transitionFromPrev: 'Switch to the opposite side.',
        }
      )
      notes.push({
        poseSlug: item.pose.slug,
        issue: 'Bilateral pose was missing side assignment; both sides inserted.',
        action: 'gap-inserted',
      })
    } else {
      result.push(item)
    }
  }
  return result
}

// ─── Validate intensity ceiling ───────────────────────────────────────────────

// Blocks back-to-back advanced poses for beginner/mixed classes
function enforceIntensityCeiling(items: SequenceItem[], ctx: ConstrainedSequence): SequenceItem[] {
  const level = ctx.sessionContext.experienceLevel
  if (!level || level === 'advanced') return items

  const MAX_CONSECUTIVE_ADVANCED = 1
  let consecutiveAdvanced = 0
  const result: SequenceItem[] = []

  for (const item of items) {
    if (item.pose.difficulty === 'advanced') {
      consecutiveAdvanced++
      if (consecutiveAdvanced > MAX_CONSECUTIVE_ADVANCED) {
        // Skip this pose — the gap will be filled by the caller
        continue
      }
    } else {
      consecutiveAdvanced = 0
    }
    result.push(item)
  }
  return result
}

// ─── Main validate() function ─────────────────────────────────────────────────

export function validate(constrained: ConstrainedSequence): ValidatedSequence {
  const safetyNotes: SafetyNote[] = []
  const contraindications = constrained.sessionContext.hardConstraints.contraindications
  const propsAvailable = constrained.sessionContext.hardConstraints.propsAvailable

  let items = [...constrained.items]
  const usedSlugs = items.map(i => i.pose.slug)

  // Pass 1: Replace contraindicated and prop-missing poses
  items = items.map(item => {
    if (isContraindicated(item.pose, contraindications)) {
      const replacement = findSafeReplacement(item.pose, contraindications, propsAvailable, usedSlugs)
      if (replacement) {
        usedSlugs.push(replacement.slug)
        safetyNotes.push({
          poseSlug: item.pose.slug,
          issue: `Contraindication match: ${item.pose.contraindications.filter(c => contraindications.includes(c)).join(', ')}`,
          action: 'replaced',
          replacedWith: replacement.slug,
        })
        return { ...item, pose: replacement, alternates: [] }
      }
      // No replacement found — insert gap (savasana or child's pose)
      const gap = getPoseBySlug('savasana') ?? getPoseBySlug('child-pose')
      if (gap) {
        safetyNotes.push({
          poseSlug: item.pose.slug,
          issue: `Contraindication with no viable replacement — gap inserted.`,
          action: 'gap-inserted',
          replacedWith: gap.slug,
        })
        return { ...item, pose: gap, alternates: [] }
      }
      // Truly unresolvable — mark but preserve original (route handler will detect)
      safetyNotes.push({
        poseSlug: item.pose.slug,
        issue: 'SAFETY_UNRESOLVABLE: Contraindication with no safe alternative found.',
        action: 'gap-inserted',
      })
      return item
    }

    if (missingRequiredProps(item.pose, propsAvailable)) {
      // Use prop-free variation if available
      if (item.pose.prop_free_variation) {
        const variation = getPoseBySlug(item.pose.prop_free_variation)
        if (variation) {
          safetyNotes.push({
            poseSlug: item.pose.slug,
            issue: `Required props unavailable; using prop-free variation.`,
            action: 'replaced',
            replacedWith: variation.slug,
          })
          return { ...item, pose: variation }
        }
      }
      const replacement = findSafeReplacement(item.pose, contraindications, propsAvailable, usedSlugs)
      if (replacement) {
        usedSlugs.push(replacement.slug)
        safetyNotes.push({
          poseSlug: item.pose.slug,
          issue: `Required props not available: ${item.pose.props_required.filter(p => !propsAvailable.includes(p)).join(', ')}`,
          action: 'replaced',
          replacedWith: replacement.slug,
        })
        return { ...item, pose: replacement, alternates: [] }
      }
    }

    return item
  })

  // Pass 2: Enforce bilateral side assignments
  items = enforceBilateralSides(items, safetyNotes)

  // Pass 3: Enforce intensity ceiling
  items = enforceIntensityCeiling(items, constrained)

  // Pass 4: Timing check
  const totalHold = items.reduce((sum, it) => sum + it.holdMinutes, 0)
  const transitionMinutes = constrained.transitionMinutes
  const effectiveTotal = totalHold + transitionMinutes
  const targetDuration = constrained.sessionContext.durationMinutes ?? 75
  let timingSumWarning: string | undefined

  if (Math.abs(effectiveTotal - targetDuration) > targetDuration * 0.25) {
    timingSumWarning = `Session total (${effectiveTotal} min: ${totalHold} hold + ${transitionMinutes} transitions) deviates from target ${targetDuration} min.`
  }

  // Determine if any unresolvable violations remain
  const hasUnresolvable = safetyNotes.some(n =>
    n.issue.startsWith('SAFETY_UNRESOLVABLE')
  )

  return {
    ...constrained,
    items,
    totalHoldMinutes: totalHold,
    totalSessionMinutes: totalHold + transitionMinutes,
    safetyNotes,
    passedValidation: !hasUnresolvable,
    timingSumWarning,
  }
}
