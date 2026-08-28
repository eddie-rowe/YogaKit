import { describe, it, expect } from 'vitest'
import type { FiveElement } from '@/lib/pose-types'

// filterPoses and rankAlternatesForPose are pure-ish filter functions that call getAllPoses()
// internally. We test them against the real 43-pose dataset loaded from disk,
// which is available in test because vitest runs in Node (same cwd as project root).
import { filterPoses, rankAlternatesForPose, getAllPoses, getPoseBySlug } from '@/lib/pose-library'

describe('getAllPoses()', () => {
  it('loads at least 40 poses from the data directory', () => {
    const poses = getAllPoses()
    expect(poses.length).toBeGreaterThanOrEqual(40)
  })

  it('every pose has a slug, sanskrit, english, and at least one mode', () => {
    for (const pose of getAllPoses()) {
      expect(pose.slug).toBeTruthy()
      expect(pose.sanskrit).toBeTruthy()
      expect(pose.english).toBeTruthy()
      expect(pose.modes.length).toBeGreaterThan(0)
    }
  })
})

describe('getPoseBySlug()', () => {
  it('returns sphinx by slug', () => {
    const pose = getPoseBySlug('sphinx')
    expect(pose?.slug).toBe('sphinx')
  })

  it('returns undefined for unknown slug', () => {
    expect(getPoseBySlug('not-a-real-pose')).toBeUndefined()
  })
})

describe('filterPoses()', () => {
  it('excludes poses matching any contraindication', () => {
    const results = filterPoses({ excludeContraindications: ['hip-replacement'] })
    expect(results.every(p => !p.contraindications.includes('hip-replacement'))).toBe(true)
  })

  it('filters by body position', () => {
    const results = filterPoses({ bodyPositions: ['prone'] })
    expect(results.every(p => p.body_position === 'prone')).toBe(true)
    expect(results.length).toBeGreaterThan(0)
  })

  it('filters by meridian overlap', () => {
    const results = filterPoses({ meridians: ['gallbladder'] })
    expect(results.every(p => (p.meridians ?? []).includes('gallbladder'))).toBe(true)
    expect(results.length).toBeGreaterThan(0)
  })

  it('filters by element', () => {
    const results = filterPoses({ elements: ['wood' as FiveElement] })
    // Poses with no element pass the filter (element filter only excludes non-matching non-null)
    expect(results.every(p => p.element === 'wood' || p.element == null)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
  })

  it('filters by max difficulty — accessible only', () => {
    const results = filterPoses({ maxDifficulty: 'accessible' })
    expect(results.every(p => p.difficulty === 'accessible')).toBe(true)
  })

  it('filters by mode type — yang returns poses with yang or both modes', () => {
    const results = filterPoses({ modeType: 'yang' })
    expect(results.every(p => p.modes.some(m => m.type === 'yang' || m.type === 'both'))).toBe(true)
  })

  it('returns all poses when no filter criteria provided', () => {
    const results = filterPoses({})
    expect(results.length).toBe(getAllPoses().length)
  })

  it('can combine multiple filters', () => {
    const results = filterPoses({
      excludeContraindications: ['knee-injury'],
      bodyPositions: ['prone'],
    })
    expect(results.every(p => !p.contraindications.includes('knee-injury'))).toBe(true)
    expect(results.every(p => p.body_position === 'prone')).toBe(true)
  })
})

describe('rankAlternatesForPose()', () => {
  it('excludes the target pose from results', () => {
    const target = getPoseBySlug('sphinx')!
    const results = rankAlternatesForPose(target, ['kidney', 'bladder'], 'water', [])
    expect(results.every(p => p.slug !== 'sphinx')).toBe(true)
  })

  it('excludes explicitly provided slugs', () => {
    const target = getPoseBySlug('butterfly')!
    const results = rankAlternatesForPose(target, ['kidney'], 'water', ['sphinx', 'sleeping-swan'])
    expect(results.every(p => p.slug !== 'sphinx' && p.slug !== 'sleeping-swan')).toBe(true)
  })

  it('returns at most 3 alternates', () => {
    const target = getPoseBySlug('sphinx')!
    const results = rankAlternatesForPose(target, ['kidney'], 'water', [])
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('ranks meridian-matching poses higher', () => {
    const target = getPoseBySlug('sphinx')! // meridians: kidney, bladder (water)
    const results = rankAlternatesForPose(target, ['kidney', 'bladder'], 'water', [])
    // At least one result should share kidney or bladder
    expect(results.some(p => (p.meridians ?? []).some(m => ['kidney', 'bladder'].includes(m)))).toBe(true)
  })
})
