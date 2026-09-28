import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import PosesClient from '@/app/poses/PosesClient'
import type { Pose } from '@/lib/pose-types'

// 003 US5 (T060/T061): the theme browser groups on data/schemas/theme-taxonomy.json
// slugs (already canonical in data/poses/*.json after T059's patch) and renders the
// taxonomy's label + subhead, replacing the old raw-string/slugifyEmotion grouping.

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

const POSES: Pose[] = [
  makePose({
    slug: 'pose-a',
    english: 'Pose A',
    emotional_release_potential: [{ emotion: 'grief', tcm_organ: 'lung' }],
  }),
  makePose({
    slug: 'pose-b',
    english: 'Pose B',
    emotional_release_potential: [{ emotion: 'fear', tcm_organ: 'kidney' }],
  }),
]

describe('theme browser grouping (FR-027, FR-030)', () => {
  it('groups by the canonical taxonomy slug and renders its label + subhead', async () => {
    const user = userEvent.setup()
    render(<PosesClient poses={POSES} />)

    await user.click(screen.getByTestId('poses-view-toggle-theme'))

    const griefSection = screen.getByTestId('poses-theme-section-grief')
    expect(griefSection).toHaveTextContent('Grief')
    expect(griefSection).toHaveTextContent(
      'Poses that open the chest and ribs, where held breath tends to gather.'
    )
    expect(screen.getByTestId('poses-card-pose-a')).toBeInTheDocument()

    const fearSection = screen.getByTestId('poses-theme-section-fear')
    expect(fearSection).toHaveTextContent('Fear')
    expect(screen.getByTestId('poses-card-pose-b')).toBeInTheDocument()
  })

  it('shows the empty-state message when no pose carries a theme', async () => {
    const user = userEvent.setup()
    render(<PosesClient poses={[makePose({ slug: 'pose-c', english: 'Pose C' })]} />)

    await user.click(screen.getByTestId('poses-view-toggle-theme'))

    expect(screen.getByText('No poses tagged with an emotional theme yet.')).toBeInTheDocument()
  })
})
