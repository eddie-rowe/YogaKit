import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import CheckinForm from '@/components/sadhana/CheckinForm'

afterEach(() => vi.useRealTimers())

const at = (iso: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

function submitWith(onSubmit: ReturnType<typeof vi.fn>) {
  fireEvent.click(within(screen.getByRole('radiogroup')).getAllByRole('radio')[2])
  fireEvent.click(screen.getByTestId('sadhana-checkin-submit'))
  return onSubmit.mock.calls[0][0]
}

describe('CheckinForm — bounded "log for yesterday" (T023, FR-006/FR-007)', () => {
  it('shows the control inside the window after local midnight', () => {
    at('2026-03-11T02:00:00Z')
    render(<CheckinForm timeZone="UTC" existing={[]} onSubmit={() => {}} />)
    expect(screen.getByTestId('sadhana-checkin-yesterday')).toBeInTheDocument()
  })

  it('hides the control once the window has passed', () => {
    at('2026-03-11T12:00:00Z')
    render(<CheckinForm timeZone="UTC" existing={[]} onSubmit={() => {}} />)
    expect(screen.queryByTestId('sadhana-checkin-yesterday')).toBeNull()
  })

  it('hides the control when a newer check-in exists', () => {
    at('2026-03-11T02:00:00Z')
    render(
      <CheckinForm timeZone="UTC" existing={[{ localDate: '2026-03-11', kind: 'practice' }]} onSubmit={() => {}} />,
    )
    expect(screen.queryByTestId('sadhana-checkin-yesterday')).toBeNull()
  })

  it('treats an omitted existing list as empty', () => {
    at('2026-03-11T02:00:00Z')
    render(<CheckinForm timeZone="UTC" onSubmit={() => {}} />)
    expect(screen.getByTestId('sadhana-checkin-yesterday')).toBeInTheDocument()
  })

  it('submits yesterday only when the control is on, and today otherwise', () => {
    at('2026-03-11T02:00:00Z')
    const first = vi.fn()
    const { unmount } = render(<CheckinForm timeZone="UTC" existing={[]} onSubmit={first} />)
    expect(submitWith(first).localDate).toBe('2026-03-11')
    unmount()

    const second = vi.fn()
    render(<CheckinForm timeZone="UTC" existing={[]} onSubmit={second} />)
    const toggle = screen.getByTestId('sadhana-checkin-yesterday')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(submitWith(second).localDate).toBe('2026-03-10')
  })

  it('can toggle back to today', () => {
    at('2026-03-11T02:00:00Z')
    const onSubmit = vi.fn()
    render(<CheckinForm timeZone="UTC" existing={[]} onSubmit={onSubmit} />)
    const toggle = screen.getByTestId('sadhana-checkin-yesterday')
    fireEvent.click(toggle)
    fireEvent.click(toggle)
    expect(submitWith(onSubmit).localDate).toBe('2026-03-11')
  })

  it('has no free-form date entry anywhere', () => {
    at('2026-03-11T02:00:00Z')
    const { container } = render(<CheckinForm timeZone="UTC" existing={[]} onSubmit={() => {}} />)
    expect(container.querySelector('input[type="date"], input[type="datetime-local"]')).toBeNull()
  })
})
