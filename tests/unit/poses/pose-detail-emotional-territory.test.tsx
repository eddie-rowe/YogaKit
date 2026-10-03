import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import PoseDetailContent from '@/app/poses/PoseDetailContent'
import type { Pose } from '@/lib/pose-types'

// Regression test for a review finding on #83: the "Emotional territory" chip rendered
// the raw `emotion` slug with a CSS `capitalize` class, which only capitalizes after
// whitespace — after T059 patched data to hyphenated canonical slugs (e.g. "letting-go"),
// `capitalize` silently rendered "Letting-go" instead of the taxonomy's "Letting go".

function makePose(overrides: Partial<Pose> & { slug: string; english: string }): Pose {
  return {
    sanskrit: overrides.english,
    modes: [{ type: 'yin', tissue_target: 'connective', hold_range: { min: 1, max: 3 }, cue_notes: 'hold' }],
    body_position: 'seated',
    energetic_quality: ['calming'],
    difficulty: 'accessible',
    complexity: 1,
    breathing_cues: { entering: 'in', holding: 'hold', exiting: 'out' },
    bilateral: false,
    contraindications: [],
    props_required: [],
    prop_free_variation: null,
    source: 'test fixture',
    base_of_support: ['sitbones'],
    orientation: 'upright',
    cog_height: 'low',
    spinal_action: 'neutral',
    plane: 'sagittal',
    level: 'low',
    zone: 'near',
    energetic_direction: 'samana',
    intensity: 1,
    default_measure: { breaths: 5 },
    ...overrides,
  }
}

describe('PoseDetailContent emotional territory (FR-027)', () => {
  it('renders the taxonomy label, not a capitalize-mangled raw slug', () => {
    const pose = makePose({
      slug: 'dangling',
      english: 'Dangling',
      emotional_release_potential: [{ emotion: 'letting-go', tcm_organ: 'bladder' }],
    })
    render(
      <PoseDetailContent
        pose={pose}
        layer="expert"
        customFields={{
          breathing: true,
          chakras: true,
          dosha: true,
          emotional: true,
          modifications: true,
          'muscles-joints': true,
          'contraindications-props': true,
        }}
      />)

    expect(screen.getByText('Letting go')).toBeInTheDocument()
    expect(screen.queryByText('Letting-go')).not.toBeInTheDocument()
    expect(screen.queryByText('letting-go')).not.toBeInTheDocument()
  })
})
