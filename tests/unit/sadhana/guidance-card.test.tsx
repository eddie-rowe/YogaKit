import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GuidanceCard from '@/components/sadhana/GuidanceCard'

const entry = { id: 'g1', trigger: 'gap', priority: 1, title: 'A gentle way back', action: 'Sit for three breaths.' }

describe('GuidanceCard (T062-T064)', () => {
  it('renders one clear next action and the corpus title', () => {
    render(<GuidanceCard entry={entry} onShown={() => {}} onDismiss={() => {}} />)
    expect(screen.getByTestId('sadhana-guidance-title')).toHaveTextContent('A gentle way back')
    expect(screen.getAllByTestId('sadhana-guidance-action')).toHaveLength(1)
    expect(screen.getByTestId('sadhana-guidance-action')).toHaveTextContent('Sit for three breaths.')
  })

  it('shows no numeric days-missed text and adds no navigation', () => {
    const { container } = render(<GuidanceCard entry={entry} onShown={() => {}} onDismiss={() => {}} />)
    expect(container.textContent).not.toMatch(/\d+\s*days?|missed|streak/i)
    expect(container.querySelector('a, nav, [href]')).toBeNull()
  })

  it('invokes onShown once on mount with the entry', () => {
    const onShown = vi.fn()
    const { rerender } = render(<GuidanceCard entry={entry} onShown={onShown} onDismiss={() => {}} />)
    rerender(<GuidanceCard entry={entry} onShown={onShown} onDismiss={() => {}} />)
    expect(onShown).toHaveBeenCalledTimes(1)
    expect(onShown).toHaveBeenCalledWith(entry)
  })

  it('invokes onDismiss with the entry', () => {
    const onDismiss = vi.fn()
    render(<GuidanceCard entry={entry} onShown={() => {}} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByTestId('sadhana-guidance-dismiss'))
    expect(onDismiss).toHaveBeenCalledWith(entry)
  })
})
