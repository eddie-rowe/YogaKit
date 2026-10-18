import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ComposeFlowItem from '@/components/compose/ComposeFlowItem'
import { DEPTH_STEPS, nextDepth, depthAtLeast, DEPTH_RANK } from '@/lib/pose-library/depth'
import { DETAIL_LAYERS } from '@/app/poses/PoseDetailContent'
import type { Pose } from '@/lib/pose-types'
import type { FlowItem, LayerName } from '@/lib/flow/types'

const pose = {
  slug: 'dragon-pose', sanskrit: 'Dragon Pose', english: 'Dragon Pose', aliases: [],
  modes: [{ type: 'yin', tissue_target: 'connective', hold_range: { min: 3, max: 5 }, cue_notes: 'Sink the hips' }],
  body_position: 'kneeling', energetic_quality: ['grounding'], difficulty: 'intermediate', complexity: 3,
  breathing_cues: { entering: '', holding: '', exiting: '' }, bilateral: true, contraindications: [],
  props_required: [], prop_free_variation: null, source: '', energetic_direction: 'brahmana',
  nervous_system_effect: 'parasympathetic', tissue_depth: 'deep',
} as unknown as Pose

const item: FlowItem = { id: 'i1', poseSlug: 'dragon-pose', mode: 'yin', measure: { seconds: 90 }, phaseId: null, order: 0 }

function renderItem(layer: LayerName) {
  return render(
    <ComposeFlowItem item={item} index={0} pose={pose} stillness={false} layer={layer}
      isFirst isLast next={undefined} seam={undefined}
      onMove={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} />,
  )
}

describe('shared depth module', () => {
  it('orders simple < advanced < expert and wraps back to simple', () => {
    expect(DEPTH_STEPS).toEqual(['simple', 'advanced', 'expert'])
    expect(nextDepth('simple')).toBe('advanced')
    expect(nextDepth('advanced')).toBe('expert')
    expect(nextDepth('expert')).toBe('simple')
    expect(depthAtLeast('expert', 'advanced')).toBe(true)
    expect(depthAtLeast('simple', 'advanced')).toBe(false)
    expect(DEPTH_RANK.expert).toBe(2)
  })
  it('is the same ladder the pose detail view uses', () => {
    expect(DETAIL_LAYERS.slice(0, 3)).toEqual([...DEPTH_STEPS])
  })
})

describe('composer inline depth escalation (US8)', () => {
  it('tapping the item steps name → cue → full geometry in place', () => {
    renderItem('simple')
    expect(screen.queryByTestId('compose-item-cue-0')).toBeNull()
    expect(screen.queryByTestId('compose-item-geometry-0')).toBeNull()
    const toggle = screen.getByTestId('compose-item-depth-toggle-0')
    fireEvent.click(toggle)
    expect(screen.getByTestId('compose-item-cue-0').textContent).toContain('Sink the hips')
    expect(screen.getByTestId('compose-item-geometry-0')).toBeTruthy()
    expect(screen.queryByTestId('compose-item-energetics-0')).toBeNull()
    fireEvent.click(toggle)
    expect(screen.getByTestId('compose-item-energetics-0')).toBeTruthy()
    fireEvent.click(toggle)
    expect(screen.queryByTestId('compose-item-cue-0')).toBeNull()
  })
  it('reveals with the shared no-bounce reveal class', () => {
    renderItem('simple')
    fireEvent.click(screen.getByTestId('compose-item-depth-toggle-0'))
    expect(screen.getByTestId('compose-item-cue-0').className).toContain('kk-reveal')
  })
  it('keeps the drag handle and reorder controls independent of the toggle', () => {
    renderItem('simple')
    const toggle = screen.getByTestId('compose-item-depth-toggle-0')
    const handle = screen.getByTestId('compose-item-drag-handle-0')
    expect(toggle.contains(handle)).toBe(false)
    expect(handle.contains(toggle)).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })
})
