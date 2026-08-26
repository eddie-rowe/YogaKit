import { describe, it, expect } from 'vitest'
import { validateLite } from '@/lib/validator/lite'
import type { Flow, FlowItem } from '@/lib/flow/types'
import type { Pose } from '@/lib/pose-types'

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

function makeItem(overrides: Partial<FlowItem> = {}): FlowItem {
  return {
    id: 'item-1',
    poseSlug: 'test-pose',
    mode: 'yin',
    measure: { seconds: 60 },
    phaseId: null,
    order: 0,
    ...overrides,
  }
}

function makeFlow(items: FlowItem[]): Flow {
  return {
    id: 'flow-1',
    title: 'Test Flow',
    items,
    phases: [],
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
    isBuiltIn: false,
    schema_version: '0.1.0',
  }
}

describe('validateLite()', () => {
  it('returns no warnings for a flow closing on a stillness pose with no bilateral poses', () => {
    const savasana = makePose({ slug: 'savasana', english: 'Savasana', bilateral: false })
    const flow = makeFlow([makeItem({ id: 'a', poseSlug: 'savasana', order: 0 })])
    expect(validateLite(flow, [savasana])).toEqual([])
  })

  it('flags a bilateral pose that appears an odd number of times', () => {
    const dragon = makePose({ slug: 'dragon-low-lunge', english: 'Dragon', bilateral: true })
    const savasana = makePose({ slug: 'savasana', english: 'Savasana' })
    const flow = makeFlow([
      makeItem({ id: 'a', poseSlug: 'dragon-low-lunge', order: 0 }),
      makeItem({ id: 'b', poseSlug: 'savasana', order: 1 }),
    ])
    const warnings = validateLite(flow, [dragon, savasana])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].code).toBe('laterality')
    expect(warnings[0].itemId).toBe('a')
  })

  it('does not flag a bilateral pose that appears an even number of times', () => {
    const dragon = makePose({ slug: 'dragon-low-lunge', english: 'Dragon', bilateral: true })
    const savasana = makePose({ slug: 'savasana', english: 'Savasana' })
    const flow = makeFlow([
      makeItem({ id: 'a', poseSlug: 'dragon-low-lunge', order: 0 }),
      makeItem({ id: 'b', poseSlug: 'dragon-low-lunge', order: 1 }),
      makeItem({ id: 'c', poseSlug: 'savasana', order: 2 }),
    ])
    expect(validateLite(flow, [dragon, savasana])).toEqual([])
  })

  it('only surfaces one laterality warning per pose slug, not per occurrence', () => {
    const dragon = makePose({ slug: 'dragon-low-lunge', english: 'Dragon', bilateral: true })
    const savasana = makePose({ slug: 'savasana', english: 'Savasana' })
    const flow = makeFlow([
      makeItem({ id: 'a', poseSlug: 'dragon-low-lunge', order: 0 }),
      makeItem({ id: 'b', poseSlug: 'dragon-low-lunge', order: 1 }),
      makeItem({ id: 'c', poseSlug: 'dragon-low-lunge', order: 2 }),
      makeItem({ id: 'd', poseSlug: 'savasana', order: 3 }),
    ])
    const warnings = validateLite(flow, [dragon, savasana])
    expect(warnings.filter(w => w.code === 'laterality')).toHaveLength(1)
  })

  it('flags a flow that does not close on a stillness pose', () => {
    const mountain = makePose({ slug: 'mountain', english: 'Mountain' })
    const flow = makeFlow([makeItem({ id: 'a', poseSlug: 'mountain', order: 0 })])
    const warnings = validateLite(flow, [mountain])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].code).toBe('closing-stillness')
    expect(warnings[0].itemId).toBe('a')
  })

  it('ignores items referencing a pose slug missing from the library', () => {
    const flow = makeFlow([makeItem({ id: 'a', poseSlug: 'unknown-pose', order: 0 })])
    const warnings = validateLite(flow, [])
    // unknown last item is not a stillness node -> closing-stillness still fires
    expect(warnings).toHaveLength(1)
    expect(warnings[0].code).toBe('closing-stillness')
  })

  it('returns no warnings for an empty flow', () => {
    const flow = makeFlow([])
    expect(validateLite(flow, [])).toEqual([])
  })

  it('evaluates closing pose by order, not array position', () => {
    const savasana = makePose({ slug: 'savasana', english: 'Savasana' })
    const mountain = makePose({ slug: 'mountain', english: 'Mountain' })
    const flow = makeFlow([
      makeItem({ id: 'b', poseSlug: 'mountain', order: 1 }),
      makeItem({ id: 'a', poseSlug: 'savasana', order: 0 }),
    ])
    const warnings = validateLite(flow, [savasana, mountain])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].itemId).toBe('b')
  })
})
