import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReturnCard from '@/components/sadhana/ReturnCard'
import { activeIntentionAtLapseStart } from '@/lib/sadhana/return-card'

// SC-010 composed: revision lookup -> card render (T045). FR-026/027/034.
const REVISIONS = [
  { createdAt: '2026-01-01', text: 'Sit before the house wakes' },
  { createdAt: '2026-02-01', text: 'Move for ten minutes' },
  { createdAt: '2026-03-01', text: 'Breathe at noon' },
]

function renderFor(lapseStart: string, revisions: typeof REVISIONS) {
  const active = activeIntentionAtLapseStart(revisions, lapseStart)
  return render(
    <ReturnCard
      elapsedDays={9}
      intention={active ? active.text : null}
      onKeep={() => {}}
      onUpdate={() => {}}
      onRest={() => {}}
    />,
  )
}

describe('SC-010: the return card quotes the intention active at lapse start', () => {
  it('quotes revision 1 when the lapse began between revision 1 and 2', () => {
    renderFor('2026-01-15', REVISIONS)
    const quote = screen.getByTestId('sadhana-return-intention')
    expect(quote).toHaveTextContent('Sit before the house wakes')
    expect(quote).not.toHaveTextContent('Breathe at noon')
    expect(quote).not.toHaveTextContent('Move for ten minutes')
  })

  it('quotes the newest revision when the lapse began after every revision', () => {
    renderFor('2026-04-01', REVISIONS)
    expect(screen.getByTestId('sadhana-return-intention')).toHaveTextContent('Breathe at noon')
  })

  it('renders no quote and invents nothing when no intention existed yet (FR-034)', () => {
    renderFor('2025-12-31', REVISIONS)
    expect(screen.queryByTestId('sadhana-return-intention')).toBeNull()
    expect(screen.queryByRole('blockquote')).toBeNull()
  })
})
