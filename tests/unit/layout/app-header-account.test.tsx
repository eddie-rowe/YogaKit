import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import AppHeader from '@/components/layout/AppHeader'
import AccountMenu from '@/components/layout/AccountMenu'

const { getUserMock, createClientMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  createClientMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('@/components/layout/SyncLabel', () => ({ default: () => null }))
vi.mock('@/lib/supabase/client', () => ({ createClient: createClientMock }))
vi.mock('@/lib/storage/flow-store', () => ({ clearSyncedFlows: vi.fn() }))
vi.mock('@/lib/storage/outbox', () => ({ clearOutbox: vi.fn() }))

function withClient() {
  createClientMock.mockReturnValue({
    auth: {
      getUser: getUserMock,
      signOut: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  withClient()
})

describe('FR-028: sign-in / sign-out reachable from the primary header', () => {
  it('signed out: the header carries a sign-in link to /auth/sign-in, no URL typing', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    render(<AppHeader />)

    const link = await screen.findByTestId('account-sign-in')
    expect(link).toHaveAttribute('href', '/auth/sign-in')
    expect(screen.queryByTestId('account-avatar')).not.toBeInTheDocument()
  })

  it('signed in: sign-out is reachable from the header avatar menu', async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: 'a@b.co', user_metadata: {} } } })
    render(<AppHeader />)

    await userEvent.click(await screen.findByTestId('account-avatar'))
    expect(await screen.findByTestId('account-menu-sign-out')).toBeInTheDocument()
    expect(screen.queryByTestId('account-sign-in')).not.toBeInTheDocument()
  })

  it('sign-in is plain text with no urgency or countdown wording', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    render(<AccountMenu />)
    const link = await screen.findByTestId('account-sign-in')
    expect(link.textContent).toBe('Sign in')
  })
})

describe('RULE-L3/L4: missing Supabase env', () => {
  it('renders no account UI and does not throw', async () => {
    createClientMock.mockImplementation(() => {
      throw new Error('Missing Supabase env')
    })
    expect(() => render(<AppHeader />)).not.toThrow()

    // With no client there is no session to wait for: resolves straight to signed-out.
    await waitFor(() => expect(screen.queryByTestId('account-avatar-pending')).not.toBeInTheDocument())
    expect(screen.queryByTestId('account-avatar')).not.toBeInTheDocument()
    // Primary nav is still there for the offline read view.
    expect(screen.getAllByTestId('nav-flows').length).toBeGreaterThan(0)
  })
})
