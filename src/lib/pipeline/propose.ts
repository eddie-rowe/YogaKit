import type { SessionContext, PipelineDraft, DraftPoseEntry } from './types'
import type {
  Pose,
  BodyPosition,
  ModeType,
  IntensityCurve,
  SequencingPosition,
  ExperienceLevel,
} from '@/lib/pose-types'
import { getAllPoses, filterPoses } from '@/lib/pose-library'
import { getMeridianSlugsForElement } from '@/lib/meridians'
import { pickContent } from './content'

// ─── Buffer time helper ───────────────────────────────────────────────────────

export function bufferMinutesPerPose(style: string | undefined): number {
  return style === 'yin' || style === 'restorative' ? 3 : 1.5
}

// ─── Phase distribution by intensity curve ────────────────────────────────────

type PhaseSlots = Record<SequencingPosition, number>

function buildPositionSlots(curve: IntensityCurve, count: number): PhaseSlots {
  const DISTRIBUTIONS: Record<IntensityCurve, [number, number, number, number, number]> = {
    //                        open build peak cool integ
    'bell':          [0.15, 0.25, 0.20, 0.25, 0.15],
    'plateau':       [0.10, 0.20, 0.40, 0.20, 0.10],
    'gradual-ramp':  [0.15, 0.30, 0.30, 0.15, 0.10],
    'front-loaded':  [0.10, 0.40, 0.25, 0.15, 0.10],
    'back-loaded':   [0.15, 0.15, 0.30, 0.25, 0.15],
  }
  const dist = DISTRIBUTIONS[curve]
  const raw = dist.map(f => Math.max(1, Math.round(f * count)))
  const total = raw.reduce((s, n) => s + n, 0)
  // Trim/pad the 'cooldown' slot to hit exactly `count`
  raw[3] = Math.max(1, raw[3] + (count - total))
  const positions: SequencingPosition[] = ['opening', 'building', 'peak', 'cooldown', 'integration']
  return Object.fromEntries(positions.map((p, i) => [p, raw[i]])) as PhaseSlots
}

// ─── Pose scoring ─────────────────────────────────────────────────────────────

const DIFFICULTY_FOR_LEVEL: Record<ExperienceLevel, string[]> = {
  beginner:     ['accessible'],
  intermediate: ['accessible', 'intermediate'],
  advanced:     ['accessible', 'intermediate', 'advanced'],
  mixed:        ['accessible', 'intermediate'],
}

function scorePose(
  pose: Pose,
  ctx: SessionContext,
  meridianSlugs: string[],
  usedBodyPositions: BodyPosition[],
  prevBodyPosition: BodyPosition | null,
): number {
  let score = 0

  // Element alignment
  if (ctx.elementFocus && pose.element === ctx.elementFocus) score += 4
  else if (pose.element === null) score += 0  // neutral — no penalty

  // Meridian overlap
  const overlap = (pose.meridians ?? []).filter(m => meridianSlugs.includes(m)).length
  score += overlap * 2

  // Experience level fitness
  const levelPoses = DIFFICULTY_FOR_LEVEL[ctx.experienceLevel ?? 'mixed']
  if (levelPoses.includes(pose.difficulty)) score += 2

  // Body position variety — reward positions not yet used
  if (!usedBodyPositions.includes(pose.body_position)) score += 2
  // Small penalty for same body position as previous (avoid monotony)
  if (prevBodyPosition && pose.body_position === prevBodyPosition) score -= 1

  // Props — prefer prop-free if no props listed available
  if (pose.props_required.length === 0) score += 1
  else if (ctx.hardConstraints.propsAvailable.length > 0) {
    const allAvailable = pose.props_required.every(p => ctx.hardConstraints.propsAvailable.includes(p))
    if (allAvailable) score += 1
    else score -= 2
  }

  return score
}

// ─── Why-text generation ──────────────────────────────────────────────────────

const POSITION_RATIONALE: Record<SequencingPosition, [string, string]> = {
  opening:     ['an accessible shape that invites the body to arrive and the breath to settle',
                'a gentle opening that begins to awaken the meridian pathways'],
  building:    ['building steadily toward the depth of today\'s theme',
                'deepening the work as the body grows receptive'],
  peak:        ['the deepest expression of this practice\'s intention',
                'where the theme finds its fullest embodiment'],
  cooldown:    ['gently returning the body toward integration',
                'beginning the long, slow return to stillness'],
  integration: ['allowing the practice to settle and complete',
                'the body receives everything it has cultivated'],
}

function buildWhyText(
  pose: Pose,
  ctx: SessionContext,
  position: SequencingPosition,
  meridianSlugs: string[],
  poseIndex: number,
): string {
  const parts: string[] = []

  const overlapping = (pose.meridians ?? []).filter(m => meridianSlugs.includes(m))
  if (overlapping.length > 0) {
    const names = overlapping.slice(0, 2).join(' and ')
    parts.push(`Targets the ${names} meridian${overlapping.length !== 1 ? 's' : ''}`)
  }

  if (pose.element && pose.element === ctx.elementFocus) {
    parts.push(`directly supporting ${pose.element} element work this ${ctx.season ?? 'season'}`)
  }

  if ((pose.muscle_groups?.length ?? 0) > 0) {
    const groups = pose.muscle_groups!.slice(0, 2).map(g => g.replace(/-/g, ' ')).join(' and ')
    parts.push(`releasing through the ${groups}`)
  }

  parts.push(POSITION_RATIONALE[position][poseIndex % 2])

  return parts.join('; ') + '.'
}

// ─── Transition text ──────────────────────────────────────────────────────────

const BODY_TRANSITIONS: Partial<Record<string, string>> = {
  'supine-prone':    'Roll to one side and gently lower onto your belly.',
  'prone-supine':    'Press up with your hands, roll to one side, and release onto your back.',
  'supine-seated':   'Draw your knees in, roll to your right side, and press up to seated.',
  'seated-supine':   'Slowly lengthen back onto your back.',
  'seated-standing': 'Place your hands on the mat and press through your feet to standing.',
  'standing-seated': 'Bend your knees and lower through a squat into seated.',
  'kneeling-seated': 'Shift your hips to one side and settle into seated.',
  'seated-kneeling': 'Come to hands and knees, then find your kneeling position.',
  'standing-kneeling':'Slowly lower one knee at a time to the mat.',
  'kneeling-standing':'Press through your front foot and rise to standing.',
  'supine-inverted': 'Draw your knees to your chest, then swing your legs overhead.',
  'inverted-supine': 'Lower your legs slowly back down with full control.',
}

function buildTransitionText(prevPose: Pose | null, thisPose: Pose): string {
  if (!prevPose) return ''
  if (prevPose.body_position === thisPose.body_position) return 'Continue into the next shape.'
  const key = `${prevPose.body_position}-${thisPose.body_position}`
  return BODY_TRANSITIONS[key] ?? `Transition from ${prevPose.body_position} to ${thisPose.body_position}.`
}

// ─── Alternate slugs ──────────────────────────────────────────────────────────

function pickAlternates(
  pose: Pose,
  ctx: SessionContext,
  meridianSlugs: string[],
  usedSlugs: Set<string>,
): string[] {
  const contraindications = ctx.hardConstraints.contraindications
  const modeFilter: ModeType = pose.modes[0]?.type ?? 'yin'

  return getAllPoses()
    .filter(p =>
      p.slug !== pose.slug &&
      !usedSlugs.has(p.slug) &&
      p.body_position === pose.body_position &&
      !p.contraindications.some(c => contraindications.includes(c)) &&
      p.modes.some(m => m.type === modeFilter || m.type === 'both'),
    )
    .sort((a, b) => {
      const aOverlap = (a.meridians ?? []).filter(m => meridianSlugs.includes(m)).length
      const bOverlap = (b.meridians ?? []).filter(m => meridianSlugs.includes(m)).length
      return bOverlap - aOverlap
    })
    .slice(0, 3)
    .map(p => p.slug)
}

// ─── Main pose sequencer ──────────────────────────────────────────────────────

function buildPoseSequence(ctx: SessionContext): DraftPoseEntry[] {
  const style = ctx.style ?? 'yin'
  const isMeditative = style === 'yin' || style === 'restorative'
  const modeFilter: ModeType = isMeditative ? 'yin' : 'yang'
  const duration = ctx.durationMinutes ?? 75
  const avgHold = isMeditative ? 5 : 1
  const buffer = bufferMinutesPerPose(style)
  const targetCount = Math.max(4, Math.min(20, Math.floor(duration / (avgHold + buffer))))
  const curve = ctx.intensityCurve ?? 'bell'

  const contraindications = ctx.hardConstraints.contraindications
  const meridianSlugs = ctx.elementFocus
    ? getMeridianSlugsForElement(ctx.elementFocus)
    : (ctx.meridianFocus ?? [])

  // All eligible poses for this session
  const candidatePool = filterPoses({
    excludeContraindications: contraindications,
    modeType: modeFilter,
    maxDifficulty: ctx.poseComplexity === 'simple' ? 'accessible'
      : ctx.poseComplexity === 'moderate' ? 'intermediate'
      : undefined,
  })

  const slots = buildPositionSlots(curve, targetCount)
  const positions: SequencingPosition[] = ['opening', 'building', 'peak', 'cooldown', 'integration']

  const entries: DraftPoseEntry[] = []
  const usedSlugs = new Set<string>()
  const usedBodyPositions: BodyPosition[] = []
  let prevPose: Pose | null = null
  let totalEntries = 0

  // Positions that must not receive exclusively-integration/cooldown poses in fallback
  const EARLY_POSITIONS = new Set<SequencingPosition>(['opening', 'building', 'peak'])

  for (const position of positions) {
    const slotCount = slots[position]

    // Prefer poses with this sequencing_position; fall back to all candidates
    const positionPrefered = candidatePool.filter(p =>
      p.sequencing_position?.includes(position) && !usedSlugs.has(p.slug)
    )

    // When building the fallback pool, exclude poses that are exclusively
    // integration/cooldown from early phases (opening, building, peak), and
    // exclude exclusively-integration poses from the cooldown phase.
    const integrationOnlyPositions: SequencingPosition[] = ['integration', 'cooldown']
    const integrationExclusivePositions: SequencingPosition[] = ['integration']

    const positionFallback = candidatePool.filter(p => {
      if (usedSlugs.has(p.slug)) return false
      const sp = p.sequencing_position
      if (!sp || sp.length === 0) return true  // no restriction — always eligible
      if (EARLY_POSITIONS.has(position)) {
        // Exclude poses whose sequencing_position is entirely within integration/cooldown
        const isExclusivelyLate = sp.every(s => integrationOnlyPositions.includes(s as SequencingPosition))
        if (isExclusivelyLate) return false
      } else if (position === 'cooldown') {
        // Exclude poses whose sequencing_position is entirely 'integration'
        const isExclusivelyIntegration = sp.every(s => integrationExclusivePositions.includes(s as SequencingPosition))
        if (isExclusivelyIntegration) return false
      }
      return true
    })

    const pool = positionPrefered.length >= slotCount ? positionPrefered : positionFallback

    for (let i = 0; i < slotCount; i++) {
      if (pool.length === 0) break

      // Score remaining poses and pick the best
      const scored = pool
        .filter(p => !usedSlugs.has(p.slug))
        .map(p => ({
          pose: p,
          score: scorePose(p, ctx, meridianSlugs, usedBodyPositions, prevPose?.body_position ?? null),
        }))
        .sort((a, b) => b.score - a.score)

      const best = scored[0]?.pose
      if (!best) break

      const mode = best.modes.find(m => m.type === modeFilter || m.type === 'both')
      const hold = mode
        ? Math.min(mode.hold_range.max, Math.max(mode.hold_range.min, avgHold))
        : avgHold

      entries.push({
        poseSlug: best.slug,
        modeType: mode?.type === 'both' ? modeFilter : (mode?.type ?? modeFilter),
        holdMinutes: hold,
        why: buildWhyText(best, ctx, position, meridianSlugs, totalEntries),
        transitionFromPrev: buildTransitionText(prevPose, best),
        suggestedAlternateSlugs: pickAlternates(best, ctx, meridianSlugs, usedSlugs),
      })

      usedSlugs.add(best.slug)
      totalEntries++
      if (!usedBodyPositions.includes(best.body_position)) {
        usedBodyPositions.push(best.body_position)
      }
      prevPose = best
    }
  }

  // Guarantee the final pose is an integration pose if one is available and
  // the last selected pose is not already from the integration slot.
  const lastEntry = entries[entries.length - 1]
  if (lastEntry) {
    const lastPoseData = candidatePool.find(p => p.slug === lastEntry.poseSlug)
    const lastIsIntegration = lastPoseData?.sequencing_position?.includes('integration') ?? false
    if (!lastIsIntegration) {
      const integrationPose = candidatePool.find(p =>
        !usedSlugs.has(p.slug) &&
        p.sequencing_position?.includes('integration')
      )
      if (integrationPose) {
        const mode = integrationPose.modes.find(m => m.type === modeFilter || m.type === 'both')
        const hold = mode
          ? Math.min(mode.hold_range.max, Math.max(mode.hold_range.min, avgHold))
          : avgHold
        entries.push({
          poseSlug: integrationPose.slug,
          modeType: mode?.type === 'both' ? modeFilter : (mode?.type ?? modeFilter),
          holdMinutes: hold,
          why: buildWhyText(integrationPose, ctx, 'integration', meridianSlugs, totalEntries),
          transitionFromPrev: buildTransitionText(prevPose, integrationPose),
          suggestedAlternateSlugs: pickAlternates(integrationPose, ctx, meridianSlugs, usedSlugs),
        })
      }
    }
  }

  return entries
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function propose(ctx: SessionContext): Promise<PipelineDraft> {
  const content = pickContent({
    style: ctx.style,
    season: ctx.season,
    elementFocus: ctx.elementFocus,
    theme: ctx.theme,
    durationMinutes: ctx.durationMinutes,
  })

  const poses = buildPoseSequence(ctx)

  return {
    themeStatement: content.themeStatement,
    philosophicalFraming: content.philosophicalFraming,
    quote: content.quote,
    sutra: content.sutra,
    poses,
  }
}
