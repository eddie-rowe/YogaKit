import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

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

describe('BodyDiagram tab construction (FR-016, FR-017, SC-005)', () => {
  it('renders one heading and no tab set for a single category', () => {
    render(<BodyDiagram {...EMPTY} muscleGroups={['psoas']} />)

    expect(screen.getByTestId('body-diagram-single-muscles')).toBeInTheDocument()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.queryByTestId('body-diagram-tab-muscles')).not.toBeInTheDocument()
  })

  it('offers exactly the categories holding data', () => {
    render(<BodyDiagram {...EMPTY} muscleGroups={['psoas']} jointsInvolved={['hip']} />)

    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByTestId('body-diagram-tab-muscles')).toBeInTheDocument()
    expect(screen.getByTestId('body-diagram-tab-joints')).toBeInTheDocument()
    // Never offered, because tapping it could only ever show nothing.
    expect(screen.queryByTestId('body-diagram-tab-meridians')).not.toBeInTheDocument()
    expect(screen.queryByTestId('body-diagram-tab-chakras')).not.toBeInTheDocument()
  })

  it('opens on the first category with data rather than on muscles', () => {
    // The 25 poses with meridians and no muscle data used to open on an empty muscle tab.
    render(<BodyDiagram {...EMPTY} meridians={['kidney']} />)
    expect(screen.getByTestId('body-diagram-single-meridians')).toBeInTheDocument()
    // The depth legend explains a muscle encoding, so it is absent here — SC-006 is not
    // a demand for a legend on every tab.
    expect(screen.queryByTestId('body-diagram-depth-legend')).not.toBeInTheDocument()
  })

  it('renders nothing at all when no category holds data', () => {
    const { container } = render(<BodyDiagram {...EMPTY} />)
    expect(container).toBeEmptyDOMElement()
    // FR-017 wants an absent frame, not an explained empty one.
    expect(container.textContent).not.toMatch(/data for this pose/i)
  })

  it('never says "no … data for this pose" on a populated diagram either', () => {
    const { container } = render(
      <BodyDiagram {...EMPTY} muscleGroups={['psoas']} meridians={['kidney']} />
    )
    expect(container.textContent).not.toMatch(/data for this pose/i)
  })
})
