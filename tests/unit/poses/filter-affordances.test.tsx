import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import PosesClient from '@/app/poses/PosesClient'
import type { Pose } from '@/lib/pose-types'

/**
 * 003 US4 — additional mechanized coverage for T048/T049/T052/T053, beyond the three
 * tests the issue mandates (T054-T056, in score-explanation.test.tsx and
 * filter-chip-touch-target.test.tsx). Not itself a required gate, but SC-008's
 * acceptance criterion ("hold mechanically, not by inspection") is cheap to keep honest
 * here too.
 */

function makePose(overrides: Partial<Pose> = {}): Pose {
  return {
    slug: 'test-pose', sanskrit: 'Testasana', english: 'Test Pose', aliases: [],
    modes: [{ type: 'yin', tissue_target: 'connective', hold_range: { min: 3, max: 5 }, cue_notes: '' }],
    body_position: 'supine', meridians: [], element: null,
    energetic_quality: ['grounding'], difficulty: 'accessible', props_required: [],
    prop_free_variation: null, counterposes: [], rebound_pose: null,
    contraindications: [], bilateral: false, source: '', notes: '',
    type_tags: ['twist', 'backbend'], muscle_groups: ['psoas', 'hamstrings'], complexity: 3, injury_risk: 2,
    breathing_cues: { entering: '', holding: '', exiting: '' },
    joint_action: [], primary_joints_involved: [],
    nervous_system_effect: 'neutral', tissue_depth: 'superficial',
    modifications: [], dosha_affinity: { vata: 'neutral', pitta: 'neutral', kapha: 'neutral' },
    emotional_release_potential: [], sequencing_position: [],
    base_of_support: ['sitbones'], orientation: 'upright', cog_height: 'low',
    spinal_action: 'neutral', plane: 'sagittal', level: 'low', zone: 'near',
    energetic_direction: 'langhana', intensity: 2, default_measure: { seconds: 120 },
    ...overrides,
  }
}

describe('multi-select affordance, inactive (FR-020, SC-008)', () => {
  it('marks every multi-select chip group with data-multiselect="true", and every single-select group with "false" — before anything is selected', async () => {
    const user = userEvent.setup()
    render(<PosesClient poses={[makePose({ slug: 'a' }), makePose({ slug: 'b', body_position: 'seated' })]} />)
    await user.click(screen.getByRole('button', { name: /advanced filters/i }))

    for (const testId of ['poses-category-filter', 'poses-element-filter', 'poses-ns-filter', 'poses-seq-filter']) {
      const buttons = within(screen.getByTestId(testId)).getAllByRole('button')
      for (const b of buttons) expect(b).toHaveAttribute('data-multiselect', 'false')
    }
    for (const testId of ['poses-type-tag-filter', 'poses-muscle-group-filter']) {
      const buttons = within(screen.getByTestId(testId)).getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      for (const b of buttons) expect(b).toHaveAttribute('data-multiselect', 'true')
    }
  })

  it('renders a checkbox glyph on a multi-select chip while it is still inactive (no selection made)', async () => {
    const user = userEvent.setup()
    render(<PosesClient poses={[makePose({ slug: 'a' })]} />)
    await user.click(screen.getByRole('button', { name: /advanced filters/i }))

    const twistChip = within(screen.getByTestId('poses-type-tag-filter')).getByRole('button', { name: /twist/i })
    expect(twistChip).toHaveAttribute('data-active', 'false')
    expect(twistChip.querySelector('svg')).toBeInTheDocument()
  })
})

describe('multi-select combines rather than replaces (FR-021, T049)', () => {
  it('narrows to poses matching both selected type tags, not either alone', async () => {
    const user = userEvent.setup()
    const twistOnly = makePose({ slug: 'twist-only', type_tags: ['twist'] })
    const backbendOnly = makePose({ slug: 'backbend-only', type_tags: ['backbend'] })
    const both = makePose({ slug: 'both', type_tags: ['twist', 'backbend'] })
    render(<PosesClient poses={[twistOnly, backbendOnly, both]} />)

    await user.click(screen.getByRole('button', { name: /advanced filters/i }))
    await user.click(within(screen.getByTestId('poses-type-tag-filter')).getByRole('button', { name: /^twist$/i }))

    expect(screen.getByTestId('poses-card-twist-only')).toBeInTheDocument()
    expect(screen.getByTestId('poses-card-both')).toBeInTheDocument()
    expect(screen.queryByTestId('poses-card-backbend-only')).not.toBeInTheDocument()

    await user.click(within(screen.getByTestId('poses-type-tag-filter')).getByRole('button', { name: /^backbend$/i }))

    // Combined: only the pose carrying both tags remains — a replace would instead have
    // swapped the result set to backbend-only poses.
    expect(screen.getByTestId('poses-card-both')).toBeInTheDocument()
    expect(screen.queryByTestId('poses-card-twist-only')).not.toBeInTheDocument()
    expect(screen.queryByTestId('poses-card-backbend-only')).not.toBeInTheDocument()
  })
})

describe('zero-result state names its constraints (FR-024)', () => {
  it('lists the active filters when a combination matches nothing', async () => {
    const user = userEvent.setup()
    render(<PosesClient poses={[makePose({ slug: 'only-one', body_position: 'supine', element: 'fire' })]} />)

    await user.click(within(screen.getByTestId('poses-category-filter')).getByRole('button', { name: /^seated$/i }))

    const zero = screen.getByTestId('poses-zero-results')
    expect(zero).toBeInTheDocument()
    const constraints = within(zero).getByTestId('poses-zero-results-constraints')
    expect(constraints).toHaveTextContent(/Position: seated/i)
  })
})

describe('clear-all is reachable from the top level regardless of the Advanced panel (FR-025, T053)', () => {
  it('appears once a filter is active, with the Advanced panel closed', async () => {
    const user = userEvent.setup()
    render(<PosesClient poses={[makePose({ slug: 'a' })]} />)

    expect(screen.queryByTestId('poses-clear-all-filters')).not.toBeInTheDocument()
    await user.click(within(screen.getByTestId('poses-category-filter')).getByRole('button', { name: /^seated$/i }))

    expect(screen.getByTestId('poses-clear-all-filters')).toBeInTheDocument()
    // The Advanced panel was never opened in this test.
    expect(screen.queryByRole('button', { name: /advanced filters \(active\)/i })).not.toBeInTheDocument()
  })
})
