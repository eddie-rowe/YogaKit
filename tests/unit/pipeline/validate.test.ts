import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ConstrainedSequence, SequenceItem, Pose, SessionContext } from '@/lib/pipeline/types'

// Mock the pose library — validate.ts must not touch the filesystem in tests
vi.mock('@/lib/pose-library', () => ({
  getPoseBySlug: vi.fn(),
  filterPoses: vi.fn(() => []),
}))

import { validate } from '@/lib/pipeline/validate'
import { getPoseBySlug, filterPoses } from '@/lib/pose-library'

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function makePose(overrides: Partial<Pose> = {}): Pose {
  return {
    slug: 'test-pose',
    sanskrit: 'Test',
    english: 'Test Pose',
    aliases: [],
    modes: [{ type: 'yin', tissue_target: 'connective', hold_range: { min: 3, max: 7 }, cue_notes: '' }],
    body_position: 'supine',
    meridians: ['kidney'],
    element: 'water',
    energetic_quality: ['grounding'],
    difficulty: 'accessible',
    props_required: [],
    prop_free_variation: null,
    counterposes: [],
    rebound_pose: null,
    contraindications: [],
    bilateral: false,
    source: 'test',
    notes: '',
    type_tags: ['restorative'],
    muscle_groups: ['lumbar-spine'],
    complexity: 3,
    injury_risk: 2,
    breathing_cues: { entering: '', holding: '', exiting: '' },
    joint_action: ['flexion'],
    primary_joints_involved: ['lumbar'],
    nervous_system_effect: 'parasympathetic',
    tissue_depth: 'deep',
    modifications: [],
    dosha_affinity: { vata: 'balancing', pitta: 'neutral', kapha: 'neutral' },
    emotional_release_potential: [],
    sequencing_position: ['cooldown'],
    base_of_support: ['sitbones'], orientation: 'upright', cog_height: 'low', spinal_action: 'neutral', plane: 'sagittal', level: 'low', zone: 'near', energetic_direction: 'langhana', intensity: 2, default_measure: { seconds: 120 },
    ...overrides,
  }
}

function makeItem(pose: Pose, overrides: Partial<SequenceItem> = {}): SequenceItem {
  return {
    pose,
    modeType: 'yin',
    holdMinutes: 5,
    why: 'test',
    transitionFromPrev: '',
    transitionToNext: '',
    alternates: [],
    ...overrides,
  }
}

function makeCtx(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    style: 'yin',
    durationMinutes: 75,
    experienceLevel: 'mixed',
    hardConstraints: {
      contraindications: [],
      propsAvailable: ['mat', 'blanket', 'block'],
    },
    ...overrides,
  }
}

function makeConstrained(items: SequenceItem[], ctxOverrides: Partial<SessionContext> = {}): ConstrainedSequence {
  const totalHoldMinutes = items.reduce((s, i) => s + i.holdMinutes, 0)
  const transitionMinutes = items.length * 3
  return {
    sessionContext: makeCtx(ctxOverrides),
    themeStatement: 'Test theme',
    philosophicalFraming: 'Test framing',
    quote: { text: 'Test quote', attribution: 'Test' },
    sutra: { text: 'Test sutra', attribution: 'Test sutra source' },
    items,
    totalHoldMinutes,
    transitionMinutes,
    totalSessionMinutes: totalHoldMinutes + transitionMinutes,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('validate()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ValidatedSequence with passedValidation=true for a clean sequence', () => {
    const pose = makePose()
    const seq = makeConstrained([makeItem(pose)])
    const result = validate(seq)
    expect(result.passedValidation).toBe(true)
    expect(result.safetyNotes).toHaveLength(0)
  })

  it('replaces a contraindicated pose with a safe alternative', () => {
    const badPose = makePose({ slug: 'bad-pose', contraindications: ['knee-injury'] })
    const safePose = makePose({ slug: 'safe-pose' })
    vi.mocked(getPoseBySlug).mockReturnValue(safePose)
    vi.mocked(filterPoses).mockReturnValue([safePose])

    const seq = makeConstrained(
      [makeItem(badPose)],
      { hardConstraints: { contraindications: ['knee-injury'], propsAvailable: ['mat'] } }
    )
    const result = validate(seq)
    expect(result.items[0].pose.slug).not.toBe('bad-pose')
    expect(result.safetyNotes).toHaveLength(1)
    expect(result.safetyNotes[0].action).toBe('replaced')
    expect(result.safetyNotes[0].poseSlug).toBe('bad-pose')
  })

  it('records SAFETY_UNRESOLVABLE when no replacement exists for a contraindicated pose', () => {
    const badPose = makePose({ slug: 'bad-pose', contraindications: ['all-contraindications'] })
    vi.mocked(getPoseBySlug).mockReturnValue(undefined)
    vi.mocked(filterPoses).mockReturnValue([])

    const seq = makeConstrained(
      [makeItem(badPose)],
      { hardConstraints: { contraindications: ['all-contraindications'], propsAvailable: [] } }
    )
    const result = validate(seq)
    const unresolvable = result.safetyNotes.find(n => n.issue.startsWith('SAFETY_UNRESOLVABLE'))
    expect(unresolvable).toBeDefined()
    expect(result.passedValidation).toBe(false)
  })

  it('uses prop-free variation when required props are missing', () => {
    const poseWithProps = makePose({
      slug: 'bolster-pose',
      props_required: ['bolster'],
      prop_free_variation: 'no-bolster-variation',
    })
    const variation = makePose({ slug: 'no-bolster-variation' })
    vi.mocked(getPoseBySlug).mockImplementation(slug =>
      slug === 'no-bolster-variation' ? variation : undefined
    )

    const seq = makeConstrained(
      [makeItem(poseWithProps)],
      { hardConstraints: { contraindications: [], propsAvailable: ['mat'] } }
    )
    const result = validate(seq)
    expect(result.items[0].pose.slug).toBe('no-bolster-variation')
    expect(result.safetyNotes[0].action).toBe('replaced')
  })

  it('inserts both sides for a bilateral pose missing side assignment', () => {
    const bilateralPose = makePose({ slug: 'bilateral-pose', bilateral: true })
    const seq = makeConstrained([makeItem(bilateralPose)]) // no side specified

    const result = validate(seq)
    const sides = result.items.filter(i => i.pose.slug === 'bilateral-pose').map(i => i.side)
    expect(sides).toContain('right')
    expect(sides).toContain('left')
    expect(result.safetyNotes.some(n => n.action === 'gap-inserted')).toBe(true)
  })

  it('skips intensity-ceiling enforcement for advanced-level class', () => {
    const advancedPose = makePose({ slug: 'advanced-pose', difficulty: 'advanced' })
    const seq = makeConstrained(
      [makeItem(advancedPose), makeItem(advancedPose, { pose: { ...advancedPose, slug: 'advanced-pose-2' } })],
      { experienceLevel: 'advanced' }
    )
    const result = validate(seq)
    // Both advanced poses should remain
    const advanced = result.items.filter(i => i.pose.difficulty === 'advanced')
    expect(advanced.length).toBe(2)
  })

  it('drops excess consecutive advanced poses for beginner classes', () => {
    const advancedPoses = [1, 2, 3].map(n =>
      makePose({ slug: `advanced-${n}`, difficulty: 'advanced' })
    )
    const seq = makeConstrained(
      advancedPoses.map(p => makeItem(p)),
      { experienceLevel: 'beginner' }
    )
    const result = validate(seq)
    const remaining = result.items.filter(i => i.pose.difficulty === 'advanced')
    expect(remaining.length).toBeLessThan(3)
  })

  it('emits timingSumWarning when hold times deviate far from target duration', () => {
    const pose = makePose()
    // Very long hold times for short class
    const items = Array.from({ length: 5 }, (_, i) =>
      makeItem(makePose({ slug: `pose-${i}` }), { holdMinutes: 30 })
    )
    const seq = makeConstrained(items, { durationMinutes: 30 })
    const result = validate(seq)
    expect(result.timingSumWarning).toBeDefined()
  })

  it('never throws — returns ValidatedSequence even when all poses are contraindicated', () => {
    const badPoses = Array.from({ length: 5 }, (_, i) =>
      makePose({ slug: `bad-${i}`, contraindications: ['everything'] })
    )
    vi.mocked(getPoseBySlug).mockReturnValue(undefined)
    vi.mocked(filterPoses).mockReturnValue([])

    const seq = makeConstrained(
      badPoses.map(p => makeItem(p)),
      { hardConstraints: { contraindications: ['everything'], propsAvailable: [] } }
    )
    expect(() => validate(seq)).not.toThrow()
    const result = validate(seq)
    expect(result).toHaveProperty('safetyNotes')
    expect(result).toHaveProperty('passedValidation')
  })
})
