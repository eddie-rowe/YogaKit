// Initials placeholder for an account with no profile image (005 T068, FR-064, Decision #12).
// Pure: no clock, storage or network. Works on code points so surrogate pairs never split.

export const NEUTRAL_INITIAL = '·'

const LETTER_OR_DIGIT = /[\p{L}\p{N}\p{Extended_Pictographic}]/u

function firstChar(word: string): string | null {
  for (const ch of word) {
    if (LETTER_OR_DIGIT.test(ch)) return ch.toUpperCase()
  }
  return null
}

function fromName(name: string): string | null {
  const parts = name.trim().split(/\s+/).map(firstChar).filter((c): c is string => c !== null)
  if (parts.length === 0) return null
  return parts.length === 1 ? parts[0] : parts[0] + parts[parts.length - 1]
}

export function initialsFor(
  displayName: string | null | undefined,
  email?: string | null,
): string {
  const named = displayName ? fromName(displayName) : null
  if (named) return named
  const local = email ? email.split('@')[0] : ''
  return (local && firstChar(local)) || NEUTRAL_INITIAL
}
