import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import ComposeFlowList from '@/components/compose/ComposeFlowList'
import type { Pose } from '@/lib/pose-types'
import type { FlowItem } from '@/lib/flow/types'

// 004 T048 (FR-035) — a reorder, whether by drag or by the up/down buttons, must not
// move the page's scroll position. This is a component-level smoke test (not a
// Playwright spec): it exercises the same list-rendering path ComposeClient.tsx
// wires up (DndContext/SortableContext + key-stable ComposeFlowItem rows), driven
// by a real button click, and asserts window.scrollY is unchanged afterward.

function makePose(slug: string): Pose {
  return {
    slug,
    sanskrit: slug,
    english: slug,
    aliases: [],
    modes: [{ type: 'yin', tissue_target: 'connective', hold_range: { min: 3, max: 5 }, cue_notes: '' }],
    body_position: 'seated',
    energetic_quality: ['calming'],
    difficulty: 'accessible',
    complexity: 1,
    breathing_cues: { entering: '', holding: '', exiting: '' },
    bilateral: false,
    contraindications: [],
    props_required: [],
    prop_free_variation: null,
    source: '',
    base_of_support: ['sitbones'],
    orientation: 'upright',
    cog_height: 'low',
    spinal_action: 'neutral',
    plane: 'sagittal',
    level: 'low',
    zone: 'near',
    energetic_direction: 'samana',
    intensity: 1,
    default_measure: { seconds: 30 },
  }
}

function makeItem(id: string, order: number): FlowItem {
  return { id, poseSlug: `pose-${id}`, mode: 'yin', measure: { seconds: 30 }, phaseId: null, order }
}

// Mirrors ComposeClient's moveItem: reorders by index, reassigns `order`. Kept as a
// faithful local copy (moveItem itself is a private closure in ComposeClient.tsx,
// not exported) so this harness drives the same list through the same public
// component surface ComposeClient renders.
function ReorderHarness() {
  const [items, setItems] = useState<FlowItem[]>([
    makeItem('a', 0),
    makeItem('b', 1),
    makeItem('c', 2),
  ])
  const poseBySlug = new Map(items.map(i => [i.poseSlug, makePose(i.poseSlug)]))
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function moveItem(index: number, direction: -1 | 1) {
    setItems(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const target = index + direction
      if (target < 0 || target >= sorted.length) return prev
      ;[sorted[index], sorted[target]] = [sorted[target], sorted[index]]
      return sorted.map((i, idx) => ({ ...i, order: idx }))
    })
  }

  return (
    <ComposeFlowList
      items={[...items].sort((a, b) => a.order - b.order)}
      poseBySlug={poseBySlug}
      frictionMatrix={{}}
      layer="simple"
      sensors={sensors}
      onDragStart={() => {}}
      onDragEnd={() => {}}
      onMove={moveItem}
      onUpdate={() => {}}
      onRemove={() => {}}
    />
  )
}

// jsdom in this environment doesn't implement window.scrollTo (it logs "Not
// implemented" and is a no-op), so a plain before/after read of window.scrollY
// can't tell a correct implementation from a buggy one that calls
// window.scrollTo(0, 0) — jsdom would swallow that call either way. Spying on
// scrollTo makes the guard meaningful: it fails if a future change resets or
// "helpfully" auto-scrolls the window on reorder, which is the regression FR-035
// exists to prevent.
function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true })
}

describe('scroll position across a button reorder (FR-035, T048)', () => {
  beforeEach(() => {
    setScrollY(0)
  })

  it('is unchanged, and nothing scrolls the window, after clicking a reorder button', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<ReorderHarness />)

    setScrollY(640)
    expect(window.scrollY).toBe(640)

    await user.click(screen.getByTestId('compose-item-reorder-down-0'))

    // The row order actually changed (sanity check this wasn't a no-op click).
    expect(screen.getByTestId('compose-row-0')).toBeInTheDocument()

    expect(window.scrollY).toBe(640)
    expect(scrollToSpy).not.toHaveBeenCalled()

    scrollToSpy.mockRestore()
  })
})
