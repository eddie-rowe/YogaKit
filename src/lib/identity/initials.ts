// Initials for the header account avatar.
//
// 005 FR-064: the avatar MUST show an initials-based placeholder when no profile
// image is set — and there is no profile image at all, by decision: a monogram
// costs no third-party request, survives an offline load, and keeps the interface
// at one accent (docs/krama-guardrails.md §2). A blank or broken-image avatar
// reads as an error state (docs/design-research/20-navigation-ia.md, open decision 12).
//
// Ported from NextMove's src/lib/initials.ts, with one deliberate divergence: the
// '?' fallback is unreachable here because `email` is required. An avatar that
// renders a question mark at a person who is demonstrably signed in is worse than
// any letter we could pick.

/** The identity the header needs, and nothing more. */
export interface SessionIdentity {
  name: string | null
  email: string
  initials: string
}

/**
 * Two letters from a multi-word name, one from a single word, otherwise the first
 * letter of the email local part. Always returns at least one character.
 */
export function deriveInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (firstChar(parts[0]) + firstChar(parts[parts.length - 1])).toUpperCase()
    }
    if (parts.length === 1) {
      return firstChar(parts[0]).toUpperCase()
    }
  }

  // The email local part is the floor: `getUser()` cannot return a user without
  // one, so this branch always produces a letter for a signed-in practitioner.
  const local = email.split('@')[0]?.trim() ?? ''
  if (local) return firstChar(local).toUpperCase()

  // Only reachable with a malformed email (e.g. '@example.com').
  return '·'
}

/** Array indexing splits surrogate pairs; the spread walks code points instead, so
 *  an emoji or an astral-plane character yields one whole glyph rather than half of one. */
function firstChar(word: string): string {
  return [...word][0] ?? ''
}

/** Convenience for the header: derive once, carry the three fields together. */
export function toSessionIdentity(name: string | null, email: string): SessionIdentity {
  return { name, email, initials: deriveInitials(name, email) }
}
