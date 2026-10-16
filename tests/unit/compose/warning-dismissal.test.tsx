import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import type { Pose } from '@/lib/pose-types'
import type { Flow } from '@/lib/flow/types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

let stored: Flow
vi.mock('@/lib/storage/flow-store', () => ({
  saveFlow: vi.fn(async () => {}),
  getFlow: vi.fn(async () => stored),
  getAllFlows: vi.fn(async () => []),
}))
vi.mock('@/lib/storage/sync', () => ({ queueUpsert: vi.fn(async () => {}) }))

import ComposeClient from '@/app/compose/ComposeClient'

function pose(slug: string): Pose {
  return {
    slug, sanskrit: slug, english: slug, aliases: [],
    modes: [{ type: 'yin', tissue_target: 'connective', hold_range: { min: 3, max: 5 }, cue_notes: '' }],
    body_position: 'kneeling', energetic_quality: ['grounding'], difficulty: 'intermediate',
    complexity: 3, breathing_cues: { entering: '', holding: '', exiting: '' }, bilateral: true,
    contraindications: [], props_required: [], prop_free_variation: null, source: '',
    base_of_support: ['feet'], orientation: 'upright', cog_height: 'low', spinal_action: 'neutral',
    plane: 'sagittal', level: 'low', zone: 'mid-reach', energetic_direction: 'samana',
    intensity: 3, default_measure: { seconds: 90 }, nervous_system_effect: 'parasympathetic',
    tissue_depth: 'deep',
  } as Pose
}

function flowWith(slugs: string[]): Flow {
  return {
    id: 'f1', title: 'T', phases: [], createdAt: '', updatedAt: '', isBuiltIn: false,
    schema_version: 1,
    items: slugs.map((s, i) => ({
      id: `item-${i}`, poseSlug: s, mode: 'yin', measure: { seconds: 90 }, phaseId: null, order: i,
    })),
  } as unknown as Flow
}

const poses = [pose('dragon'), pose('lizard')]

async function mount() {
  render(<ComposeClient poses={poses} builtins={[]} flowId="f1" />)
  await screen.findByTestId('compose-row-0')
}

describe('validator warning anchoring + dismissal (004 US6)', () => {
  beforeEach(() => {
    cleanup()
    stored = flowWith(['dragon'])
  })

  it('anchors a laterality warning inside the concerned row', async () => {
    await mount()
    const row = screen.getByTestId('compose-row-0')
    expect(row.querySelector('[data-testid="validator-warning-laterality"]')).not.toBeNull()
  })

  it('dismisses for the session, and a remount (new session) shows it again', async () => {
    await mount()
    fireEvent.click(screen.getByTestId('validator-warning-dismiss-laterality'))
    expect(screen.queryByTestId('validator-warning-laterality')).toBeNull()
    cleanup()
    await mount()
    expect(screen.getByTestId('validator-warning-laterality')).toBeTruthy()
  })

  it('does not persist the dismissal to browser storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await mount()
    setItem.mockClear()
    fireEvent.click(screen.getByTestId('validator-warning-dismiss-laterality'))
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('still warns for the same condition at a different item (kind + item key)', async () => {
    stored = flowWith(['dragon', 'lizard'])
    await mount()
    expect(screen.getAllByTestId('validator-warning-laterality')).toHaveLength(2)
    fireEvent.click(screen.getAllByTestId('validator-warning-dismiss-laterality')[0])
    await waitFor(() => expect(screen.getAllByTestId('validator-warning-laterality')).toHaveLength(1))
    expect(screen.getByTestId('compose-row-1').querySelector('[data-testid="validator-warning-laterality"]')).not.toBeNull()
  })

  it('shows flow-level warnings (no item) in the list and never disables save', async () => {
    stored = flowWith(['dragon', 'dragon'])
    await mount()
    expect(screen.getByTestId('validator-warning-closing-stillness')).toBeTruthy()
    expect(screen.getByTestId('compose-row-0').querySelector('[data-testid="validator-warning-closing-stillness"]')).toBeNull()
  })
})
