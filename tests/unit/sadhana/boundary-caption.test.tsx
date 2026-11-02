import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BoundaryCaption, { BOUNDARY_CAPTION } from '@/components/sadhana/BoundaryCaption'

describe('BoundaryCaption (T055)', () => {
  it('renders the caption constant under a stable testid', () => {
    render(<BoundaryCaption />)
    expect(screen.getByTestId('sadhana-boundary-caption')).toHaveTextContent(BOUNDARY_CAPTION)
  })

  it('is a single line of text with no dismiss control', () => {
    const { container } = render(<BoundaryCaption />)
    expect(BOUNDARY_CAPTION).not.toMatch(/\n/)
    expect(container.querySelectorAll('button, [role="button"]')).toHaveLength(0)
  })

  it('names what teachers see and never what they do not, without urgency wording', () => {
    expect(BOUNDARY_CAPTION).toMatch(/check-in dates/i)
    expect(BOUNDARY_CAPTION).toMatch(/streaks/i)
    expect(BOUNDARY_CAPTION).toMatch(/milestones/i)
    expect(BOUNDARY_CAPTION).toMatch(/never.*(reflections|notes)/i)
    expect(BOUNDARY_CAPTION).not.toMatch(/warn|urgent|missed|behind|lapse|falling|overdue/i)
  })
})
