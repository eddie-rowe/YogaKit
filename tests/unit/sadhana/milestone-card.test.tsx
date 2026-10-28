import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, fireEvent } from '@testing-library/react'
import MilestoneCard from '@/components/sadhana/MilestoneCard'
import { MILESTONE_THRESHOLDS, nextMilestone } from '@/lib/sadhana/milestones'

const SRC = join(__dirname, '..', '..', '..', 'src', 'components', 'sadhana', 'MilestoneCard.tsx')
const COERCIVE = /defend|protect|maintain|keep (it|your|the) (up|streak|going)|lose|lost|don'?t (break|stop)|upgrade|buy|purchase|subscribe|unlock|premium|offer|discount/i

describe('MilestoneCard (T033)', () => {
  it.each(MILESTONE_THRESHOLDS)('renders the %i-day milestone with its count', (m) => {
    render(<MilestoneCard milestone={m} onDismiss={() => {}} />)
    expect(screen.getByTestId('sadhana-milestone')).toHaveTextContent(String(m))
  })

  it('frames the milestone as an invitation forward', () => {
    render(<MilestoneCard milestone={10} onDismiss={() => {}} />)
    expect(screen.getByTestId('sadhana-milestone-invitation')).not.toBeEmptyDOMElement()
  })

  it('carries no defend/protect/maintain/lose language and no purchase offer in output', () => {
    for (const m of MILESTONE_THRESHOLDS) {
      const { container, unmount } = render(<MilestoneCard milestone={m} onDismiss={() => {}} />)
      expect(container.textContent).not.toMatch(COERCIVE)
      expect(container.querySelector('a, [href]')).toBeNull()
      unmount()
    }
  })

  it('source carries no coercive terms', () => {
    const text = readFileSync(SRC, 'utf8')
    expect(text).not.toMatch(COERCIVE)
  })

  it('dismisses once via the callback with the milestone', () => {
    const onDismiss = vi.fn()
    render(<MilestoneCard milestone={30} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByTestId('sadhana-milestone-dismiss'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledWith(30)
  })

  it('shows one card at a time when two fall on one day, neither lost', () => {
    // Driven by the selection lib: streak 30 with nothing acknowledged queues 10 then 30.
    const acknowledged: number[] = []
    const shown: number[] = []
    const { rerender, container } = render(<MilestoneCard milestone={nextMilestone(30, acknowledged)!} onDismiss={() => {}} />)
    for (let i = 0; i < 2; i++) {
      const m = nextMilestone(30, acknowledged)
      expect(m).not.toBeNull()
      rerender(<MilestoneCard milestone={m!} onDismiss={() => {}} />)
      expect(container.querySelectorAll('[data-testid="sadhana-milestone"]')).toHaveLength(1)
      shown.push(m!)
      acknowledged.push(m!)
    }
    expect(shown).toEqual([10, 30])
    expect(nextMilestone(30, acknowledged)).toBeNull()
  })
})
