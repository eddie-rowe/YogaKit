import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import AccountMenu from '@/components/layout/AccountMenu'

const {
  getUserMock,
  signOutMock,
  onAuthStateChangeMock,
  clearSyncedFlowsMock,
  clearAllFlowsMock,
  clearOutboxMock,
} = vi.hoisted(() => ({
    getUserMock: vi.fn(),
    signOutMock: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChangeMock: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    clearSyncedFlowsMock: vi.fn().mockResolvedValue(0),
    clearAllFlowsMock: vi.fn().mockResolvedValue(undefined),
    clearOutboxMock: vi.fn().mockResolvedValue(undefined),
  }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: getUserMock,
      signOut: signOutMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  }),
}))

vi.mock('@/lib/storage/flow-store', () => ({
  clearSyncedFlows: clearSyncedFlowsMock,
  clearAllFlows: clearAllFlowsMock,
}))

vi.mock('@/lib/storage/outbox', () => ({ clearOutbox: clearOutboxMock }))

function signedIn(metadata: Record<string, unknown> = { full_name: 'Synthetics Testing' }) {
  getUserMock.mockResolvedValue({
    data: { user: { email: 'syntheticstesting@gmail.com', user_metadata: metadata } },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  onAuthStateChangeMock.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  // window.location.assign is not implemented in jsdom and sign-out calls it.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { assign: vi.fn() },
  })
})

describe('AccountMenu', () => {
  it('holds the avatar’s space while the session resolves, rather than shifting the header', async () => {
    signedIn()
    render(<AccountMenu />)

    // Before resolution: a placeholder in the same box, not nothing and not
    // "Sign in" flashed at someone who is already signed in.
    expect(screen.getByTestId('account-avatar-pending')).toBeInTheDocument()
    expect(screen.queryByTestId('account-sign-in')).not.toBeInTheDocument()

    await waitFor(() => expect(screen.getByTestId('account-avatar')).toBeInTheDocument())
    expect(screen.queryByTestId('account-avatar-pending')).not.toBeInTheDocument()
  })

  it('shows a sign-in link when there is no session', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    render(<AccountMenu />)

    await waitFor(() => expect(screen.getByTestId('account-sign-in')).toBeInTheDocument())
    expect(screen.queryByTestId('account-avatar')).not.toBeInTheDocument()
  })

  it('renders initials from the Google display name', async () => {
    signedIn()
    render(<AccountMenu />)

    await waitFor(() => expect(screen.getByTestId('account-avatar')).toHaveTextContent('ST'))
  })

  it('falls back to the email when the provider supplied no name', async () => {
    signedIn({})
    render(<AccountMenu />)

    await waitFor(() => expect(screen.getByTestId('account-avatar')).toHaveTextContent('S'))
  })

  it('opens a menu with the identity and a route to settings', async () => {
    signedIn()
    render(<AccountMenu />)
    await waitFor(() => expect(screen.getByTestId('account-avatar')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('account-avatar'))

    expect(await screen.findByTestId('account-menu-name')).toHaveTextContent('Synthetics Testing')
    expect(screen.getByTestId('account-menu-email')).toHaveTextContent('syntheticstesting@gmail.com')
    expect(screen.getByTestId('account-menu-settings')).toHaveAttribute('href', '/settings')
  })

  it('confirms before signing out, and clears only account-derived flows', async () => {
    signedIn()
    render(<AccountMenu />)
    await waitFor(() => expect(screen.getByTestId('account-avatar')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('account-avatar'))
    await userEvent.click(await screen.findByTestId('account-menu-sign-out'))

    // The menu must not have taken the dialog down with it on close.
    const confirm = await screen.findByTestId('account-sign-out-confirm')
    expect(signOutMock).not.toHaveBeenCalled()

    await userEvent.click(confirm)

    await waitFor(() => expect(clearSyncedFlowsMock).toHaveBeenCalled())
    // RULE-L4: work authored on this device before any account existed survives.
    expect(clearAllFlowsMock).not.toHaveBeenCalled()
    // The queue belonged to the session that just ended — it must not flush into the
    // next account on a shared device.
    await waitFor(() => expect(clearOutboxMock).toHaveBeenCalled())
    expect(window.location.assign).toHaveBeenCalledWith('/')
  })

  it('does not sign out when the confirmation is cancelled', async () => {
    signedIn()
    render(<AccountMenu />)
    await waitFor(() => expect(screen.getByTestId('account-avatar')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('account-avatar'))
    await userEvent.click(await screen.findByTestId('account-menu-sign-out'))
    await userEvent.click(await screen.findByTestId('account-sign-out-cancel'))

    expect(signOutMock).not.toHaveBeenCalled()
    expect(clearSyncedFlowsMock).not.toHaveBeenCalled()
    expect(clearOutboxMock).not.toHaveBeenCalled()
  })
})
