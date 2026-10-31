import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import TodayPage from '@/app/today/page'

async function checkIn(mood = 3) {
  await userEvent.click(screen.getByTestId(`sadhana-checkin-mood-${mood}`))
  await userEvent.click(screen.getByTestId('sadhana-checkin-submit'))
}

describe('Today route shell (005 US1, in-memory)', () => {
  it('mounts the check-in form and the paired log actions', () => {
    render(<TodayPage />)
    expect(screen.getByTestId('sadhana-today')).toBeTruthy()
    expect(screen.getByTestId('sadhana-checkin-form')).toBeTruthy()
    expect(screen.getByTestId('sadhana-log-practice')).toBeTruthy()
    expect(screen.getByTestId('sadhana-log-rest')).toBeTruthy()
    expect(screen.getByTestId('sadhana-grace-toggle')).toBeTruthy()
  })

  it('shows no streak before a first practice, rather than a zero', () => {
    render(<TodayPage />)
    expect(screen.queryByTestId('sadhana-streak')).toBeNull()
  })

  it('a check-in updates the in-memory streak', async () => {
    render(<TodayPage />)
    await checkIn()
    expect(within(screen.getByTestId('sadhana-streak')).getByTestId('sadhana-streak-count').textContent).toBe('1')
  })

  it('a second same-day check-in updates rather than adds', async () => {
    render(<TodayPage />)
    await checkIn(2)
    await checkIn(4)
    expect(screen.getByTestId('sadhana-streak-count').textContent).toBe('1')
  })

  it('logging rest never lowers or resets the streak', async () => {
    render(<TodayPage />)
    await checkIn()
    await userEvent.click(screen.getByTestId('sadhana-log-rest'))
    expect(screen.getByTestId('sadhana-streak-count').textContent).toBe('1')
  })

  it('log practice counts the day once', async () => {
    render(<TodayPage />)
    await userEvent.click(screen.getByTestId('sadhana-log-practice'))
    await userEvent.click(screen.getByTestId('sadhana-log-practice'))
    expect(screen.getByTestId('sadhana-streak-count').textContent).toBe('1')
  })
})
