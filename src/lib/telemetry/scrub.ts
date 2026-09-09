/**
 * Telemetry scrubber — the pure half of 008 US4.
 *
 * RULE-L7 (constitution v3.0.0, Principle VI): telemetry carries page views, errors,
 * and web vitals only — never pose, flow, note, journal, mood, or energy content. This
 * module is the one place that rule gets enforced for RUM before anything leaves the
 * browser: view and resource URLs are allow-listed, while free-text error messages
 * are never transmitted.
 *
 * No I/O, no Datadog SDK import, no `window`/`document` reference — this file is a
 * function of its arguments, same split as `scripts/lib/copy-lint.mjs`. That is what
 * lets `src/instrumentation-client.ts` wire it into RUM's `beforeSend` and still have
 * something independently testable: a privacy gate nobody has tested is exactly the
 * kind of check that quietly stops matching.
 */

/**
 * Dynamic route segments that carry user-authored or content-bearing identifiers in
 * their URL. Each pattern's capture group is replaced by its bracketed name. Ordered
 * so a more specific pattern (e.g. `/org/[orgId]/members`) is tried before a shorter
 * one that would otherwise match a prefix of it.
 */
const ROUTE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /^\/poses\/[^/]+\/?$/, replacement: '/poses/[slug]' },
  { pattern: /^\/read\/[^/]+\/?$/, replacement: '/read/[id]' },
  { pattern: /^\/flows\/[^/]+\/?$/, replacement: '/flows/[id]' },
  { pattern: /^\/sequences\/[^/]+\/?$/, replacement: '/sequences/[id]' },
  { pattern: /^\/compose\/[^/]+\/?$/, replacement: '/compose/[id]' },
  { pattern: /^\/org\/[^/]+\/members\/?$/, replacement: '/org/[orgId]/members' },
  { pattern: /^\/org\/[^/]+\/?$/, replacement: '/org/[orgId]' },
]

const STATIC_ROUTES = new Set([
  '/',
  '/account',
  '/auth/sign-in',
  '/compose',
  '/dimensions',
  '/flows',
  '/flows/shared',
  '/learn',
  '/org/invitations/accept',
  '/org/new',
  '/poses',
  '/sequence',
  '/sequence/export',
  '/sequences',
  '/settings',
])

const RESOURCE_ROUTES = new Set([
  ...STATIC_ROUTES,
  '/api/generate',
  '/api/org/invitations',
  '/auth/callback',
  '/auth/confirm',
  '/book',
  '/book.html',
  '/manifest.json',
  '/sw.js',
])

function pathname(url: string): string | null {
  try {
    return new URL(url, 'https://yoga-kit.vercel.app').pathname.replace(/\/$/, '') || '/'
  } catch {
    return null
  }
}

/**
 * Rewrite a view URL so no dynamic segment reaches Datadog verbatim. Query string and
 * hash are dropped entirely — neither can be validated to be identifier-only, and
 * FR-020 treats an unproven attribute as unsafe.
 *
 * Accepts a full URL or a bare path; returns a path only, since the origin carries no
 * content risk but the query/hash might.
 */
export function scrubViewUrl(url: string): string {
  const path = pathname(url)
  if (!path) return '/[unknown]'

  for (const { pattern, replacement } of ROUTE_PATTERNS) {
    if (pattern.test(path)) return replacement
  }
  return STATIC_ROUTES.has(path) ? path : '/[unknown]'
}

/**
 * Preserve only resource paths that are operationally useful and known not to carry
 * user content. Third-party paths and newly introduced application paths collapse to
 * a sentinel until they are reviewed and explicitly added here.
 */
export function scrubResourceUrl(url: string, applicationOrigin: string): string {
  let parsed: URL
  try {
    parsed = new URL(url, applicationOrigin)
  } catch {
    return '/[resource]'
  }

  if (parsed.origin !== applicationOrigin) return `${parsed.origin}/[resource]`

  const path = parsed.pathname.replace(/\/$/, '') || '/'
  if (path.startsWith('/_next/')) return path
  for (const { pattern, replacement } of ROUTE_PATTERNS) {
    if (pattern.test(path)) return replacement
  }
  return RESOURCE_ROUTES.has(path) ? path : '/[resource]'
}

/**
 * Error messages are arbitrary free text and cannot be proven safe. Preserve the
 * presence of an error while removing the message value wholesale.
 */
export function scrubErrorMessage(message: string): string {
  return message ? '[redacted]' : message
}

/** Keep stack frames for source-map resolution, but remove the free-text first line. */
export function scrubErrorStack(stack: string | undefined): string | undefined {
  if (!stack) return stack
  const [, ...frames] = stack.split('\n')
  return ['[redacted]', ...frames.map((frame) => frame.replace(/([?#])[^\s)]+/g, ''))].join('\n')
}
