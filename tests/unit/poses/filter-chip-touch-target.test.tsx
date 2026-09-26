import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import PosesClient from '@/app/poses/PosesClient'
import type { Pose } from '@/lib/pose-types'

/**
 * 003 US4 — T056 (FR-026): every filter chip meets a 40px touch-target floor.
 *
 * `.kk-chip`'s own floor only applies under `@media (pointer: coarse)` (mice keep a
 * denser panel) — the design-research audit (docs/design-research/05, "quick wins")
 * flagged that the *active* branch of the element and nervous-system chips swaps the
 * `kk-chip` class out entirely for a per-tone Tailwind string, which drops the floor
 * unconditionally, active or not. FR-026 states a floor with no such carve-out, so
 * filter-value chips get their own class (`.kk-filter-chip-tap`) that both branches keep.
 */

const GLOBALS_CSS = path.join(process.cwd(), 'src/app/globals.css')

function makePose(overrides: Partial<Pose> = {}): Pose {
  return {
    slug: 'test-pose', sanskrit: 'Testasana', english: 'Test Pose', aliases: [],
    modes: [{ type: 'yin', tissue_target: 'connective', hold_range: { min: 3, max: 5 }, cue_notes: '' }],
    body_position: 'supine', meridians: [], element: 'fire',
    energetic_quality: ['grounding'], difficulty: 'accessible', props_required: [],
    prop_free_variation: null, counterposes: [], rebound_pose: null,
    contraindications: [], bilateral: false, source: '', notes: '',
    type_tags: ['twist'], muscle_groups: ['psoas'], complexity: 3, injury_risk: 2,
    breathing_cues: { entering: '', holding: '', exiting: '' },
    joint_action: [], primary_joints_involved: [],
    nervous_system_effect: 'parasympathetic', tissue_depth: 'superficial',
    modifications: [], dosha_affinity: { vata: 'neutral', pitta: 'neutral', kapha: 'neutral' },
    emotional_release_potential: [], sequencing_position: ['opening'],
    base_of_support: ['sitbones'], orientation: 'upright', cog_height: 'low',
    spinal_action: 'neutral', plane: 'sagittal', level: 'low', zone: 'near',
    energetic_direction: 'langhana', intensity: 2, default_measure: { seconds: 120 },
    ...overrides,
  }
}

// The touch-target rule is asserted twice: once as a source-scan (cheap, and it fails on
// the next hand-edit that quietly loosens the rem value — the same shape as
// tests/unit/poses/motion-budget.test.ts), and once by rendering the real chips and
// checking each one actually carries the class the rule targets.
function readTapFloorRulePx(): number | null {
  const css = fs.readFileSync(GLOBALS_CSS, 'utf8')
  const match = css.match(/\.kk-filter-chip-tap\s*{([^}]*)}/)
  if (!match) return null
  const heightMatch = match[1].match(/min-height:\s*([\d.]+)rem/)
  if (!heightMatch) return null
  return Number(heightMatch[1]) * 16
}

describe('the filter-chip touch-target floor as a source rule (FR-026)', () => {
  it('declares a floor of at least 40px, unconditionally of pointer type', () => {
    const px = readTapFloorRulePx()
    expect(px, '.kk-filter-chip-tap min-height, in px').not.toBeNull()
    expect(px).toBeGreaterThanOrEqual(40)
  })

  it('declares no colour property, so a per-value tone can sit alongside it', () => {
    const css = fs.readFileSync(GLOBALS_CSS, 'utf8')
    const match = css.match(/\.kk-filter-chip-tap\s*{([^}]*)}/)
    expect(match).not.toBeNull()
    const body = match![1]
    for (const prop of ['background', 'color', 'border']) {
      expect(body, `.kk-filter-chip-tap must not set ${prop}`).not.toMatch(new RegExp(`\\b${prop}\\b\\s*:`))
    }
  })
})

describe('every rendered filter chip carries the touch-target floor (FR-026)', () => {
  async function renderWithAdvancedOpen() {
    const user = userEvent.setup()
    const pose = makePose({ slug: 'malasana' })
    render(<PosesClient poses={[pose]} />)
    await user.click(screen.getByRole('button', { name: /advanced filters/i }))
    return user
  }

  function expectEveryButtonHasTapFloor(containerTestId: string) {
    const container = screen.getByTestId(containerTestId)
    const buttons = within(container).getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) {
      expect(
        button.className,
        `${containerTestId} button "${button.textContent}" is missing kk-filter-chip-tap`,
      ).toMatch(/\bkk-filter-chip-tap\b/)
    }
  }

  it('body-position chips (single-select) all carry the floor', async () => {
    await renderWithAdvancedOpen()
    expectEveryButtonHasTapFloor('poses-category-filter')
  })

  it('element chips (single-select) all carry the floor, including the active one', async () => {
    const user = await renderWithAdvancedOpen()
    // Force the branch that previously dropped `kk-chip` (and, with it, any sizing floor)
    // entirely on activation.
    await user.click(screen.getByRole('button', { name: /^fire$/i }))
    expectEveryButtonHasTapFloor('poses-element-filter')
  })

  it('nervous-system-effect chips (single-select) all carry the floor, including the active one', async () => {
    const user = await renderWithAdvancedOpen()
    await user.click(screen.getByRole('button', { name: /^parasympathetic$/i }))
    expectEveryButtonHasTapFloor('poses-ns-filter')
  })

  it('sequencing-position chips (single-select) all carry the floor', async () => {
    await renderWithAdvancedOpen()
    expectEveryButtonHasTapFloor('poses-seq-filter')
  })

  it('type-tag chips (multi-select) all carry the floor, including an active one', async () => {
    const user = await renderWithAdvancedOpen()
    await user.click(screen.getByRole('button', { name: /^twist$/i }))
    expectEveryButtonHasTapFloor('poses-type-tag-filter')
  })

  it('muscle-group chips (multi-select) all carry the floor, including an active one', async () => {
    const user = await renderWithAdvancedOpen()
    await user.click(screen.getByRole('button', { name: /^psoas$/i }))
    expectEveryButtonHasTapFloor('poses-muscle-group-filter')
  })
})
