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

describe('the caller and the diagram agree about emptiness (FR-017)', () => {
  it('never opens a column the diagram then declines to fill, for any real pose', async () => {
    // research.md §10: the "is there anything to draw" condition lives in two places —
    // PoseDetailContent, which decides whether to open a 2fr grid column, and BodyDiagram,
    // which returns null. Duplicated deliberately; the alternative is the child reporting
    // its own emptiness upward after render. This is the safety net for that duplication,
    // and it runs against all 67 poses rather than a fixture.
    const { getAllPoses } = await import('@/lib/pose-library')
    const poses = getAllPoses()
    expect(poses.length).toBeGreaterThan(0)

    for (const pose of poses) {
      // The caller's condition, at the expert layer where chakras are shown.
      const callerWouldOpen =
        (pose.muscle_groups?.length ?? 0) > 0 ||
        (pose.meridians?.length ?? 0) > 0 ||
        (pose.primary_joints_involved?.length ?? 0) > 0 ||
        (pose.chakras?.length ?? 0) > 0

      const { container, unmount } = render(
        <BodyDiagram
          muscleGroups={pose.muscle_groups ?? []}
          meridians={pose.meridians ?? []}
          jointsInvolved={pose.primary_joints_involved ?? []}
          chakras={pose.chakras ?? []}
          element={pose.element ?? null}
          bilateral={pose.bilateral}
        />
      )
      const diagramRendered = !(container.childElementCount === 0)
      expect({ slug: pose.slug, diagramRendered }).toEqual({
        slug: pose.slug,
        diagramRendered: callerWouldOpen,
      })
      unmount()
    }
  })
})
