// Shared `next` redirect validation for /auth/callback and /auth/confirm
// (contracts/auth-flows.md).
//
// This guards an open redirect on the authentication path: an attacker who can
// get someone to open /auth/sign-in?next=<hostile> lands them on a foreign
// origin immediately after a successful Google sign-in, which is the most
// credible possible moment to phish them. Supabase's uri_allow_list does not
// help — it validates the redirect to /auth/callback, which is legitimate; the
// `next` hop after that is entirely ours to police.
//
// A prefix check on the raw string is not sufficient, because the caller then
// feeds the result to `new URL(next, origin)`, and WHATWG URL parsing rewrites
// backslashes to forward slashes for special schemes. So '/\evil.com' passes
// "starts with / and not //" and still resolves to https://evil.com/. Rather
// than blocklisting that character and whatever the next equivalent turns out
// to be, resolve the candidate first and then require that it did not leave
// this origin.

const SENTINEL_ORIGIN = 'https://redirect.invalid'

/** Returns a path that is guaranteed to stay on the caller's own origin, or
 *  '/' if the candidate is absent, malformed, or points anywhere else. The
 *  return value is always a root-relative path, never an absolute URL. */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/')) return '/'

  let resolved: URL
  try {
    resolved = new URL(next, SENTINEL_ORIGIN)
  } catch {
    return '/'
  }

  // Anything that escaped to another origin — '//evil.com', '/\evil.com', or a
  // scheme that slipped past the leading-slash check — fails here.
  if (resolved.origin !== SENTINEL_ORIGIN) return '/'

  // Rebuild from the parsed parts rather than returning the raw input, so the
  // caller's own `new URL(next, origin)` cannot re-parse it into something else.
  return `${resolved.pathname}${resolved.search}${resolved.hash}`
}
