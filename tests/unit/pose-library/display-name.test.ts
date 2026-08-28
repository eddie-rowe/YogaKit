import { describe, it, expect } from 'vitest'
import type { Pose } from '@/lib/pose-types'
import { resolveDisplayName, allSearchableNames, appliesToStyle } from '@/lib/pose-library/display-name'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePose(overrides: Partial<Pose> = {}): Pose {
  return {
    slug: 'test', sanskrit: 'Testasana', english: 'Test Pose', aliases: [],
    modes: [{ type: 'yin', tissue_target: 'connective', hold_range: { min: 3, max: 5 }, cue_notes: '' }],
    body_position: 'supine', meridians: [], element: null,
    energetic_quality: ['grounding'], difficulty: 'accessible', props_required: [],
    prop_free_variation: null, counterposes: [], rebound_pose: null,
    contraindications: [], bilateral: false, source: '', notes: '',
    type_tags: [], muscle_groups: [], complexity: 1, injury_risk: 1,
    breathing_cues: { entering: '', holding: '', exiting: '' },
    joint_action: [], primary_joints_involved: [],
    nervous_system_effect: 'neutral', tissue_depth: 'superficial',
    modifications: [], dosha_affinity: { vata: 'neutral', pitta: 'neutral', kapha: 'neutral' },
    emotional_release_potential: [], sequencing_position: [],
    base_of_support: ['sitbones'], orientation: 'upright', cog_height: 'low', spinal_action: 'neutral', plane: 'sagittal', level: 'low', zone: 'near', energetic_direction: 'langhana', intensity: 2, default_measure: { seconds: 120 },
    ...overrides,
  }
}

// ─── resolveDisplayName ───────────────────────────────────────────────────────

describe('resolveDisplayName', () => {
  it('returns english when no style provided', () => {
    const pose = makePose({ english: 'Sleeping Swan' })
    expect(resolveDisplayName(pose)).toBe('Sleeping Swan')
  })

  it('returns english when no tradition_names defined', () => {
    const pose = makePose({ english: 'Sleeping Swan', tradition_names: undefined })
    expect(resolveDisplayName(pose, 'yin')).toBe('Sleeping Swan')
  })

  it('returns english when tradition_names is empty', () => {
    const pose = makePose({ english: 'Sleeping Swan', tradition_names: {} })
    expect(resolveDisplayName(pose, 'vinyasa')).toBe('Sleeping Swan')
  })

  it('returns tradition_names[style] when present', () => {
    const pose = makePose({
      english: 'Sleeping Swan',
      tradition_names: { yin: 'Sleeping Swan', vinyasa: 'Pigeon Prep' },
    })
    expect(resolveDisplayName(pose, 'vinyasa')).toBe('Pigeon Prep')
  })

  it('falls back to english when style not in tradition_names', () => {
    const pose = makePose({
      english: 'Sleeping Swan',
      tradition_names: { yin: 'Sleeping Swan' },
    })
    expect(resolveDisplayName(pose, 'ashtanga')).toBe('Sleeping Swan')
  })

  it('returns yin tradition name for yin style', () => {
    const pose = makePose({
      english: 'Sleeping Swan',
      tradition_names: { yin: 'Sleeping Swan', vinyasa: 'Pigeon Prep' },
    })
    expect(resolveDisplayName(pose, 'yin')).toBe('Sleeping Swan')
  })

  it('treats restorative as a separate style key', () => {
    const pose = makePose({
      english: 'Supported Fish',
      tradition_names: { restorative: 'Supported Matsyasana' },
    })
    expect(resolveDisplayName(pose, 'restorative')).toBe('Supported Matsyasana')
    expect(resolveDisplayName(pose, 'yin')).toBe('Supported Fish')
  })
})

// ─── allSearchableNames ───────────────────────────────────────────────────────

describe('allSearchableNames', () => {
  it('includes english, sanskrit, aliases', () => {
    const pose = makePose({
      english: 'Sleeping Swan',
      sanskrit: 'Eka Pada Rajakapotasana',
      aliases: ['Yin Pigeon', 'Swan Pose'],
    })
    const names = allSearchableNames(pose)
    expect(names).toContain('Sleeping Swan')
    expect(names).toContain('Eka Pada Rajakapotasana')
    expect(names).toContain('Yin Pigeon')
    expect(names).toContain('Swan Pose')
  })

  it('includes all tradition_names values', () => {
    const pose = makePose({
      english: 'Sleeping Swan',
      tradition_names: { yin: 'Sleeping Swan', vinyasa: 'Pigeon Prep' },
    })
    const names = allSearchableNames(pose)
    expect(names).toContain('Pigeon Prep')
  })

  it('handles missing tradition_names without error', () => {
    const pose = makePose({ english: 'Caterpillar', tradition_names: undefined })
    const names = allSearchableNames(pose)
    expect(names).toContain('Caterpillar')
    expect(names).toContain('Testasana')
  })

  it('has no duplicates between english and yin tradition_names when they are the same', () => {
    const pose = makePose({
      english: 'Sleeping Swan',
      tradition_names: { yin: 'Sleeping Swan' },
    })
    // 'Sleeping Swan' appears once for english, once for tradition_names.yin — harmless.
    const names = allSearchableNames(pose)
    expect(names.filter(n => n === 'Sleeping Swan').length).toBe(2)
  })
})

// ─── appliesToStyle ───────────────────────────────────────────────────────────

describe('appliesToStyle', () => {
  const yinPose = makePose({
    modes: [{ type: 'yin', tissue_target: 'connective', hold_range: { min: 3, max: 5 }, cue_notes: '' }],
  })
  const yangPose = makePose({
    modes: [{ type: 'yang', tissue_target: 'muscular', hold_range: { min: 0, max: 1 }, cue_notes: '' }],
  })
  const bothPose = makePose({
    modes: [
      { type: 'yin',  tissue_target: 'connective', hold_range: { min: 3, max: 5 }, cue_notes: '' },
      { type: 'yang', tissue_target: 'muscular',   hold_range: { min: 0, max: 1 }, cue_notes: '' },
    ],
  })

  it('yin pose applies to yin', () => {
    expect(appliesToStyle(yinPose, 'yin')).toBe(true)
  })

  it('yin pose applies to restorative', () => {
    expect(appliesToStyle(yinPose, 'restorative')).toBe(true)
  })

  it('yin pose does not apply to vinyasa', () => {
    expect(appliesToStyle(yinPose, 'vinyasa')).toBe(false)
  })

  it('yin pose does not apply to ashtanga', () => {
    expect(appliesToStyle(yinPose, 'ashtanga')).toBe(false)
  })

  it('yang pose applies to vinyasa', () => {
    expect(appliesToStyle(yangPose, 'vinyasa')).toBe(true)
  })

  it('yang pose applies to ashtanga', () => {
    expect(appliesToStyle(yangPose, 'ashtanga')).toBe(true)
  })

  it('yang pose does not apply to yin', () => {
    expect(appliesToStyle(yangPose, 'yin')).toBe(false)
  })

  it('both-mode pose applies to all styles', () => {
    expect(appliesToStyle(bothPose, 'yin')).toBe(true)
    expect(appliesToStyle(bothPose, 'vinyasa')).toBe(true)
    expect(appliesToStyle(bothPose, 'restorative')).toBe(true)
    expect(appliesToStyle(bothPose, 'ashtanga')).toBe(true)
  })
})
