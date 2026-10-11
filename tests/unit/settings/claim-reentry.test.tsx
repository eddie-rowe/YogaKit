import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import SecuritySection from '@/app/settings/sections/SecuritySection'
import { CLAIM_DECISION_KEY } from '@/lib/storage/claim-decision'
import { itemize } from '@/lib/settings/claim'

const flows = [{ title: 'Morning' }, { title: 'Evening' }]

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(window, 'location', { configurable: true, value: { assign: vi.fn() } })
})
afterEach(() => localStorage.clear())

describe('claim re-entry (FR-024, SC-009, RULE-C2)', () => {
  it('a declined claim leaves a way back that clears the decision and returns to the prompt host', async () => {
    localStorage.setItem(CLAIM_DECISION_KEY, 'true')
    render(<SecuritySection email="a@b.co" provider="google" />)

    await userEvent.click(await screen.findByTestId('settings-claim-flows-reopen'))

    expect(localStorage.getItem(CLAIM_DECISION_KEY)).toBeNull()
    expect(window.location.assign).toHaveBeenCalledWith('/')
  })

  it('the prompt lists the same names before and after re-entry', () => {
    const before = itemize(flows)
    localStorage.setItem(CLAIM_DECISION_KEY, 'true')
    localStorage.removeItem(CLAIM_DECISION_KEY)
    expect(itemize(flows)).toEqual(before)
    expect(itemize(flows).names).toEqual(['Morning', 'Evening'])
  })

  it('offers no way back before a decision exists', () => {
    render(<SecuritySection email="a@b.co" provider="google" />)
    expect(screen.queryByTestId('settings-claim-flows-reopen')).not.toBeInTheDocument()
  })

  it('re-entry is plain: no badge, counter, or reminder markup', async () => {
    localStorage.setItem(CLAIM_DECISION_KEY, 'true')
    render(<SecuritySection email="a@b.co" provider="google" />)
    const entry = await screen.findByTestId('settings-claim-flows-reopen')

    expect(entry.children).toHaveLength(0)
    expect(entry.textContent).not.toMatch(/\d/)
    expect(entry.querySelector('[class*="badge"],[role="status"]')).toBeNull()
    expect(entry.getAttribute('aria-label')).toBeNull()
  })

  it('stays quiet when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    render(<SecuritySection email="a@b.co" provider="google" />)
    expect(screen.queryByTestId('settings-claim-flows-reopen')).not.toBeInTheDocument()
    spy.mockRestore()
  })
})
