import type {
  SessionContext,
  PipelineDraft,
  ConstrainedSequence,
  SequenceItem,
  Pose,
  ModeType,
  IntensityCurve,
  PoseDifficulty,
} from './types'
import { getAllPoses, getPoseBySlug, filterPoses, rankAlternatesForPose } from '@/lib/pose-library'
import { getMeridianSlugsForElement } from '@/lib/meridians'

const DIFFICULTY_ORDER: Record<PoseDifficulty, number> = {
  accessible: 0,
  intermediate: 1,
  advanced: 2,
}

// ─── Intensity Curve Helpers ─────────────────────────────────────────────────

// Compute a 0-1 intensity target for position i in a sequence of length n
function intensityTarget(curve: IntensityCurve, i: number, n: number): number {
  if (n <= 1) return 0.5
  const t = i / (n - 1)
  switch (curve) {
    case 'bell':
      return Math.sin(t * Math.PI)
    case 'plateau':
      return t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1
    case 'gradual-ramp':
      return t
    case 'front-loaded':
      return t < 0.3 ? 1 : 1 - ((t - 0.3) / 0.7)
    case 'back-loaded':
      return t < 0.7 ? t / 0.7 : 1
  }
}

// ─── Bilateral expansion ─────────────────────────────────────────────────────

// Bilateral poses must appear twice: once per side
function expandBilateral(item: SequenceItem): SequenceItem[] {
  if (!item.pose.bilateral) return [item]
  return [
    { ...item, side: 'right' },
    {
      ...item,
      side: 'left',
      transitionFromPrev: 'Switch to the opposite side.',
      transitionToNext: item.transitionToNext,
    },
  ]
}

// ─── Hold-time clamping by mode ───────────────────────────────────────────────

function clampHold(pose: Pose, modeType: ModeType, requestedMinutes: number): number {
  const mode = pose.modes.find(m => m.type === modeType || m.type === 'both')
  if (!mode) return requestedMinutes
  return Math.max(mode.hold_range.min, Math.min(mode.hold_range.max, requestedMinutes))
}

// ─── Mode resolution ─────────────────────────────────────────────────────────

// Resolve the AI's modeType request to what the pose actually supports
function resolveModeType(pose: Pose, requested: ModeType): ModeType {
  const types = pose.modes.map(m => m.type)
  if (types.includes(requested)) return requested
  if (types.includes('both')) return requested // 'both' supports either
  // Fallback to first available mode
  return types[0] ?? requested
}

// ─── Alternate resolution ─────────────────────────────────────────────────────

function resolveAlternates(
  pose: Pose,
  suggestedSlugs: string[],
  ctx: SessionContext,
  excludeSlugs: string[]
): Pose[] {
  const contraindications = ctx.hardConstraints.contraindications

  // First try the AI-suggested alternates (filter out contraindicated)
  const aiSuggested = suggestedSlugs
    .map(slug => getPoseBySlug(slug))
    .filter((p): p is Pose => !!p && !p.contraindications.some(c => contraindications.includes(c)))
    .slice(0, 3)

  if (aiSuggested.length >= 2) return aiSuggested

  // Fall back to scored ranking
  const meridians = ctx.elementFocus
    ? getMeridianSlugsForElement(ctx.elementFocus)
    : (ctx.meridianFocus ?? [])

  // Exclude all contraindicated poses from the ranked alternates pool (RULE-S1)
  const contraindicatedSlugs = getAllPoses()
    .filter(p => p.contraindications.some(c => contraindications.includes(c)))
    .map(p => p.slug)

  return rankAlternatesForPose(pose, meridians, ctx.elementFocus, [
    ...excludeSlugs,
    ...suggestedSlugs,
    ...contraindicatedSlugs,
  ])
}

// ─── Transition text generation ───────────────────────────────────────────────

function generateTransitionToNext(currentPose: Pose, nextPose: Pose | undefined): string {
  if (!nextPose) return 'Slowly return to stillness.'
  const positionChange = currentPose.body_position !== nextPose.body_position
  if (positionChange) {
    return `Gently transition from ${currentPose.body_position} to ${nextPose.body_position}.`
  }
  return 'Continue into the next shape.'
}

// ─── Rules engine fallback sequence ──────────────────────────────────────────

function buildFallbackSequence(ctx: SessionContext): { poses: SequenceItem[]; totalMinutes: number } {
  const style = ctx.style ?? 'yin'
  const isMeditative = style === 'yin' || style === 'restorative'
  const modeFilter: ModeType = isMeditative ? 'yin' : 'yang'
  const duration = ctx.durationMinutes ?? 75
  const targetHold = isMeditative ? 5 : 1
  const targetCount = Math.floor((duration * 0.8) / targetHold)

  const contraindications = ctx.hardConstraints.contraindications
  const meridians = ctx.elementFocus
    ? getMeridianSlugsForElement(ctx.elementFocus)
    : (ctx.meridianFocus ?? [])

  const candidates = filterPoses({
    excludeContraindications: contraindications,
    modeType: modeFilter,
    elements: ctx.elementFocus ? [ctx.elementFocus] : undefined,
  }).slice(0, targetCount)

  const allSlugs = candidates.map(p => p.slug)
  const contraindicatedSlugs = getAllPoses()
    .filter(p => p.contraindications.some(c => contraindications.includes(c)))
    .map(p => p.slug)

  const items: SequenceItem[] = candidates.map((pose, i) => ({
    pose,
    modeType: resolveModeType(pose, modeFilter),
    holdMinutes: targetHold,
    why: `Grounds the ${style} practice; supports ${pose.body_position} exploration.`,
    transitionFromPrev: i === 0 ? '' : 'Gently transition into the next pose.',
    transitionToNext: '',
    alternates: rankAlternatesForPose(pose, meridians, ctx.elementFocus, [...allSlugs, ...contraindicatedSlugs]),
  }))

  const totalMinutes = items.reduce((sum, it) => sum + it.holdMinutes, 0)
  return { poses: items, totalMinutes }
}

// ─── Main constrain() function ────────────────────────────────────────────────

export function constrain(draft: PipelineDraft, ctx: SessionContext): ConstrainedSequence {
  const contraindications = ctx.hardConstraints.contraindications
  const curve = ctx.intensityCurve ?? 'bell'
  const meridians = ctx.elementFocus
    ? getMeridianSlugsForElement(ctx.elementFocus)
    : (ctx.meridianFocus ?? [])

  // Map draft poses → resolved items
  let resolvedItems: SequenceItem[] = []
  const usedSlugs: string[] = []

  if (draft.poses.length > 0) {
    for (let i = 0; i < draft.poses.length; i++) {
      const entry = draft.poses[i]
      const pose = getPoseBySlug(entry.poseSlug)

      // Skip unknown slugs — the AI may hallucinate
      if (!pose) continue

      // Skip contraindicated poses — safety layer will catch any that slip through,
      // but the constrain layer is the first line of enforcement (RULE-H3)
      if (pose.contraindications.some(c => contraindications.includes(c))) continue

      const modeType = resolveModeType(pose, entry.modeType)
      const holdMinutes = clampHold(pose, modeType, entry.holdMinutes)

      const item: SequenceItem = {
        pose,
        modeType,
        holdMinutes,
        why: entry.why,
        transitionFromPrev: entry.transitionFromPrev,
        transitionToNext: '',
        alternates: resolveAlternates(pose, entry.suggestedAlternateSlugs, ctx, usedSlugs),
      }

      usedSlugs.push(pose.slug)
      resolvedItems.push(item)
    }
  }

  // Track whether any AI poses were actually resolved (not just skipped/hallucinated)
  const aiProducedItems = resolvedItems.length > 0

  // Fall back to rules-only if AI produced nothing usable
  if (!aiProducedItems) {
    const fallback = buildFallbackSequence(ctx)
    resolvedItems = fallback.poses
  }

  // Enforce intensity curve by reordering if needed (RULE-H2)
  // This is a soft sort — only reorders within each body position group
  // to avoid dramatic jumps, preserving the opening and closing poses
  const n = resolvedItems.length
  const curve_ = curve
  resolvedItems.sort((a, b) => {
    const ai = resolvedItems.indexOf(a)
    const bi = resolvedItems.indexOf(b)
    const aTarget = intensityTarget(curve_, ai, n)
    const bTarget = intensityTarget(curve_, bi, n)
    const aDiff = DIFFICULTY_ORDER[a.pose.difficulty]
    const bDiff = DIFFICULTY_ORDER[b.pose.difficulty]
    // Sort by how well pose difficulty matches target intensity
    const aScore = Math.abs(aDiff / 2 - aTarget)
    const bScore = Math.abs(bDiff / 2 - bTarget)
    return aScore - bScore
  })

  // Expand bilateral poses to both sides
  const expanded: SequenceItem[] = []
  for (const item of resolvedItems) {
    expanded.push(...expandBilateral(item))
  }

  // Fill transitionToNext after expansion
  for (let i = 0; i < expanded.length; i++) {
    expanded[i] = {
      ...expanded[i],
      transitionToNext: generateTransitionToNext(expanded[i].pose, expanded[i + 1]?.pose),
    }
  }

  const totalHoldMinutes = expanded.reduce((sum, it) => sum + it.holdMinutes, 0)

  return {
    sessionContext: ctx,
    themeStatement: draft.themeStatement,
    philosophicalFraming: draft.philosophicalFraming,
    quote: draft.quote,
    items: expanded,
    totalHoldMinutes,
  }
}
