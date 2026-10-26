import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import PosesClient from '@/app/poses/PosesClient'
import { describeConstraints } from '@/app/poses/zero-result'
import { getAllPoses } from '@/lib/pose-library'

const poses = getAllPoses()

function openAdvanced() {
  fireEvent.click(screen.getByText(/Advanced filters/))
}

describe('multi-select chip groups (FR-020, FR-021, SC-008)', () => {
  it('marks every multi-select chip with a non-colour affordance, unlike single-select chips', () => {
    render(<PosesClient poses={poses} />)
    openAdvanced()
    const multi = document.querySelectorAll('[data-multi="true"]')
    expect(multi.length).toBeGreaterThan(0)
    multi.forEach(chip => {
      expect(chip.querySelector('[data-testid="multi-chip-mark"]')).not.toBeNull()
      expect(chip).toHaveAttribute('aria-pressed', 'false')
    })
    // single-select chips have neither the mark nor aria-pressed
    const single = screen.getByText('parasympathetic')
    expect(single.querySelector('[data-testid="multi-chip-mark"]')).toBeNull()
    expect(single).not.toHaveAttribute('data-multi')
  })

  it('swaps the mark when selected', () => {
    render(<PosesClient poses={poses} />)
    openAdvanced()
    const chip = document.querySelector('[data-multi="true"]') as HTMLElement
    expect(chip.textContent).toMatch(/^\+/)
    fireEvent.click(chip)
    expect(chip.textContent).toMatch(/^✓/)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
  })

  it('combines selected constraints: a second selection never widens the result', () => {
    render(<PosesClient poses={poses} />)
    openAdvanced()
    const count = () => Number(screen.getByText(/ of \d+ poses/).textContent!.match(/^(\d+)/)![1])
    const chips = Array.from(document.querySelectorAll('[data-multi="true"]')) as HTMLElement[]
    const typeChip = chips.find(c => c.textContent!.includes('forward-fold'))!
    fireEvent.click(typeChip)
    const afterOne = count()
    const muscle = chips.find(c => c.textContent!.includes('hamstrings'))!
    fireEvent.click(muscle)
    expect(count()).toBeLessThanOrEqual(afterOne)
  })
})

describe('clear-all reachability (FR-025)', () => {
  it('is available with the advanced panel collapsed whenever a filter is active', () => {
    render(<PosesClient poses={poses} />)
    expect(screen.queryByTestId('poses-clear-all-filters')).not.toBeInTheDocument()
    fireEvent.change(screen.getByTestId('poses-search-input'), { target: { value: 'a' } })
    expect(screen.getByTestId('poses-clear-all-filters')).toBeInTheDocument()
    expect(screen.queryByText('Nervous system effect')).not.toBeInTheDocument() // panel closed
  })
})

describe('zero-result explanation (FR-024)', () => {
  it('names the constraints that produced an empty result', () => {
    render(<PosesClient poses={poses} />)
    fireEvent.change(screen.getByTestId('poses-search-input'), { target: { value: 'zzzz-no-such-pose' } })
    const msg = screen.getByTestId('poses-zero-result-constraints')
    expect(msg).toHaveTextContent('zzzz-no-such-pose')
  })

  it('describeConstraints lists only active constraints', () => {
    const none = { search: ' ', element: '', position: '', typeTags: [], muscleGroups: [], nervousSystem: '', seqPosition: '', complexityMax: 10, riskMax: 10 }
    expect(describeConstraints(none)).toEqual([])
    expect(
      describeConstraints({ ...none, element: 'fire', position: 'seated', nervousSystem: 'neutral', seqPosition: 'peak', typeTags: ['twist', 'backbend'], muscleGroups: ['psoas'], complexityMax: 3, riskMax: 2 })
    ).toEqual([
      'element: fire',
      'position: seated',
      'nervous system: neutral',
      'sequencing: peak',
      'type: twist + backbend',
      'muscles: psoas',
      'complexity up to 3',
      'injury risk up to 2',
    ])
  })
})
