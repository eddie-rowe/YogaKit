import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusPill, { STATUS_LABELS, STATUS_KEYS } from '@/components/sadhana/StatusPill'

const BANNED_WORDS = /absent|missing|behind|overdue|lapsed|at risk|inactive|stopped|failed/i
const WARNING_TOKENS = /red|amber|orange|yellow|warn|danger|error/i

describe('StatusPill (T053)', () => {
  it.each(STATUS_KEYS)('renders the label for %s', (key) => {
    render(<StatusPill status={key} />)
    expect(screen.getByTestId('sadhana-status-pill').textContent).toBe(STATUS_LABELS[key])
  })

  it('labels carry no punitive vocabulary', () => {
    for (const label of Object.values(STATUS_LABELS)) expect(label).not.toMatch(BANNED_WORDS)
  })

  it('uses neutral tokens only, no warning colour', () => {
    for (const key of STATUS_KEYS) {
      const { unmount } = render(<StatusPill status={key} />)
      const el = screen.getByTestId('sadhana-status-pill')
      expect(`${el.className} ${el.getAttribute('style') ?? ''}`).not.toMatch(WARNING_TOKENS)
      unmount()
    }
  })

  it('has no representation for a student who stopped sharing (FR-058)', () => {
    expect(STATUS_KEYS.length).toBeGreaterThan(0)
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([...STATUS_KEYS].sort())
    expect(STATUS_KEYS.join(' ')).not.toMatch(/stop|revok|unshar|hidden/i)
  })
})
