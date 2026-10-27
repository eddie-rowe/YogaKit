import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import CheckinForm from '@/components/sadhana/CheckinForm'

afterEach(() => vi.useRealTimers())

describe('CheckinForm (T021/T022)', () => {
  it('offers mood as a radio group of 3-5 discrete choices, no slider', () => {
    const { container } = render(<CheckinForm onSubmit={() => {}} />)
    const group = screen.getByRole('radiogroup')
    const radios = within(group).getAllByRole('radio')
    expect(radios.length).toBeGreaterThanOrEqual(3)
    expect(radios.length).toBeLessThanOrEqual(5)
    expect(container.querySelector('input[type="range"]')).toBeNull()
    fireEvent.click(radios[1])
    expect(radios[1]).toBeChecked()
    expect(radios[0]).not.toBeChecked()
  })

  it('prefills duration and lets it be edited', () => {
    render(<CheckinForm durationPrefill={35} onSubmit={() => {}} />)
    const input = screen.getByTestId('sadhana-checkin-duration') as HTMLInputElement
    expect(input.value).toBe('35')
    fireEvent.change(input, { target: { value: '20' } })
    expect(input.value).toBe('20')
  })

  it('marks note and flow link optional', () => {
    render(<CheckinForm onSubmit={() => {}} />)
    expect(screen.getByTestId('sadhana-checkin-note')).not.toBeRequired()
    expect(screen.getByTestId('sadhana-checkin-flow')).not.toBeRequired()
  })

  it('always renders the privacy microcopy beside the fields, not behind a link', () => {
    const { container } = render(<CheckinForm onSubmit={() => {}} />)
    const copy = screen.getByTestId('sadhana-checkin-privacy')
    expect(copy).toHaveTextContent('Only you can see this')
    expect(copy).toBeVisible()
    expect(copy.closest('form')).not.toBeNull()
    expect(container.querySelector('a, details')).toBeNull()
  })

  it('computes the local day at submit, not at mount', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    const onSubmit = vi.fn()
    render(<CheckinForm timeZone="UTC" onSubmit={onSubmit} />)
    vi.setSystemTime(new Date('2026-03-11T12:00:00Z'))
    fireEvent.click(within(screen.getByRole('radiogroup')).getAllByRole('radio')[2])
    fireEvent.click(screen.getByTestId('sadhana-checkin-submit'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ localDate: '2026-03-11' })
  })

  it('passes mood, duration, note and flow link to the callback', () => {
    const onSubmit = vi.fn()
    render(<CheckinForm durationPrefill={15} timeZone="UTC" onSubmit={onSubmit} />)
    fireEvent.click(within(screen.getByRole('radiogroup')).getAllByRole('radio')[0])
    fireEvent.change(screen.getByTestId('sadhana-checkin-note'), { target: { value: 'steady' } })
    fireEvent.click(screen.getByTestId('sadhana-checkin-submit'))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ mood: 1, durationMinutes: 15, note: 'steady' })
  })
})
