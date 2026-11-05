import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardRow from '@/components/sadhana/DashboardRow'
import type { DashboardRow as Row } from '@/lib/sadhana/dashboard-row'

const GUILT = /missed|lapse|lapsed|fail|behind|overdue|absent|inactive|at risk|urgent|reset|lost|broke|shame/i
const row: Row = { studentName: 'Asha', daysSinceLastCheckin: 3, streak: 12, milestoneProgress: 2 }

describe('DashboardRow (T052 UI half, FR-053/054/055)', () => {
  it('renders name, status pill, streak, days since last check-in and milestone progress', () => {
    render(<DashboardRow row={row} status="practicing" />)
    expect(screen.getByTestId('sadhana-dashboard-row-name')).toHaveTextContent('Asha')
    expect(screen.getByTestId('sadhana-status-pill')).toHaveTextContent('Practicing')
    expect(screen.getByTestId('sadhana-dashboard-row-streak')).toHaveTextContent('12')
    expect(screen.getByTestId('sadhana-dashboard-row-last-checkin')).toHaveTextContent('3 days ago')
    expect(screen.getByTestId('sadhana-dashboard-row-milestones')).toHaveTextContent('2')
  })

  it('uses singular wording and says "today" for zero days', () => {
    const { rerender } = render(<DashboardRow row={{ ...row, daysSinceLastCheckin: 1 }} status="practicing" />)
    expect(screen.getByTestId('sadhana-dashboard-row-last-checkin')).toHaveTextContent('1 day ago')
    rerender(<DashboardRow row={{ ...row, daysSinceLastCheckin: 0 }} status="practicing" />)
    expect(screen.getByTestId('sadhana-dashboard-row-last-checkin')).toHaveTextContent('today')
  })

  it('renders nothing for null days since last check-in, implying no lapse', () => {
    const { container } = render(<DashboardRow row={{ ...row, daysSinceLastCheckin: null }} status="new" />)
    expect(screen.queryByTestId('sadhana-dashboard-row-last-checkin')).toBeNull()
    expect(container.textContent).not.toMatch(GUILT)
    expect(container.textContent).not.toMatch(/never|no check-in|none/i)
  })

  it('renders no streak when there is none, never a zero or a reset', () => {
    const { container } = render(<DashboardRow row={{ ...row, streak: 0 }} status="new" />)
    expect(screen.queryByTestId('sadhana-dashboard-row-streak')).toBeNull()
    expect(container.textContent).not.toMatch(/\b0\b/)
    expect(container.textContent).not.toMatch(GUILT)
  })

  it('carries no warning colour and no boundary caption per row', () => {
    const { container } = render(<DashboardRow row={row} status="returning" />)
    expect(container.innerHTML).not.toMatch(/red|amber|orange|yellow|warn|danger|error/i)
    expect(screen.queryByTestId('sadhana-boundary-caption')).toBeNull()
  })

  it('exposes only the four FR-053 fields plus status, no practice content (FR-055)', () => {
    const { container } = render(
      <DashboardRow row={{ ...row, reflection: 'private', intention: 'secret', note: 'x' } as Row} status="practicing" />,
    )
    expect(container.textContent).not.toMatch(/private|secret/)
  })
})
