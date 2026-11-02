import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import UndoToast, { clampDuration } from '@/components/sadhana/UndoToast'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('UndoToast (T050)', () => {
  it('fires onExpire once after the default 6000ms window', () => {
    const onExpire = vi.fn()
    render(<UndoToast onUndo={vi.fn()} onExpire={onExpire} />)
    act(() => vi.advanceTimersByTime(5999))
    expect(onExpire).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    act(() => vi.advanceTimersByTime(20000))
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('undo cancels expiry', () => {
    const onUndo = vi.fn()
    const onExpire = vi.fn()
    render(<UndoToast onUndo={onUndo} onExpire={onExpire} />)
    fireEvent.click(screen.getByTestId('sadhana-undo-toast-undo'))
    act(() => vi.advanceTimersByTime(20000))
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('clamps the duration to 5000-8000ms', () => {
    expect(clampDuration(1000)).toBe(5000)
    expect(clampDuration(6500)).toBe(6500)
    expect(clampDuration(60000)).toBe(8000)
    expect(clampDuration(undefined)).toBe(6000)
  })

  it('honours a clamped durationMs', () => {
    const onExpire = vi.fn()
    render(<UndoToast onUndo={vi.fn()} onExpire={onExpire} durationMs={100} />)
    act(() => vi.advanceTimersByTime(4999))
    expect(onExpire).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('is a polite status, not a blocking dialog, with no new token and ≤200ms motion', () => {
    const { container } = render(<UndoToast onUndo={vi.fn()} onExpire={vi.fn()} />)
    const toast = screen.getByTestId('sadhana-undo-toast')
    expect(toast).toHaveAttribute('role', 'status')
    expect(container.querySelector('[role="dialog"], [role="alertdialog"]')).toBeNull()
    expect(container.innerHTML).not.toMatch(/--(?!accent|surface|foreground|muted)[a-z-]+:/)
    expect(container.innerHTML).not.toMatch(/(?:duration|transition)[^"]*\b(?:[3-9]\d{2}|\d{4,})ms/)
  })
})
