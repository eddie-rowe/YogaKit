import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ReturnCard from '@/components/sadhana/ReturnCard'

const GUILT = /missed|lapse|fail|behind|catch up|streak|lost|broke|urgent|hurry|don'?t|must|shame/i

describe('ReturnCard (T039/T040)', () => {
  const base = { elapsedDays: 9, intention: 'Sit before the house wakes', onKeep: () => {}, onUpdate: () => {}, onRest: () => {} }

  it('states the elapsed time plainly and quotes the intention', () => {
    render(<ReturnCard {...base} />)
    expect(screen.getByTestId('sadhana-return-elapsed')).toHaveTextContent('9 days')
    expect(screen.getByTestId('sadhana-return-intention')).toHaveTextContent('Sit before the house wakes')
  })

  it('uses the singular for one day', () => {
    render(<ReturnCard {...base} elapsedDays={1} />)
    expect(screen.getByTestId('sadhana-return-elapsed')).toHaveTextContent('1 day')
    expect(screen.getByTestId('sadhana-return-elapsed')).not.toHaveTextContent('1 days')
  })

  it('omits the quote when no intention was active', () => {
    render(<ReturnCard {...base} intention={null} />)
    expect(screen.queryByTestId('sadhana-return-intention')).toBeNull()
  })

  it('renders keep and update with identical class weight, plus the resting response', () => {
    render(<ReturnCard {...base} />)
    const keep = screen.getByTestId('sadhana-return-keep')
    const update = screen.getByTestId('sadhana-return-update')
    expect(keep.className).toBe(update.className)
    expect(keep.getAttribute('style')).toBe(update.getAttribute('style'))
    expect(screen.getByTestId('sadhana-return-rest')).toHaveTextContent("I'm resting, not stopping")
  })

  it('fires each callback', () => {
    const onKeep = vi.fn()
    const onUpdate = vi.fn()
    const onRest = vi.fn()
    render(<ReturnCard {...base} onKeep={onKeep} onUpdate={onUpdate} onRest={onRest} />)
    fireEvent.click(screen.getByTestId('sadhana-return-keep'))
    fireEvent.click(screen.getByTestId('sadhana-return-update'))
    fireEvent.click(screen.getByTestId('sadhana-return-rest'))
    expect(onKeep).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onRest).toHaveBeenCalledTimes(1)
  })

  it('frames nothing as a lapse and proposes no catching up', () => {
    const { container } = render(<ReturnCard {...base} />)
    expect(container.textContent).not.toMatch(GUILT)
  })
})
