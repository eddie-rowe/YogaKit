// Sharing-revocation window decision (005 T051 lib part, FR-049/050/051, Decision #8).
// Presentation-side model only: the app_revoke_signal_sharing RPC and RLS remain the authority.
// Pure: the caller passes `now`. `stopped` is terminal unless an explicit later grant exists.

/** Undo window after a stop-sharing action (FR-049: 5-8 s). */
export const DEFAULT_UNDO_WINDOW_MS = 6000

export type SharingState = 'sharing' | 'undo-pending' | 'stopped'

export interface SharingInput {
  shareSignals: boolean
  /** Epoch ms of the stop action, or null if never revoked. */
  revokedAt: number | null
  /** Epoch ms of an explicit re-grant; only counts when later than revokedAt. */
  grantedAt?: number | null
  now: number
  undoWindowMs: number
}

export function sharingState(input: SharingInput): SharingState {
  const { revokedAt, grantedAt, now, undoWindowMs } = input
  if (revokedAt === null) return 'sharing'
  if (grantedAt != null && grantedAt > revokedAt) return 'sharing'
  return now - revokedAt < undoWindowMs ? 'undo-pending' : 'stopped'
}
