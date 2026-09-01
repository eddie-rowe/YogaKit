import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import BodyDiagram from '@/components/poses/BodyDiagram'
import type { MuscleGroup, JointName, ChakraName } from '@/lib/pose-types'

const EMPTY = {
  muscleGroups: [] as MuscleGroup[],
  meridians: [] as string[],
  jointsInvolved: [] as JointName[],
  chakras: [] as ChakraName[],
  element: null,
  bilateral: true,
}

describe('region ↔ legend linking (FR-013, FR-014, SC-004)', () => {
  it('highlights every legend entry that reaches a tapped region', async () => {
    const user = userEvent.setup()
    render(<BodyDiagram {...EMPTY} muscleGroups={['psoas', 'hip-flexors']} />)

    await user.click(screen.getByTestId('body-diagram-region-region-psoas'))

    // Both are true answers for that shape; showing one would be showing the wrong thing.
    expect(screen.getByTestId('body-diagram-legend-psoas')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('body-diagram-legend-hip-flexors')).toHaveAttribute('aria-pressed', 'true')
  })

  it('highlights all three regions a legend entry reaches', async () => {
    const user = userEvent.setup()
    render(<BodyDiagram {...EMPTY} muscleGroups={['hip-flexors']} />)

    await user.click(screen.getByTestId('body-diagram-legend-hip-flexors'))

    for (const id of ['region-psoas', 'region-iliacus-l', 'region-iliacus-r']) {
      expect(screen.getByTestId(`body-diagram-region-${id}`)).toHaveAttribute('stroke', 'var(--foreground)')
    }
  })

  it('flips the view for a back-only entry tapped from the front', async () => {
    const user = userEvent.setup()
    render(<BodyDiagram {...EMPTY} muscleGroups={['hamstrings']} />)

    expect(screen.getByTestId('body-diagram-view-front')).toHaveAttribute('aria-pressed', 'true')
    // The chip says where it lives, so the flip reads as intentional.
    expect(screen.getByTestId('body-diagram-legend-hamstrings')).toHaveTextContent('back')

    await user.click(screen.getByTestId('body-diagram-legend-hamstrings'))

    // Not a silent no-op: the view moves and the regions are there to see.
    expect(screen.getByTestId('body-diagram-view-back')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('body-diagram-legend-hamstrings')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('body-diagram-region-region-hamstrings-l')).toBeInTheDocument()
  })

  it('links both dots of a bilateral joint to its one legend entry', async () => {
    const user = userEvent.setup()
    render(<BodyDiagram {...EMPTY} jointsInvolved={['hip']} />)

    await user.click(screen.getByTestId('body-diagram-region-joint-hip-mirror'))

    expect(screen.getByTestId('body-diagram-legend-joint-hip')).toHaveAttribute('aria-pressed', 'true')
    // Tapping either dot lights the chip; the chip lights both dots.
    expect(screen.getByTestId('body-diagram-region-joint-hip')).toHaveAttribute('stroke', 'var(--foreground)')
    expect(screen.getByTestId('body-diagram-region-joint-hip-mirror')).toHaveAttribute('stroke', 'var(--foreground)')
  })

  it('lets a second tap clear the selection', async () => {
    const user = userEvent.setup()
    render(<BodyDiagram {...EMPTY} muscleGroups={['psoas']} />)
    const chip = screen.getByTestId('body-diagram-legend-psoas')

    await user.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'false')
  })

  it('drops a selection when the layer changes', async () => {
    const user = userEvent.setup()
    render(<BodyDiagram {...EMPTY} muscleGroups={['psoas']} jointsInvolved={['hip']} />)

    await user.click(screen.getByTestId('body-diagram-legend-psoas'))
    await user.click(screen.getByTestId('body-diagram-tab-joints'))

    // A muscle key on the joint layer would highlight nothing and read as a broken tap.
    expect(screen.getByTestId('body-diagram-legend-joint-hip')).toHaveAttribute('aria-pressed', 'false')
  })

  it('expresses selection without promoting a data hue to a background', async () => {
    const user = userEvent.setup()
    render(<BodyDiagram {...EMPTY} chakras={['heart']} />)
    const chip = screen.getByTestId('body-diagram-legend-chakra-heart')
    const before = chip.style.background

    await user.click(chip)

    // Guardrails §2 / FR-040: the chip's category hue is *data*. Selection is a ring and
    // a heavier border; if it ever became a filled background, this fails.
    expect(chip.style.background).toBe(before)
    expect(chip.style.borderColor).toBe('var(--foreground)')
    expect(chip).not.toHaveAttribute('data-active', 'true')
  })
})
