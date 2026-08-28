import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ClaimFlowsPrompt from '@/app/onboarding/ClaimFlowsPrompt'

const CLAIM_DECISION_KEY = 'krama-claim-flows-decided'

const { insertMock, fromMock, getUserMock, getAllFlowsMock, sampleFlow } = vi.hoisted(() => {
  const sampleFlow = {
    id: 'local-flow-1',
    title: 'Sunrise flow',
    items: [],
    phases: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: false,
    schema_version: '0.1.0',
  }
  const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })
  return {
    sampleFlow,
    insertMock,
    fromMock: vi.fn().mockReturnValue({ insert: insertMock }),
    getUserMock: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    getAllFlowsMock: vi.fn().mockResolvedValue([sampleFlow]),
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}))

vi.mock('@/lib/storage/flow-store', () => ({
  getAllFlows: getAllFlowsMock,
}))

beforeEach(() => {
  localStorage.clear()
  insertMock.mockClear()
  fromMock.mockClear()
  getUserMock.mockClear()
  getAllFlowsMock.mockClear().mockResolvedValue([sampleFlow])
})

afterEach(() => {
  localStorage.clear()
})

describe('ClaimFlowsPrompt', () => {
  it('shows the prompt once when local flows exist and no decision is recorded', async () => {
    render(<ClaimFlowsPrompt />)

    expect(await screen.findByTestId('onboarding-claim-flows')).toBeInTheDocument()
  })

  it('does not render when a claim decision was already recorded', async () => {
    localStorage.setItem(CLAIM_DECISION_KEY, 'true')
    render(<ClaimFlowsPrompt />)

    await waitFor(() => expect(getUserMock).not.toHaveBeenCalled())
    expect(screen.queryByTestId('onboarding-claim-flows')).not.toBeInTheDocument()
  })

  it('claiming inserts one claimed_flows row per local flow and records the decision', async () => {
    const user = userEvent.setup()
    render(<ClaimFlowsPrompt />)

    await user.click(await screen.findByTestId('onboarding-claim-flows-claim'))

    await waitFor(() => expect(fromMock).toHaveBeenCalledWith('claimed_flows'))
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({ user_id: 'user-1', source_flow_id: 'local-flow-1' }),
    ])
    expect(localStorage.getItem(CLAIM_DECISION_KEY)).toBe('true')
    await waitFor(() => expect(screen.queryByTestId('onboarding-claim-flows')).not.toBeInTheDocument())
  })

  it('declining records the decision without writing to claimed_flows', async () => {
    const user = userEvent.setup()
    render(<ClaimFlowsPrompt />)

    await user.click(await screen.findByTestId('onboarding-claim-flows-decline'))

    expect(insertMock).not.toHaveBeenCalled()
    expect(localStorage.getItem(CLAIM_DECISION_KEY)).toBe('true')
    expect(screen.queryByTestId('onboarding-claim-flows')).not.toBeInTheDocument()
  })
})
