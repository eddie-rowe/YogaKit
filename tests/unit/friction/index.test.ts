import { describe, it, expect } from 'vitest'
import { friction, tierFor, buildFrictionMatrix, WEIGHTS } from '@/lib/friction'
import type { Pose } from '@/lib/pipeline/types'

function makePose(overrides: Partial<Pose> = {}): Pose {
  return {
    slug: 'test-pose',
    sanskrit: 'Test',
    english: 'Test Pose',
    aliases: [],
    modes: [],
    body_position: 'seated',
    energetic_quality: ['calming'],
    difficulty: 'accessible',
    complexity: 3,
    breathing_cues: { entering: '', holding: '', exiting: '' },
    bilateral: false,
    contraindications: [],
    props_required: [],
    prop_free_variation: null,
    source: 'test',
    base_of_support: ['sitbones'],
    orientation: 'upright',
    cog_height: 'low',
    spinal_action: 'neutral',
    plane: 'sagittal',
    level: 'low',
    zone: 'near',
    energetic_direction: 'langhana',
    intensity: 2,
    default_measure: { seconds: 60 },
    ...overrides,
  }
}

describe('friction()', () => {
  it('scores identical poses as 0 with no reasons', () => {
    const pose = makePose()
    const result = friction(pose, { ...pose })
    expect(result.score).toBe(0)
    expect(result.tier).toBe(1)
    expect(result.reasons).toEqual([])
  })

  it('scores maximally disjoint poses as 1 with all five reasons', () => {
    const from = makePose({
      slug: 'from-pose',
      english: 'From Pose',
      base_of_support: ['hands', 'feet'],
      orientation: 'prone',
      level: 'low',
      cog_height: 'floor',
      spinal_action: 'flexion',
      plane: 'sagittal',
    })
    const to = makePose({
      slug: 'to-pose',
      english: 'To Pose',
      base_of_support: ['sitbones', 'shoulders'],
      orientation: 'inverted',
      level: 'high',
      cog_height: 'high',
      spinal_action: 'extension',
      plane: 'coronal',
    })
    const result = friction(from, to)
    expect(result.score).toBe(1)
    expect(result.tier).toBe(3)
    expect(result.reasons).toHaveLength(5)
    expect(result.reasons[0]).toContain('share no contact points')
    expect(result.reasons[1]).toContain('flips from prone to inverted')
    expect(result.reasons[2]).toContain('center of gravity moves from floor to high')
    expect(result.reasons[3]).toContain('spine shifts from flexion to extension')
    expect(result.reasons[4]).toContain('changes plane from sagittal to coronal')
  })

  it('names shared contact points when the intersection is non-empty', () => {
    const from = makePose({ base_of_support: ['hands', 'feet'] })
    const to = makePose({ base_of_support: ['feet', 'knees'] })
    const result = friction(from, to)
    expect(result.reasons[0]).toContain('feet stay planted')
  })

  it('best-effort scores a pose missing Tier-1 geometry fields without throwing', () => {
    const from = makePose()
    const to = makePose({
      base_of_support: [],
      orientation: undefined as unknown as Pose['orientation'],
      cog_height: undefined as unknown as Pose['cog_height'],
      spinal_action: undefined as unknown as Pose['spinal_action'],
      plane: undefined as unknown as Pose['plane'],
    })
    expect(() => friction(from, to)).not.toThrow()
    const result = friction(from, to)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.reasons.length).toBeLessThan(5)
  })

  it('treats two empty base_of_support sets as zero contact delta', () => {
    const from = makePose({ base_of_support: [] })
    const to = makePose({ base_of_support: [] })
    const result = friction(from, to)
    expect(result.reasons.find(r => r.includes('contact'))).toBeUndefined()
  })

  it('treats a missing base_of_support field the same as an empty set', () => {
    const from = makePose({ base_of_support: undefined as unknown as Pose['base_of_support'] })
    const to = makePose({ base_of_support: undefined as unknown as Pose['base_of_support'] })
    const result = friction(from, to)
    expect(result.reasons.find(r => r.includes('contact'))).toBeUndefined()
  })

  it('reports a contact reason when one pose is missing base_of_support entirely', () => {
    const from = makePose({ base_of_support: undefined as unknown as Pose['base_of_support'] })
    const to = makePose({ base_of_support: ['hands'] })
    const result = friction(from, to)
    expect(result.reasons.find(r => r.includes('share no contact points'))).toBeDefined()
  })

  it('reports a contact reason when the destination pose is missing base_of_support entirely', () => {
    const from = makePose({ base_of_support: ['hands'] })
    const to = makePose({ base_of_support: undefined as unknown as Pose['base_of_support'] })
    const result = friction(from, to)
    expect(result.reasons.find(r => r.includes('share no contact points'))).toBeDefined()
  })

  it('gives zero cog delta when only one pose is missing cog_height', () => {
    const from = makePose({ cog_height: undefined as unknown as Pose['cog_height'] })
    const to = makePose({ cog_height: 'high' })
    const result = friction(from, to)
    expect(result.reasons.find(r => r.includes('center of gravity'))).toBeUndefined()
  })

  it('gives partial orientation credit when only level changes', () => {
    const from = makePose({ orientation: 'upright', level: 'low' })
    const to = makePose({ orientation: 'upright', level: 'high' })
    const result = friction(from, to)
    expect(result.reasons).toEqual(['shifts kinesphere level from low to high'])
    expect(result.score).toBeCloseTo(0.5 * WEIGHTS.orientation, 5)
  })

  it('gives partial plane credit when either pose is multi-plane', () => {
    const from = makePose({ plane: 'multi' })
    const to = makePose({ plane: 'sagittal' })
    const result = friction(from, to)
    expect(result.reasons.find(r => r.includes('changes plane'))).toBeDefined()
    expect(result.score).toBeCloseTo(0.5 * WEIGHTS.plane, 5)
  })

  it('friction score is symmetric regardless of direction', () => {
    const a = makePose({ base_of_support: ['hands'], orientation: 'prone', cog_height: 'floor' })
    const b = makePose({ base_of_support: ['sitbones'], orientation: 'upright', cog_height: 'high' })
    expect(friction(a, b).score).toBeCloseTo(friction(b, a).score, 10)
  })
})

describe('tierFor()', () => {
  it('returns tier 1 for scores below 0.34', () => {
    expect(tierFor(0)).toBe(1)
    expect(tierFor(0.33)).toBe(1)
  })

  it('returns tier 2 for scores in [0.34, 0.67)', () => {
    expect(tierFor(0.34)).toBe(2)
    expect(tierFor(0.66)).toBe(2)
  })

  it('returns tier 3 for scores at or above 0.67', () => {
    expect(tierFor(0.67)).toBe(3)
    expect(tierFor(1)).toBe(3)
  })
})

describe('buildFrictionMatrix()', () => {
  it('precomputes friction for every ordered pair, including self-pairs', () => {
    const a = makePose({ slug: 'a', english: 'A' })
    const b = makePose({ slug: 'b', english: 'B', orientation: 'prone' })
    const matrix = buildFrictionMatrix([a, b])
    expect(matrix.a.a.score).toBe(0)
    expect(matrix.a.b.score).toBe(matrix.b.a.score)
    expect(Object.keys(matrix)).toEqual(['a', 'b'])
  })
})
