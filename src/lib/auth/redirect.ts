// Shared `next` redirect validation for /auth/callback and /auth/confirm
// (contracts/auth-flows.md). Must start with '/' and must not start with '//' —
// '//evil.com' URL-parses as a protocol-relative host, not a path.
export function safeNextPath(next: string | null): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next
  }
  return '/'
}
