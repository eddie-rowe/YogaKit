import { describe, it, expect } from 'vitest'
import type { Pose } from '@/lib/pipeline/types'
import {
  effectiveMinutes,
  computeDistribution,
  chakraDistribution,
  meridianDistribution,
  muscleDistribution,
} from '@/lib/pose-library/sequence-stats'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePose(overrides: Partial<Pose> = {}): Pose {
  return {
    slug: 'test', sanskrit: 'Test', english: 'Test Pose', aliases: [],
    modes: [], body_position: 'supine', meridians: [], element: null,
    energetic_quality: [], difficulty: 'accessible', props_required: [],
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

// ─── effectiveMinutes ─────────────────────────────────────────────────────────

describe('effectiveMinutes', () => {
  it('returns hold minutes unchanged for non-bilateral pose', () => {
    const p = makePose({ bilateral: false })
    expect(effectiveMinutes(4, p)).toBe(4)
  })

  it('doubles for bilateral pose with no explicit side', () => {
    const p = makePose({ bilateral: true })
    expect(effectiveMinutes(4, p)).toBe(8)
  })

  it('doubles when side is "both"', () => {
    const p = makePose({ bilateral: false })
    expect(effectiveMinutes(4, p, 'both')).toBe(8)
  })

  it('does not double when side is "left" or "right"', () => {
    const p = makePose({ bilateral: true })
    expect(effectiveMinutes(4, p, 'left')).toBe(4)
    expect(effectiveMinutes(4, p, 'right')).toBe(4)
  })

  it('returns hold minutes unchanged for null pose', () => {
    expect(effectiveMinutes(5, null)).toBe(5)
  })
})

// ─── computeDistribution ─────────────────────────────────────────────────────

describe('computeDistribution', () => {
  const labelFor = (k: string) => k
  const colorFor = () => '#000'

  it('returns empty array for empty poses', () => {
    expect(computeDistribution([], 'chakras', { labelFor, colorFor })).toEqual([])
  })

  it('returns empty array when poses have no values for the field', () => {
    const poses = [{ pose: makePose({ chakras: [] }), minutes: 5 }]
    expect(computeDistribution(poses, 'chakras', { labelFor, colorFor })).toEqual([])
  })

  it('skips null poses', () => {
    const poses = [{ pose: null, minutes: 5 }]
    expect(computeDistribution(poses, 'chakras', { labelFor, colorFor })).toEqual([])
  })

  it('sums minutes correctly for a single value', () => {
    const poses = [
      { pose: makePose({ chakras: ['heart'] }), minutes: 4 },
      { pose: makePose({ chakras: ['heart'] }), minutes: 3 },
    ]
    const [slice] = computeDistribution(poses, 'chakras', { labelFor, colorFor })
    expect(slice.key).toBe('heart')
    expect(slice.minutes).toBe(7)
    expect(slice.pct).toBe(100)
  })

  it('a pose with multiple chakras adds its minutes to each', () => {
    const poses = [{ pose: makePose({ chakras: ['heart', 'throat'] }), minutes: 4 }]
    const slices = computeDistribution(poses, 'chakras', { labelFor, colorFor })
    expect(slices).toHaveLength(2)
    expect(slices.every(s => s.minutes === 4)).toBe(true)
    // Both add to grand total of 8 (4+4), so each is 50%
    expect(slices.every(s => s.pct === 50)).toBe(true)
  })

  it('sorts slices descending by minutes', () => {
    const poses = [
      { pose: makePose({ chakras: ['crown'] }), minutes: 2 },
      { pose: makePose({ chakras: ['root'] }), minutes: 5 },
      { pose: makePose({ chakras: ['heart'] }), minutes: 3 },
    ]
    const slices = computeDistribution(poses, 'chakras', { labelFor, colorFor })
    expect(slices.map(s => s.key)).toEqual(['root', 'heart', 'crown'])
  })

  it('folds tail items into Other when topN is set', () => {
    const poses = [
      { pose: makePose({ chakras: ['root'] }), minutes: 5 },
      { pose: makePose({ chakras: ['sacral'] }), minutes: 4 },
      { pose: makePose({ chakras: ['heart'] }), minutes: 3 },
    ]
    const slices = computeDistribution(poses, 'chakras', { labelFor, colorFor, topN: 2 })
    expect(slices).toHaveLength(3)
    expect(slices[2].key).toBe('__other__')
    expect(slices[2].label).toBe('Other (1)')
    expect(slices[2].minutes).toBe(3)
  })

  it('percentages sum to 100 (within rounding tolerance) for simple non-overlapping case', () => {
    const poses = [
      { pose: makePose({ meridians: ['kidney'] }), minutes: 3 },
      { pose: makePose({ meridians: ['liver'] }), minutes: 1 },
    ]
    const slices = computeDistribution(poses, 'meridians', { labelFor, colorFor })
    const sum = slices.reduce((s, sl) => s + sl.pct, 0)
    expect(sum).toBeGreaterThanOrEqual(99)
    expect(sum).toBeLessThanOrEqual(101)
  })

  it('skips poses with 0 minutes', () => {
    const poses = [
      { pose: makePose({ chakras: ['root'] }), minutes: 0 },
      { pose: makePose({ chakras: ['heart'] }), minutes: 4 },
    ]
    const slices = computeDistribution(poses, 'chakras', { labelFor, colorFor })
    expect(slices).toHaveLength(1)
    expect(slices[0].key).toBe('heart')
  })
})

// ─── Pre-configured distributions ────────────────────────────────────────────

describe('chakraDistribution', () => {
  it('returns English labels for chakras', () => {
    const poses = [{ pose: makePose({ chakras: ['heart'] }), minutes: 4 }]
    const [slice] = chakraDistribution(poses)
    expect(slice.label).toBe('Heart')
    expect(slice.color).toBe('#16a34a')
  })

  it('returns Solar Plexus for solar-plexus key', () => {
    const poses = [{ pose: makePose({ chakras: ['solar-plexus'] }), minutes: 3 }]
    const [slice] = chakraDistribution(poses)
    expect(slice.label).toBe('Solar Plexus')
  })
})

describe('meridianDistribution', () => {
  it('uses element color for a known meridian', () => {
    const poses = [{ pose: makePose({ meridians: ['kidney'] }), minutes: 4 }]
    const [slice] = meridianDistribution(poses)
    expect(slice.key).toBe('kidney')
    // kidney is water element → '#60a5fa'
    expect(slice.color).toBe('#60a5fa')
  })

  it('converts slug to title case for label', () => {
    const poses = [{ pose: makePose({ meridians: ['large-intestine'] }), minutes: 4 }]
    const [slice] = meridianDistribution(poses)
    expect(slice.label).toBe('Large Intestine')
  })
})

describe('muscleDistribution', () => {
  it('shows top 8 by default and folds the rest into Other', () => {
    const muscles = [
      'psoas', 'hamstrings', 'glutes', 'quadriceps', 'hip-adductors',
      'hip-flexors', 'lumbar-spine', 'thoracic-spine', 'calves',
    ] as const
    const poses = muscles.map(m => ({
      pose: makePose({ muscle_groups: [m] }),
      minutes: 1,
    }))
    const slices = muscleDistribution(poses)
    expect(slices).toHaveLength(9) // 8 shown + Other
    expect(slices[8].key).toBe('__other__')
    expect(slices[8].label).toBe('Other (1)')
  })

  it('converts muscle slug to title case', () => {
    const poses = [{ pose: makePose({ muscle_groups: ['hip-adductors'] }), minutes: 3 }]
    const [slice] = muscleDistribution(poses)
    expect(slice.label).toBe('Hip Adductors')
  })
})
