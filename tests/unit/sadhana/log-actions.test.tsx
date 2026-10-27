import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, fireEvent } from '@testing-library/react'
import LogActions from '@/components/sadhana/LogActions'

const SRC = join(__dirname, '..', '..', '..', 'src', 'components', 'sadhana', 'LogActions.tsx')

describe('LogActions (T030)', () => {
  it('renders both actions with identical class set and style', () => {
    render(<LogActions onLogPractice={() => {}} onLogRest={() => {}} />)
    const practice = screen.getByTestId('sadhana-log-practice')
    const rest = screen.getByTestId('sadhana-log-rest')
    expect(practice.className).toBe(rest.className)
    expect(practice.getAttribute('style')).toBe(rest.getAttribute('style'))
  })

  it('names both actions in the same pattern', () => {
    render(<LogActions onLogPractice={() => {}} onLogRest={() => {}} />)
    expect(screen.getByRole('button', { name: 'Log practice' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log rest' })).toBeInTheDocument()
  })

  it('fires each callback once on a single click, with no confirmation step', () => {
    const onLogPractice = vi.fn()
    const onLogRest = vi.fn()
    render(<LogActions onLogPractice={onLogPractice} onLogRest={onLogRest} />)
    fireEvent.click(screen.getByTestId('sadhana-log-practice'))
    expect(onLogPractice).toHaveBeenCalledTimes(1)
    expect(onLogRest).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('sadhana-log-rest'))
    expect(onLogRest).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('carries no guilt, urgency or countdown language', () => {
    const { container } = render(<LogActions onLogPractice={() => {}} onLogRest={() => {}} />)
    const re = /should|must|hurry|now or|last chance|only \d|left|miss|skip|lazy|guilt|streak/i
    expect(container.textContent).not.toMatch(re)
    expect(readFileSync(SRC, 'utf8')).not.toMatch(/guilt|urgent|hurry|miss(ed)?\b/i)
  })
})
