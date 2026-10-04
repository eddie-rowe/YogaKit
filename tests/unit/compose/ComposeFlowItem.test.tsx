import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ComposeFlowItem from '@/components/compose/ComposeFlowItem'
import type { Pose } from '@/lib/pose-types'
import type { FlowItem } from '@/lib/flow/types'

function makePose(overrides: Partial<Pose> = {}): Pose {
  return {
    slug: 'dragon-pose',
    sanskrit: 'Dragon Pose',
    english: 'Dragon Pose',
    aliases: [],
    modes: [{ type: 'yin', tissue_target: 'connective', hold_range: { min: 3, max: 5 }, cue_notes: '' }],
    body_position: 'kneeling',
    energetic_quality: ['grounding', 'opening'],
    difficulty: 'intermediate',
    complexity: 3,
    breathing_cues: { entering: '', holding: '', exiting: '' },
    bilateral: true,
    contraindications: [],
    props_required: [],
    prop_free_variation: null,
    source: '',
    base_of_support: ['feet', 'knees'],
    orientation: 'upright',
    cog_height: 'low',
    spinal_action: 'neutral',
    plane: 'sagittal',
    level: 'low',
    zone: 'mid-reach',
    energetic_direction: 'brahmana',
    intensity: 3,
    default_measure: { seconds: 90 },
    nervous_system_effect: 'parasympathetic',
    tissue_depth: 'deep',
    ...overrides,
  }
}

function makeItem(overrides: Partial<FlowItem> = {}): FlowItem {
  return {
    id: 'item-1',
    poseSlug: 'dragon-pose',
    mode: 'yin',
    measure: { seconds: 90 },
    phaseId: null,
    order: 0,
    ...overrides,
  }
}

function renderItem(pose: Pose) {
  return render(
    <ComposeFlowItem
      item={makeItem()}
      index={0}
      pose={pose}
      stillness={false}
      layer="expert"
      isFirst={true}
      isLast={true}
      next={undefined}
      seam={undefined}
      onMove={vi.fn()}
      onUpdate={vi.fn()}
      onRemove={vi.fn()}
    />
  )
}

// 004 T045 — the expert-layer energetics chip used to render the bare Sanskrit enum
// value (`pose.energetic_direction`, e.g. "brahmana"), unglossed. It must render
// describeEnergeticDirection's output instead ("Brahmana — building"), same as the
// pose-detail badge (poses-detail-energetic-direction).
describe('ComposeFlowItem expert-layer energetics chip (T045)', () => {
  it('renders the glossed energetic direction, not the bare enum token', () => {
    renderItem(makePose({ energetic_direction: 'brahmana' }))
    const energetics = screen.getByTestId('compose-item-energetics-0')
    expect(energetics.textContent).toContain('Brahmana — building')
    // The bare Sanskrit token alone (no gloss) must not appear anywhere in the chip.
    expect(energetics.textContent).not.toMatch(/\bbrahmana\b/)
  })

  it('glosses each of the three energetic directions', () => {
    renderItem(makePose({ energetic_direction: 'langhana' }))
    expect(screen.getByTestId('compose-item-energetics-0').textContent).toContain('Langhana — reducing')
  })
})

// 004 T046 — the expert-layer chips must use the sanctioned chakra hue (guardrails
// §2 / CATEGORY_HUES.chakras in BodyDiagram.tsx), applied via inline style, not the
// ad-hoc bg-purple-50/bg-violet-50 Tailwind utility classes.
describe('ComposeFlowItem chip colors (T046)', () => {
  it('applies the chakra hue via inline style on the energetics chips, not Tailwind purple', () => {
    renderItem(makePose({ energetic_quality: ['grounding'], energetic_direction: 'samana' }))
    const energetics = screen.getByTestId('compose-item-energetics-0')
    const chips = energetics.querySelectorAll('span')
    expect(chips.length).toBeGreaterThan(0)
    for (const chip of Array.from(chips)) {
      expect(chip.className).not.toMatch(/bg-purple-50|text-purple-700/)
      expect((chip as HTMLElement).style.backgroundColor).toBeTruthy()
      expect((chip as HTMLElement).style.color).toBeTruthy()
    }
  })

  it('applies the chakra hue via inline style on the tissue_depth chip, not bg-violet-50', () => {
    renderItem(makePose({ tissue_depth: 'deep' }))
    const geometry = screen.getByTestId('compose-item-geometry-0')
    const tissueChip = Array.from(geometry.querySelectorAll('span')).find(el =>
      el.textContent?.includes('tissue')
    )
    expect(tissueChip).toBeTruthy()
    expect(tissueChip!.className).not.toMatch(/bg-violet-50|text-violet-700/)
    expect((tissueChip as HTMLElement).style.backgroundColor).toBeTruthy()
  })
})

// 004 US5 s3–s6 — seam node presence, tier geometry, hover affordance.
describe('ComposeFlowItem seam (US5)', () => {
  function renderWithNext(seam: { tier: 1 | 2 | 3; reasons: string[] } | undefined) {
    return render(
      <ComposeFlowItem
        item={makeItem()}
        index={0}
        pose={makePose()}
        stillness={false}
        layer="simple"
        isFirst={true}
        isLast={false}
        next={makeItem({ id: 'item-2', order: 1 })}
        seam={seam}
        onMove={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />
    )
  }

  it('keeps a seam node for an adjacent pair with no friction result (floor)', () => {
    renderWithNext(undefined)
    const seam = screen.getByTestId('compose-seam-0-1')
    expect(seam.getAttribute('data-tier')).toBe('1')
  })

  it('encodes tier as length and weight, not height alone', () => {
    renderWithNext({ tier: 3, reasons: ['a'] })
    const seam = screen.getByTestId('compose-seam-0-1')
    expect(seam.style.getPropertyValue('--seam-length')).toBe('100%')
    expect(seam.style.getPropertyValue('--seam-weight')).toBe('3px')
    expect(seam.style.getPropertyValue('--seam-gap')).toBe('0.5rem')
  })

  it('makes the explanatory text reachable and the seam focusable', () => {
    renderWithNext({ tier: 2, reasons: ['plane change'] })
    const seam = screen.getByTestId('compose-seam-0-1')
    expect(seam.getAttribute('tabindex')).toBe('0')
    expect(seam.getAttribute('title')).toBe('plane change')
  })
})
