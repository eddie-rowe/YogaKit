import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, fireEvent } from '@testing-library/react'
import StreakDisplay from '@/components/sadhana/StreakDisplay'
import GraceBudgetDetail from '@/components/sadhana/GraceBudgetDetail'

const DIR = join(__dirname, '..', '..', '..', 'src', 'components', 'sadhana')
const practice = (d: string) => ({ localDate: d, kind: 'practice' as const })

describe('StreakDisplay (T029)', () => {
  it('shows the count of practised days', () => {
    render(<StreakDisplay streak={12} />)
    expect(screen.getByTestId('sadhana-streak-count')).toHaveTextContent('12')
  })

  it('renders nothing before a first practice rather than a zero', () => {
    const { container } = render(<StreakDisplay streak={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('has no warning, urgency, countdown or at-risk variant', () => {
    const { container } = render(<StreakDisplay streak={3} />)
    expect(container.innerHTML).not.toMatch(/warn|danger|risk|urgent|countdown|expire|lose|lost|missed|reset/i)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('component sources carry no warning variant or repair affordance', () => {
    const files = readdirSync(DIR)
      .filter((n) => /\.tsx?$/.test(n))
      .map((n) => ({ path: n, text: readFileSync(join(DIR, n), 'utf8') }))
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) expect(f.text).not.toMatch(/(repair|restore|undo|recover|fix|reset|rescue|revive)[-_ ]?((my|your|the|a)[-_ ]?)?streak|streak[-_ ]?(repair|restore|undo|recover|fix|rescue|revive)/i)
    for (const f of files) expect(f.text).not.toMatch(/warning|danger|at-?risk|countdown|variant/i)
  })
})

describe('GraceBudgetDetail (T032)', () => {
  const budget = { size: 3, periodDays: 30 }

  it('is collapsed until requested', () => {
    render(<GraceBudgetDetail checkins={[practice('2026-10-01')]} today="2026-10-03" budget={budget} />)
    expect(screen.queryByTestId('sadhana-grace-detail')).toBeNull()
    fireEvent.click(screen.getByTestId('sadhana-grace-toggle'))
    expect(screen.getByTestId('sadhana-grace-detail')).toBeInTheDocument()
  })

  it('reads sensibly with nothing used', () => {
    render(<GraceBudgetDetail checkins={[practice('2026-10-01'), practice('2026-10-02')]} today="2026-10-02" budget={budget} />)
    fireEvent.click(screen.getByTestId('sadhana-grace-toggle'))
    expect(screen.getByTestId('sadhana-grace-detail')).toHaveTextContent('0 of 3')
  })

  it('reads calmly when fully used, with no consequence framing', () => {
    render(<GraceBudgetDetail checkins={[practice('2026-10-01')]} today="2026-10-20" budget={budget} />)
    fireEvent.click(screen.getByTestId('sadhana-grace-toggle'))
    const detail = screen.getByTestId('sadhana-grace-detail')
    expect(detail).toHaveTextContent('3 of 3')
    expect(detail.innerHTML).not.toMatch(/warn|danger|risk|urgent|lose|lost|reset|exhaust|penalt/i)
  })
})
