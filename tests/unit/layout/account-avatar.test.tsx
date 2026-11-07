import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AccountAvatar from '@/components/layout/AccountAvatar'

describe('AccountAvatar (005 T067, FR-063/FR-064)', () => {
  it('shows initials from the lib when no image is set', () => {
    render(<AccountAvatar displayName="Ada Lovelace" email="ada@example.com" />)
    expect(screen.getByTestId('account-avatar-initials').textContent).toBe('AL')
    expect(screen.queryByTestId('account-avatar-image')).toBeNull()
  })

  it('falls back to the email local-part, then the neutral glyph', () => {
    const { rerender } = render(<AccountAvatar displayName={null} email="sam@example.com" />)
    expect(screen.getByTestId('account-avatar-initials').textContent).toBe('S')
    rerender(<AccountAvatar displayName={null} email={null} />)
    expect(screen.getByTestId('account-avatar-initials').textContent).toBe('·')
  })

  it('renders the profile image when set, instead of initials', () => {
    render(<AccountAvatar displayName="Ada Lovelace" imageUrl="https://example.com/a.png" />)
    const img = screen.getByTestId('account-avatar-image') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('https://example.com/a.png')
    expect(img.getAttribute('alt')).toBe('')
    expect(screen.queryByTestId('account-avatar-initials')).toBeNull()
  })

  it('meets the 44px nav-tab touch target and has an accessible name', () => {
    render(<AccountAvatar displayName="Ada Lovelace" />)
    const root = screen.getByTestId('account-avatar-root')
    expect(root.className).toContain('min-h-11')
    expect(root.className).toContain('min-w-11')
    expect(root.getAttribute('role')).toBe('img')
    expect(root.getAttribute('aria-label')).toBe('Account — Ada Lovelace')
  })

  it('names the account by email when there is no display name', () => {
    render(<AccountAvatar email="ada@example.com" />)
    expect(screen.getByTestId('account-avatar-root').getAttribute('aria-label')).toBe(
      'Account — ada@example.com',
    )
  })

  it('uses a plain "Account" name when nothing identifies the user', () => {
    render(<AccountAvatar />)
    expect(screen.getByTestId('account-avatar-root').getAttribute('aria-label')).toBe('Account')
  })
})
