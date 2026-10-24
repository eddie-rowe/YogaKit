import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ComposeFlowItem from '@/components/compose/ComposeFlowItem'
import type { FlowItem } from '@/lib/flow/types'

const item = (id: string, order: number): FlowItem => ({
  id,
  poseSlug: 'x',
  mode: 'yin',
  measure: { seconds: 60 },
  phaseId: null,
  order,
})

function renderItem(props: Partial<React.ComponentProps<typeof ComposeFlowItem>> = {}) {
  return render(
    <ComposeFlowItem
      item={item('a', 0)}
      index={0}
      pose={undefined}
      stillness={false}
      layer="simple"
      isFirst
      isLast={false}
      next={item('b', 1)}
      seam={undefined}
      onMove={vi.fn()}
      onUpdate={vi.fn()}
      onRemove={vi.fn()}
      {...props}
    />,
  )
}

describe('seam node (004 US5 s3/s4/s5/s6)', () => {
  it('keeps a seam node for a floor-score pair with no friction result', () => {
    renderItem()
    const seam = screen.getByTestId('compose-seam-0-1')
    expect(seam.getAttribute('data-tier')).toBe('1')
  })

  it('renders no seam after the last item', () => {
    renderItem({ next: undefined })
    expect(screen.queryByTestId('compose-seam-0-1')).toBeNull()
  })

  it('is focusable so its explanation is reachable without a pointer', () => {
    renderItem({ seam: { tier: 2, reasons: ['spinal flip'] } })
    const seam = screen.getByTestId('compose-seam-0-1')
    expect(seam.getAttribute('tabindex')).toBe('0')
    expect(seam.getAttribute('title')).toBe('spinal flip')
  })

  it('exposes tier geometry as CSS variables and a wider gap at tier 3', () => {
    renderItem({ seam: { tier: 3, reasons: [] } })
    const seam = screen.getByTestId('compose-seam-0-1')
    expect(seam.style.getPropertyValue('--kk-seam-line-width')).toBe('3px')
    expect(seam.style.getPropertyValue('--kk-seam-row-gap')).toBe('1rem')
  })
})

describe('insertion gap (004 US5 s1)', () => {
  it('renders a gap element on the requested side only', () => {
    renderItem({ insertionSide: 'before' })
    const gap = screen.getByTestId('compose-insertion-gap-0')
    expect(gap.getAttribute('data-side')).toBe('before')
    expect(gap.compareDocumentPosition(screen.getByTestId('compose-row-0'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('places an after-gap below the row', () => {
    renderItem({ insertionSide: 'after' })
    const gap = screen.getByTestId('compose-insertion-gap-0')
    expect(gap.compareDocumentPosition(screen.getByTestId('compose-row-0'))).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    )
  })

  it('renders no gap when idle', () => {
    renderItem()
    expect(screen.queryByTestId('compose-insertion-gap-0')).toBeNull()
  })
})
