import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PipelineDraft, SessionContext, Pose, DraftPoseEntry } from '@/lib/pipeline/types'

vi.mock('@/lib/pose-library', () => ({
  getAllPoses: vi.fn(() => []),
  getPoseBySlug: vi.fn(),
  filterPoses: vi.fn(() => []),
  rankAlternatesForPose: vi.fn(() => []),
}))

vi.mock('@/lib/meridians', () => ({
  getMeridianSlugsForElement: vi.fn(() => ['kidney', 'bladder']),
}))

import { constrain } from '@/lib/pipeline/constrain'
import { getPoseBySlug, filterPoses, rankAlternatesForPose } from '@/lib/pose-library'

function makePose(overrides: Partial<Pose> = {}): Pose {
  return {
    slug: 'test-pose',
    sanskrit: 'Test',
    english: 'Test Pose',
    aliases: [],
    modes: [
      { type: 'yin', tissue_target: 'connective', hold_range: { min: 3, max: 7 }, cue_notes: '' },
    ],
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
    ...overrides,
  }
}

function makeDraft(poses: DraftPoseEntry[] = [], overrides: Partial<PipelineDraft> = {}): PipelineDraft {
  return {
    themeStatement: 'Test theme',
    philosophicalFraming: 'Test framing',
    quote: { text: 'Quote', attribution: 'Source' },
    poses,
    aiModelUsed: 'test',
    generationSkipped: false,
    ...overrides,
  }
}

function makeCtx(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    style: 'yin',
    durationMinutes: 75,
    experienceLevel: 'mixed',
    elementFocus: 'water',
    hardConstraints: {
      contraindications: [],
      propsAvailable: ['mat', 'blanket', 'block'],
    },
    ...overrides,
  }
}

describe('constrain()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rankAlternatesForPose).mockReturnValue([])
  })

  it('resolves a valid AI-proposed pose to a SequenceItem', () => {
    const pose = makePose({ slug: 'sphinx' })
    vi.mocked(getPoseBySlug).mockReturnValue(pose)

    const draft = makeDraft([
      {
        poseSlug: 'sphinx',
        modeType: 'yin',
        holdMinutes: 5,
        why: 'test',
        transitionFromPrev: '',
        suggestedAlternateSlugs: [],
      },
    ])

    const result = constrain(draft, makeCtx())
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items[0].pose.slug).toBe('sphinx')
    expect(result.generationProvenance).toBe('ai-assisted')
  })

  it('skips AI poses with unknown slugs (hallucination guard)', () => {
    vi.mocked(getPoseBySlug).mockReturnValue(undefined)

    const draft = makeDraft([
      {
        poseSlug: 'hallucinated-pose',
        modeType: 'yin',
        holdMinutes: 5,
        why: 'test',
        transitionFromPrev: '',
        suggestedAlternateSlugs: [],
      },
    ])

    vi.mocked(filterPoses).mockReturnValue([makePose({ slug: 'fallback-pose' })])
    const result = constrain(draft, makeCtx())
    // Should fall back to rules-only since no valid poses remain
    expect(result.items.every(i => i.pose.slug !== 'hallucinated-pose')).toBe(true)
    expect(result.generationProvenance).toBe('rules-only')
  })

  it('strips contraindicated poses from AI draft', () => {
    const badPose = makePose({ slug: 'bad-pose', contraindications: ['knee-injury'] })
    vi.mocked(getPoseBySlug).mockReturnValue(badPose)
    vi.mocked(filterPoses).mockReturnValue([makePose({ slug: 'fallback' })])

    const draft = makeDraft([
      {
        poseSlug: 'bad-pose',
        modeType: 'yin',
        holdMinutes: 5,
        why: 'test',
        transitionFromPrev: '',
        suggestedAlternateSlugs: [],
      },
    ])

    const result = constrain(
      draft,
      makeCtx({ hardConstraints: { contraindications: ['knee-injury'], propsAvailable: ['mat'] } })
    )
    expect(result.items.every(i => i.pose.slug !== 'bad-pose')).toBe(true)
  })

  it('clamps hold times to pose mode hold_range', () => {
    const pose = makePose({
      slug: 'clamped-pose',
      modes: [{ type: 'yin', tissue_target: 'connective', hold_range: { min: 3, max: 5 }, cue_notes: '' }],
    })
    vi.mocked(getPoseBySlug).mockReturnValue(pose)

    const draft = makeDraft([
      {
        poseSlug: 'clamped-pose',
        modeType: 'yin',
        holdMinutes: 99, // exceeds max
        why: 'test',
        transitionFromPrev: '',
        suggestedAlternateSlugs: [],
      },
    ])

    const result = constrain(draft, makeCtx())
    expect(result.items[0].holdMinutes).toBeLessThanOrEqual(5)
  })

  it('expands bilateral poses to both sides', () => {
    const pose = makePose({ slug: 'bilateral-pose', bilateral: true })
    vi.mocked(getPoseBySlug).mockReturnValue(pose)

    const draft = makeDraft([
      {
        poseSlug: 'bilateral-pose',
        modeType: 'yin',
        holdMinutes: 5,
        why: 'test',
        transitionFromPrev: '',
        suggestedAlternateSlugs: [],
      },
    ])

    const result = constrain(draft, makeCtx())
    const sides = result.items.filter(i => i.pose.slug === 'bilateral-pose').map(i => i.side)
    expect(sides).toContain('right')
    expect(sides).toContain('left')
  })

  it('falls back to rules-only sequence when AI draft is empty', () => {
    const fallbackPose = makePose({ slug: 'fallback-pose' })
    vi.mocked(filterPoses).mockReturnValue([fallbackPose])

    const draft = makeDraft([], { generationSkipped: true })
    const result = constrain(draft, makeCtx())
    expect(result.generationProvenance).toBe('rules-only')
    expect(result.items.length).toBeGreaterThan(0)
  })

  it('computes totalHoldMinutes from all expanded items', () => {
    const pose = makePose({ slug: 'test', bilateral: false })
    vi.mocked(getPoseBySlug).mockReturnValue(pose)

    const draft = makeDraft([
      { poseSlug: 'test', modeType: 'yin', holdMinutes: 5, why: '', transitionFromPrev: '', suggestedAlternateSlugs: [] },
      { poseSlug: 'test', modeType: 'yin', holdMinutes: 3, why: '', transitionFromPrev: '', suggestedAlternateSlugs: [] },
    ])

    const result = constrain(draft, makeCtx())
    expect(result.totalHoldMinutes).toBe(result.items.reduce((s, i) => s + i.holdMinutes, 0))
  })

  it('preserves theme and quote from draft', () => {
    vi.mocked(filterPoses).mockReturnValue([])
    const draft = makeDraft([], {
      themeStatement: 'Winter is a time to rest.',
      quote: { text: 'Rest', attribution: 'Someone' },
      generationSkipped: true,
    })
    const result = constrain(draft, makeCtx())
    expect(result.themeStatement).toBe('Winter is a time to rest.')
    expect(result.quote.text).toBe('Rest')
  })
})
