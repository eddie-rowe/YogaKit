import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import PoseCard from '@/app/poses/PoseCard'
import type { Pose } from '@/lib/pose-types'

/**
 * 003 US4 — T054 (SC-009 mechanized) and T055 (contract rule 1, copy).
 *
 * Contract: specs/003-pose-library/contracts/score-explanation.md. `complexity` and
 * `injury_risk` are hand-authored integers (data/schemas/pose.schema.json) — the friction
 * engine never reads either field, so this explanation must never claim a computation.
 */

function makePose(overrides: Partial<Pose> = {}): Pose {
  return {
    slug: 'test-pose', sanskrit: 'Testasana', english: 'Test Pose', aliases: [],
    modes: [{ type: 'yin', tissue_target: 'connective', hold_range: { min: 3, max: 5 }, cue_notes: '' }],
    body_position: 'supine', meridians: [], element: null,
    energetic_quality: ['grounding'], difficulty: 'accessible', props_required: [],
    prop_free_variation: null, counterposes: [], rebound_pose: null,
    contraindications: [], bilateral: false, source: 'Traditional hatha/vinyasa yoga', notes: '',
    type_tags: [], muscle_groups: [], complexity: 6, injury_risk: 4,
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

describe('catalog score nodes carry an in-place explanation (FR-022, T050, SC-009)', () => {
  it('gives every rendered score value node an adjacent explanation trigger', () => {
    const pose = makePose({ slug: 'malasana', complexity: 6, injury_risk: 4 })
    render(<PoseCard pose={pose} onOpen={() => {}} />)

    // Mechanized SC-009: derive the set of rendered score nodes from the DOM itself
    // rather than hand-listing 'complexity' and 'injury_risk', so a third score field
    // added later stays covered by this same assertion without editing the test.
    const scoreNodes = screen.getAllByTestId(/^poses-score-value-/)
    expect(scoreNodes.length).toBeGreaterThan(0)

    for (const node of scoreNodes) {
      const testid = node.getAttribute('data-testid')!
      const field = testid.replace('poses-score-value-', '').replace(new RegExp(`-${pose.slug}$`), '')
      expect(
        screen.getByTestId(`poses-score-trigger-${field}-${pose.slug}`),
        `expected a trigger adjacent to ${testid}`,
      ).toBeInTheDocument()
    }
  })

  it('renders complexity unconditionally (Tier-1) but omits injury_risk when null (Tier-2 guard)', () => {
    const pose = makePose({ slug: 'savasana', injury_risk: undefined })
    render(<PoseCard pose={pose} onOpen={() => {}} />)

    expect(screen.getByTestId(`poses-score-value-complexity-${pose.slug}`)).toBeInTheDocument()
    expect(screen.getByTestId(`poses-score-trigger-complexity-${pose.slug}`)).toBeInTheDocument()
    expect(screen.queryByTestId(`poses-score-value-injury_risk-${pose.slug}`)).not.toBeInTheDocument()
    expect(screen.queryByTestId(`poses-score-trigger-injury_risk-${pose.slug}`)).not.toBeInTheDocument()
  })

  it('opens the explanation in place, with no navigation and no opening of the pose overlay', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    const pose = makePose({ slug: 'malasana' })
    render(<PoseCard pose={pose} onOpen={onOpen} />)

    expect(screen.queryByTestId(`poses-score-explanation-complexity-${pose.slug}`)).not.toBeInTheDocument()

    await user.click(screen.getByTestId(`poses-score-trigger-complexity-${pose.slug}`))

    expect(screen.getByTestId(`poses-score-explanation-complexity-${pose.slug}`)).toBeInTheDocument()
    // The trigger sits beside the card's own open-detail control; clicking it must not
    // also open the full pose overlay (no navigation away from the catalog).
    expect(onOpen).not.toHaveBeenCalled()
  })
})

describe('score-explanation copy never claims a computation (FR-023, contract rule 1)', () => {
  // The contract's own compliant copy explicitly *denies* these words ("not calculated",
  // "not derived from the sequencing engine") — so the check has to catch an affirmative
  // claim, not the literal substring, the same nuance VOICE-REST-LAPSE already handles for
  // the copy-lint's rest/lapse co-occurrence rule.
  const BANNED = ['calculated', 'derived', 'computed', 'the engine']

  function unhedgedViolations(text: string): string[] {
    const lower = text.toLowerCase()
    const found: string[] = []
    for (const term of BANNED) {
      let from = 0
      let idx: number
      while ((idx = lower.indexOf(term, from)) !== -1) {
        const before = lower.slice(Math.max(0, idx - 4), idx).trim()
        if (before !== 'not') found.push(`${term} (unhedged)`)
        from = idx + term.length
      }
    }
    return found
  }

  it('never makes an unhedged computation claim in the complexity explanation', async () => {
    const user = userEvent.setup()
    const pose = makePose({ slug: 'malasana' })
    render(<PoseCard pose={pose} onOpen={() => {}} />)

    await user.click(screen.getByTestId(`poses-score-trigger-complexity-${pose.slug}`))
    const text = screen.getByTestId(`poses-score-explanation-complexity-${pose.slug}`).textContent ?? ''

    expect(unhedgedViolations(text)).toEqual([])
  })

  it('never makes an unhedged computation claim in the injury-risk explanation', async () => {
    const user = userEvent.setup()
    const pose = makePose({ slug: 'malasana' })
    render(<PoseCard pose={pose} onOpen={() => {}} />)

    await user.click(screen.getByTestId(`poses-score-trigger-injury_risk-${pose.slug}`))
    const text = screen.getByTestId(`poses-score-explanation-injury_risk-${pose.slug}`).textContent ?? ''

    expect(unhedgedViolations(text)).toEqual([])
  })

  it('never exposes a weighting constant or percentage as copy', async () => {
    const user = userEvent.setup()
    const pose = makePose({ slug: 'malasana' })
    render(<PoseCard pose={pose} onOpen={() => {}} />)

    await user.click(screen.getByTestId(`poses-score-trigger-complexity-${pose.slug}`))
    const text = screen.getByTestId(`poses-score-explanation-complexity-${pose.slug}`).textContent ?? ''

    expect(text).not.toMatch(/\d+\s*%/)
    expect(text).not.toMatch(/\bweight(ing)?\b/i)
  })

  it('names the pose source as lineage, not as attribution for the number itself', async () => {
    const user = userEvent.setup()
    const pose = makePose({ slug: 'malasana', source: 'Traditional hatha/vinyasa yoga' })
    render(<PoseCard pose={pose} onOpen={() => {}} />)

    await user.click(screen.getByTestId(`poses-score-trigger-complexity-${pose.slug}`))
    const text = screen.getByTestId(`poses-score-explanation-complexity-${pose.slug}`).textContent ?? ''

    expect(text).toContain('Traditional hatha/vinyasa yoga')
  })
})
