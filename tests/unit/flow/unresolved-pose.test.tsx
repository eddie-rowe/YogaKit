import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Pose } from '@/lib/pose-types'
import type { Flow } from '@/lib/flow/types'
import { humanizePoseSlug, resolveItemName } from '@/lib/pose-library/display-name'
import ReadView from '@/app/read/[id]/ReadView'

// Invariant I10, FR-031: a duplicate referencing a pose absent from this build's
// library opens and renders that item legibly. The slug has no foreign key by design
// (RULE-O6), so this is the case that design costs, and it has to be handled here.

function makePose(): Pose {
  return {
    slug: 'tadasana', sanskrit: 'Tadasana', english: 'Mountain Pose', aliases: [],
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
    title: 'A duplicate from a colleague',
    items: [
      { id: 'i1', poseSlug: 'tadasana', mode: 'yang', measure: { breaths: 5 }, phaseId: null, order: 0 },
      { id: 'i2', poseSlug: 'half-butterfly-r', mode: 'yin', measure: { seconds: 180 }, phaseId: null, order: 1 },
    ],
    phases: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isBuiltIn: false,
    schema_version: '0.1.0',
  }
}

describe('humanizePoseSlug', () => {
  it('turns a slug into something readable at arm\'s length', () => {
    expect(humanizePoseSlug('half-butterfly-r')).toBe('Half butterfly r')
    expect(humanizePoseSlug('savasana')).toBe('Savasana')
    expect(humanizePoseSlug('constructive_rest')).toBe('Constructive rest')
  })

  it('never returns an empty label, whatever it is handed', () => {
    expect(humanizePoseSlug('')).toBe('Unnamed pose')
    expect(humanizePoseSlug('   ')).toBe('Unnamed pose')
    expect(humanizePoseSlug('--')).toBe('Unnamed pose')
  })
})

describe('resolveItemName', () => {
  it('prefers the library, falls back to the slug', () => {
    expect(resolveItemName(makePose(), 'tadasana')).toBe('Mountain Pose')
    expect(resolveItemName(undefined, 'half-butterfly-r')).toBe('Half butterfly r')
  })
})

describe('the read view, given an item the library cannot resolve', () => {
  it('opens, renders every item, and says which one it does not have', () => {
    render(<ReadView flow={makeFlow()} poses={[makePose()]} />)

    // The whole flow is there — the unresolvable item did not take it down.
    expect(screen.getByText('Mountain Pose')).toBeTruthy()
    expect(screen.getByText('Half butterfly r')).toBeTruthy()
    expect(screen.getAllByTestId(/^read-item-/)).toHaveLength(2)

    // Said once, on the item it applies to, and not on the one that resolved.
    expect(screen.getByTestId('read-unknown-pose-1')).toBeTruthy()
    expect(screen.queryByTestId('read-unknown-pose-0')).toBeNull()
  })

  it('does not print the raw slug as if it were a name', () => {
    render(<ReadView flow={makeFlow()} poses={[makePose()]} />)
    expect(screen.queryByText('half-butterfly-r')).toBeNull()
  })
})
