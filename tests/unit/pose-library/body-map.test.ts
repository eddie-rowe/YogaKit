import { describe, it, expect } from 'vitest'

import {
  MUSCLE_REGION_MAP,
  REGION_TO_MUSCLES,
  JOINT_DOT_MAP,
  MERIDIAN_PATH_MAP,
  CHAKRA_DOTS,
  getActiveJointIds,
  getLegendEntries,
  resolveSelection,
} from '@/lib/pose-library/body-map'
import { MUSCLE_PATHS } from '@/components/poses/BodySvg'
import type { MuscleGroup, JointName } from '@/lib/pose-types'

describe('REGION_TO_MUSCLES (FR-014, SC-004)', () => {
  it('inverts MUSCLE_REGION_MAP losslessly', () => {
    // Every (muscle, region) pair in the forward map appears in the inverse, and the
    // inverse invents nothing. Derived rather than hand-written, so this is really a
    // test that the derivation is the inverse and not merely a map of similar size.
    for (const [muscle, regions] of Object.entries(MUSCLE_REGION_MAP)) {
      for (const region of regions) {
        expect(REGION_TO_MUSCLES.get(region.id)).toContain(muscle)
      }
    }

    const forwardPairs = Object.entries(MUSCLE_REGION_MAP).flatMap(([muscle, regions]) =>
      regions.map(region => `${muscle}→${region.id}`)
    )
    const inversePairs = [...REGION_TO_MUSCLES.entries()].flatMap(([regionId, muscles]) =>
      muscles.map(muscle => `${muscle}→${regionId}`)
    )
    expect(inversePairs.sort()).toEqual(forwardPairs.sort())
  })

  it('carries both muscles that reach region-psoas', () => {
    // The named many-to-many case from the plan. `hip-flexors` is a colloquial group that
    // overlaps two anatomical ones, so tapping the shape has two true answers.
    expect(REGION_TO_MUSCLES.get('region-psoas')).toEqual(
      expect.arrayContaining(['psoas', 'hip-flexors'])
    )
    expect(REGION_TO_MUSCLES.get('region-iliacus-l')).toEqual(
      expect.arrayContaining(['iliacus', 'hip-flexors'])
    )
  })

  it('has a drawable path for every mapped region, and a map entry for every path', () => {
    // The assertion that fails the day someone adds a region path with no map entry.
    const mapped = [...REGION_TO_MUSCLES.keys()].sort()
    const drawn = Object.keys(MUSCLE_PATHS).sort()
    expect(mapped.filter(id => !drawn.includes(id))).toEqual([])
    expect(drawn.filter(id => !mapped.includes(id))).toEqual([])
  })
})

describe('getActiveJointIds (FR-013)', () => {
  it('returns distinct ids for a bilateral pair', () => {
    const bilateral = (Object.entries(JOINT_DOT_MAP) as [JointName, typeof JOINT_DOT_MAP[JointName]][])
      .find(([, dot]) => dot.bilateral && dot.view !== 'back')
    expect(bilateral).toBeDefined()
    const [joint, dot] = bilateral!

    const dots = getActiveJointIds([joint], dot.view === 'both' ? 'front' : dot.view, true)
    expect(dots).toHaveLength(2)
    expect(new Set(dots.map(d => d.id)).size).toBe(2)
    // Both dots are the same joint, so both answer to one legend chip.
    expect(new Set(dots.map(d => d.key))).toEqual(new Set([`joint-${joint}`]))
    expect(dots.map(d => d.cx)).toEqual([dot.cx, 200 - dot.cx])
  })

  it('drops the mirror when bilateral rendering is off', () => {
    const dots = getActiveJointIds(['hip'], 'front', false)
    expect(dots).toHaveLength(1)
    expect(dots[0].joint).toBe('hip')
  })

  it('skips joints that do not live in the requested view, and unknown joints', () => {
    const backOnly = (Object.entries(JOINT_DOT_MAP) as [JointName, typeof JOINT_DOT_MAP[JointName]][])
      .find(([, dot]) => dot.view === 'back')
    if (backOnly) {
      expect(getActiveJointIds([backOnly[0]], 'front', true)).toEqual([])
    }
    expect(getActiveJointIds(['not-a-joint' as JointName], 'front', true)).toEqual([])
  })
})

describe('getLegendEntries (FR-014, the view-scoping trap)', () => {
  it('scopes a back-only muscle to the back view', () => {
    // The trap: tapping `hamstrings` from the front view must have somewhere to switch to.
    const [entry] = getLegendEntries('muscles', ['hamstrings'])
    expect(entry.primaryView).toBe('back')
    expect(entry.regionIds).toEqual(MUSCLE_REGION_MAP.hamstrings.map(r => r.id))
  })

  it('marks a muscle spanning both views as needing no switch', () => {
    const spanning = (Object.entries(MUSCLE_REGION_MAP) as [MuscleGroup, typeof MUSCLE_REGION_MAP[MuscleGroup]][])
      .find(([, regions]) => new Set(regions.map(r => r.view)).size > 1)
    if (spanning) {
      expect(getLegendEntries('muscles', [spanning[0]])[0].primaryView).toBe('both')
    }
    // A muscle with no map entry highlights nothing and claims no view.
    const orphan = getLegendEntries('muscles', ['not-a-muscle'])[0]
    expect(orphan.regionIds).toEqual([])
    expect(orphan.primaryView).toBe('both')
  })

  it('gives every category a key that matches what the SVG draws', () => {
    const meridian = Object.keys(MERIDIAN_PATH_MAP)[0]
    expect(getLegendEntries('meridians', [meridian])[0].regionIds).toEqual([`meridian-${meridian}`])
    // Labels are read, not slugs: 'large-intestine' is not a heading.
    expect(getLegendEntries('meridians', ['large-intestine'])[0].label).toBe('large intestine')
    expect(getLegendEntries('meridians', ['not-a-meridian'])[0].primaryView).toBe('both')

    expect(getLegendEntries('joints', ['hip'])[0].regionIds).toEqual(['joint-hip', 'joint-hip-mirror'])
    expect(getLegendEntries('joints', ['hip'])[0].key).toBe('joint-hip')
    expect(getLegendEntries('joints', ['not-a-joint'])[0].primaryView).toBe('both')

    const chakra = CHAKRA_DOTS[0]
    const [chakraEntry] = getLegendEntries('chakras', [chakra.name])
    expect(chakraEntry.regionIds).toEqual([`chakra-${chakra.name}`])
    expect(chakraEntry.label).toBe(chakra.english)
    // Chakras sit on the midline and are drawn either way.
    expect(chakraEntry.primaryView).toBe('both')
    expect(getLegendEntries('chakras', ['not-a-chakra'])[0].label).toBe('not-a-chakra')
  })
})

describe('resolveSelection (FR-014 — "without appearing to select the wrong thing")', () => {
  const entries = getLegendEntries('muscles', ['psoas', 'hip-flexors', 'hamstrings'])

  it('lights one chip and its regions from a legend tap', () => {
    const { regionIds, keys } = resolveSelection({ source: 'legend', key: 'hip-flexors' }, entries)
    expect(keys).toEqual(new Set(['hip-flexors']))
    // psoas + both iliacus — the plan's manual check #4.
    expect(regionIds.size).toBe(3)
    expect(regionIds.has('region-psoas')).toBe(true)
  })

  it('lights every chip that reaches a tapped region', () => {
    const { regionIds, keys } = resolveSelection({ source: 'region', key: 'region-psoas' }, entries)
    expect(regionIds).toEqual(new Set(['region-psoas']))
    expect(keys).toEqual(new Set(['psoas', 'hip-flexors']))
  })

  it('resolves nothing for no selection, an unknown chip, or an unmapped region', () => {
    expect(resolveSelection(null, entries)).toEqual({ regionIds: new Set(), keys: new Set() })
    expect(resolveSelection({ source: 'legend', key: 'nope' }, entries))
      .toEqual({ regionIds: new Set(), keys: new Set() })
    expect(resolveSelection({ source: 'region', key: 'region-nope' }, entries).keys.size).toBe(0)
  })
})
