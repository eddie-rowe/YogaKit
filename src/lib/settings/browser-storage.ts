/** The browser's localStorage, or null where there is none or reading the property
 *  itself throws (blocked site data raises a SecurityError on access, not only on use).
 *  Kept apart from preferences.ts so that module stays free of global access. */
export function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}
