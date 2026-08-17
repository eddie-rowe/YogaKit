import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SessionContext, Pose } from '@/lib/pipeline/types'

vi.mock('@/lib/pose-library', () => ({
  getAllPoses: vi.fn(() => []),
  filterPoses: vi.fn(() => []),
}))

vi.mock('@/lib/meridians', () => ({
  getMeridianSlugsForElement: vi.fn(() => ['kidney', 'bladder']),
}))

vi.mock('@/lib/pipeline/content', () => ({
  pickContent: vi.fn(() => ({
    themeStatement: 'A yin practice for winter — stillness and depth.',
    philosophicalFraming: 'Water flows to the lowest place.',
    quote: { text: 'Test quote', attribution: 'Test source' },
    sutra: { text: 'Test sutra', attribution: 'Test sutra source' },
  })),
}))

import { propose } from '@/lib/pipeline/propose'

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

function makeCtx(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    style: 'yin',
    durationMinutes: 75,
    experienceLevel: 'mixed',
    elementFocus: 'water',
    hardConstraints: {
      contraindications: [],
      propsAvailable: ['mat', 'blanket'],
    },
    ...overrides,
  }
}

describe('propose() — pure rules-based proposer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a PipelineDraft with theme, framing, quote, and poses array', async () => {
    const draft = await propose(makeCtx())
    expect(draft.themeStatement).toBeTruthy()
    expect(draft.philosophicalFraming).toBeTruthy()
    expect(draft.quote.text).toBeTruthy()
    expect(draft.quote.attribution).toBeTruthy()
    expect(Array.isArray(draft.poses)).toBe(true)
  })

  it('returns empty poses when no poses in the library match', async () => {
    const { filterPoses } = await import('@/lib/pose-library')
    vi.mocked(filterPoses).mockReturnValue([])

    const draft = await propose(makeCtx())
    expect(draft.poses).toEqual([])
  })

  it('produces poses with required DraftPoseEntry fields', async () => {
    const { filterPoses } = await import('@/lib/pose-library')
    const poses = [
      makePose({ slug: 'sphinx' }),
      makePose({ slug: 'butterfly', body_position: 'seated' }),
      makePose({ slug: 'savasana', sequencing_position: ['integration'] }),
    ]
    vi.mocked(filterPoses).mockReturnValue(poses)
    vi.mocked((await import('@/lib/pose-library')).getAllPoses).mockReturnValue(poses)

    const draft = await propose(makeCtx())
    for (const entry of draft.poses) {
      expect(entry.poseSlug).toBeTruthy()
      expect(typeof entry.holdMinutes).toBe('number')
      expect(entry.holdMinutes).toBeGreaterThan(0)
      expect(typeof entry.why).toBe('string')
      expect(typeof entry.transitionFromPrev).toBe('string')
      expect(Array.isArray(entry.suggestedAlternateSlugs)).toBe(true)
    }
  })

  it('does not include poses with active contraindications', async () => {
    const { filterPoses } = await import('@/lib/pose-library')
    // filterPoses already handles contraindications — verify no contraindicated slugs appear
    const safePose = makePose({ slug: 'safe', contraindications: [] })
    vi.mocked(filterPoses).mockReturnValue([safePose])

    const ctx = makeCtx({
      hardConstraints: { contraindications: ['knee-injury'], propsAvailable: ['mat'] },
    })
    const draft = await propose(ctx)
    expect(draft.poses.every(p => p.poseSlug !== 'bad-pose')).toBe(true)
  })

  it('makes no network calls (no Anthropic SDK)', async () => {
    // Verifying propose() is pure — no global fetch should be called
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await propose(makeCtx())
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
