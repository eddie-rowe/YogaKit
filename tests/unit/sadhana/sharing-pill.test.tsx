import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import SharingPill from '@/components/sadhana/SharingPill'

const A = { id: 'e1', organizationName: 'Lotus Studio', shareSignals: true }
const B = { id: 'e2', organizationName: 'River Yoga', shareSignals: true }

describe('SharingPill (T046-T048)', () => {
  it('renders nothing with no enrollments', () => {
    const { container } = render(<SharingPill enrollments={[]} onStop={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when no enrollment shares signals', () => {
    const { container } = render(<SharingPill enrollments={[{ ...A, shareSignals: false }]} onStop={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows one pill naming the organization for one enrollment', () => {
    render(<SharingPill enrollments={[A]} onStop={() => {}} />)
    expect(screen.getAllByTestId('sadhana-sharing-pill')).toHaveLength(1)
    expect(screen.getByTestId('sadhana-sharing-pill')).toHaveTextContent('Lotus Studio')
  })

  it('opens a sheet listing what is shared, never content, with a named stop action', () => {
    render(<SharingPill enrollments={[A]} onStop={() => {}} />)
    expect(screen.queryByTestId('sadhana-sharing-sheet')).toBeNull()
    fireEvent.click(screen.getByTestId('sadhana-sharing-pill'))
    const sheet = screen.getByTestId('sadhana-sharing-sheet')
    expect(sheet.textContent).not.toMatch(/reflection|journal|note|mood|energy/i)
    expect(within(sheet).getByTestId('sadhana-sharing-stop')).toHaveTextContent('Stop sharing with Lotus Studio')
  })

  it('stops one enrollment only, leaving the other untouched', () => {
    const onStop = vi.fn()
    render(<SharingPill enrollments={[A, B]} onStop={onStop} />)
    const pills = screen.getAllByTestId('sadhana-sharing-pill')
    expect(pills).toHaveLength(2)
    fireEvent.click(pills[1])
    fireEvent.click(screen.getByTestId('sadhana-sharing-stop'))
    expect(onStop).toHaveBeenCalledTimes(1)
    expect(onStop).toHaveBeenCalledWith('e2')
  })

  it('closes the sheet', () => {
    render(<SharingPill enrollments={[A]} onStop={() => {}} />)
    fireEvent.click(screen.getByTestId('sadhana-sharing-pill'))
    fireEvent.click(screen.getByTestId('sadhana-sharing-close'))
    expect(screen.queryByTestId('sadhana-sharing-sheet')).toBeNull()
  })
})
