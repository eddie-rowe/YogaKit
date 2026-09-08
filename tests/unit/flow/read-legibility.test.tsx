import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Pose } from '@/lib/pose-types'
import type { Flow } from '@/lib/flow/types'
import ReadView from '@/app/read/[id]/ReadView'

// `004` US1 — the read view legible at arm's length. What is asserted here is the
// structure the legibility rests on: one breath mark per item with the count split
// from the unit, exactly one marked row at every moment, and a duration on every
// group. The pixel sizes and the contrast are CSS, and belong to the E2E pass and the
// manual dark-room check; what a unit test can hold is that the hooks the CSS needs
// are actually in the markup.

function makePose(slug: string, english: string): Pose {
  return {
    slug, sanskrit: english, english, aliases: [],
    modes: [{ type: 'yang', tissue_target: 'muscular', hold_range: { min: 3, max: 5 }, cue_notes: '' }],
    body_position: 'standing', meridians: [], element: null,
    energetic_quality: ['grounding'], difficulty: 'accessible', props_required: [],
    prop_free_variation: null, counterposes: [], rebound_pose: null,
    contraindications: [], bilateral: false, source: '', notes: '',
    type_tags: [], muscle_groups: [], complexity: 1, injury_risk: 1,
    entry_tier: 1,
  } as unknown as Pose
}

function makeFlow(): Flow {
  return {
    id: 'flow-1',
    title: 'Morning practice',
    items: [
      { id: 'i1', poseSlug: 'tadasana', mode: 'yang', measure: { breaths: 5 }, phaseId: 'p1', order: 0 },
      { id: 'i2', poseSlug: 'tadasana', mode: 'yang', measure: { breaths: 1 }, phaseId: 'p1', order: 1 },
      { id: 'i3', poseSlug: 'half-butterfly', mode: 'yin', measure: { seconds: 90 }, phaseId: 'p2', order: 2 },
      { id: 'i4', poseSlug: 'savasana', mode: 'yin', measure: { seconds: 45 }, phaseId: null, order: 3 },
    ],
    phases: [
      { id: 'p1', name: 'Warm up', order: 0 },
      { id: 'p2', name: 'Deep', order: 1 },
    ],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isBuiltIn: false,
    schema_version: '0.1.0',
  } as unknown as Flow
}

const poses = [makePose('tadasana', 'Mountain Pose'), makePose('half-butterfly', 'Half Butterfly')]

describe('the breath mark', () => {
  it('is one element per item, with the count and the unit inside it', () => {
    render(<ReadView flow={makeFlow()} poses={poses} />)
    const marks = screen.getAllByTestId('read-breath-mark')
    expect(marks).toHaveLength(4)

    // The invariant walk4-read.spec.ts holds: one mark per item, never blank. The
    // split is inside the single element, so the count stays exact.
    for (const mark of marks) expect(mark.textContent?.trim()).not.toBe('')

    expect(marks[0].textContent).toBe('5breaths')
    expect(marks[1].textContent).toBe('1breath')
  })

  it('marks a time-based hold approximate and a breath count exact', () => {
    render(<ReadView flow={makeFlow()} poses={poses} />)
    const marks = screen.getAllByTestId('read-breath-mark')
    // 90 seconds is the half-minute case: "~1.5 min", never a lossy "2 min".
    expect(marks[2].textContent).toBe('~1.5min')
    expect(marks[3].textContent).toBe('~45s')
    expect(marks[0].textContent?.includes('~')).toBe(false)
  })
})

describe('the current item', () => {
  it('opens already marked, so there is never a moment with none', () => {
    render(<ReadView flow={makeFlow()} poses={poses} />)
    const marked = document.querySelectorAll('[data-current="true"]')
    expect(marked).toHaveLength(1)
    expect(screen.getByTestId('read-item-0').getAttribute('data-current')).toBe('true')
  })

  it('moves to the row that was tapped, and leaves exactly one marked', async () => {
    const user = userEvent.setup()
    render(<ReadView flow={makeFlow()} poses={poses} />)

    await user.click(screen.getByTestId('read-item-2'))
    expect(document.querySelectorAll('[data-current="true"]')).toHaveLength(1)
    expect(screen.getByTestId('read-item-2').getAttribute('data-current')).toBe('true')
    expect(screen.getByTestId('read-item-0').getAttribute('data-current')).toBeNull()

    await user.click(screen.getByTestId('read-item-3'))
    expect(document.querySelectorAll('[data-current="true"]')).toHaveLength(1)
    expect(screen.getByTestId('read-item-3').getAttribute('data-current')).toBe('true')
  })

  it('is reachable from the keyboard, not by pointer only', async () => {
    const user = userEvent.setup()
    render(<ReadView flow={makeFlow()} poses={poses} />)

    const row = screen.getByTestId('read-item-1')
    expect(row.getAttribute('role')).toBe('button')
    expect(row.getAttribute('tabindex')).toBe('0')
    row.focus()
    await user.keyboard('{Enter}')
    expect(row.getAttribute('data-current')).toBe('true')
    expect(row.getAttribute('aria-current')).toBe('true')
  })

  it('keeps the row a row — a <p> inside a <button> is invalid and breaks hydration', () => {
    const flow = makeFlow()
    flow.items[0].note = 'Soften the jaw.'
    render(<ReadView flow={flow} poses={poses} />)

    const row = screen.getByTestId('read-item-0')
    expect(row.tagName).toBe('DIV')
    expect(row.closest('button')).toBeNull()
    expect(within(row).getByTestId('read-note-0').tagName).toBe('P')
  })

  it('never renders a name span before the pose name', () => {
    // walk4-read.spec.ts measures `.pose-row span` first for the arm's-length size.
    // Any marker span inserted ahead of the name silently moves that assertion onto
    // the wrong element.
    render(<ReadView flow={makeFlow()} poses={poses} />)
    const firstSpan = document.querySelector('.pose-row span')
    expect(firstSpan?.className).toContain('read-pose-name')
    expect(firstSpan?.textContent).toBe('Mountain Pose')
  })
})

describe('phase headers', () => {
  it('carry how long the block runs', () => {
    render(<ReadView flow={makeFlow()} poses={poses} />)
    // Warm up: 5 + 1 breaths at 5s = 30s.
    expect(screen.getByTestId('read-phasetotal-p1').textContent).toBe('~30 s')
    expect(screen.getByTestId('read-phasetotal-p2').textContent).toBe('~1.5 min')
  })

  it('carry it for un-phased items too, which have no header to hang it on', () => {
    render(<ReadView flow={makeFlow()} poses={poses} />)
    expect(screen.getByTestId('read-phasetotal-unphased-2').textContent).toBe('~45 s')
  })

  it('use a testid stem the read-phase- prefix selector cannot match', () => {
    // offline-read.spec.ts counts sections with [data-testid^="read-phase-"]. A
    // `read-phase-duration-*` would double that count per phase; `read-phasetotal-`
    // cannot (guardrails §1.3 — no testid is a prefix of another).
    render(<ReadView flow={makeFlow()} poses={poses} />)
    expect(document.querySelectorAll('[data-testid^="read-phase-"]')).toHaveLength(2)
  })
})
