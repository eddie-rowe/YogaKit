import { initialsFor } from '@/lib/account/initials'

// The account avatar as a presentational header element (005 T067, FR-063/FR-064).
// Standalone — deliberately not a navigation entry. Not mounted yet: AccountMenu
// keeps its own trigger until a later task swaps it in without behaviour change.
//
// Touch target: 44px (min-h-11/min-w-11), the same minimum the nav tabs meet.

export type AccountAvatarProps = {
  displayName?: string | null
  email?: string | null
  /** Profile image URL. Absent → initials placeholder (FR-064). */
  imageUrl?: string | null
}

export default function AccountAvatar({ displayName, email, imageUrl }: AccountAvatarProps) {
  const who = displayName || email
  return (
    <span
      data-testid="account-avatar-root"
      role="img"
      aria-label={who ? `Account — ${who}` : 'Account'}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote profile image; alt is empty because the wrapper carries the name
        <img
          data-testid="account-avatar-image"
          src={imageUrl}
          alt=""
          className="h-9 w-9 rounded-full object-cover"
        />
      ) : (
        <span
          data-testid="account-avatar-initials"
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium"
          style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          {initialsFor(displayName, email)}
        </span>
      )}
    </span>
  )
}
