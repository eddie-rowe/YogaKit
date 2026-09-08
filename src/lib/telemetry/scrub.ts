/**
 * Telemetry scrubber — the pure half of 008 US4.
 *
 * RULE-L7 (constitution v3.0.0, Principle VI): telemetry carries page views, errors,
 * and web vitals only — never pose, flow, note, journal, mood, or energy content. This
 * module is the one place that rule gets enforced for RUM before anything leaves the
 * browser: `scrubViewUrl` parameterizes every dynamic route segment, and
 * `scrubErrorMessage` strips quoted/free-text content out of error strings.
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

/**
 * Rewrite a view URL so no dynamic segment reaches Datadog verbatim. Query string and
 * hash are dropped entirely — neither can be validated to be identifier-only, and
 * FR-020 treats an unproven attribute as unsafe.
 *
 * Accepts a full URL or a bare path; returns a path only, since the origin carries no
 * content risk but the query/hash might.
 */
export function scrubViewUrl(url: string): string {
  let path: string
  try {
    path = new URL(url, 'https://yoga-kit.vercel.app').pathname
  } catch {
    path = url.split('?')[0].split('#')[0]
  }

  for (const { pattern, replacement } of ROUTE_PATTERNS) {
    if (pattern.test(path)) return replacement
  }
  return path
}

/**
 * Strip content-bearing text out of an error message before it leaves the browser.
 * Quoted substrings (the most common way a pose name, flow title, or note fragment
 * ends up interpolated into an Error's message) are replaced wholesale; any
 * `/poses/<slug>`-shaped or `/read/<id>`-shaped substring embedded in the message
 * (e.g. from a failed `fetch(url)`) is run through `scrubViewUrl` as well.
 */
export function scrubErrorMessage(message: string): string {
  if (!message) return message

  // Quoted literals (single, double, or backtick) — the shape an interpolated value
  // takes in a thrown Error's message (`Failed to load pose "Downward Dog"`).
  let scrubbed = message.replace(/(['"`])(?:(?!\1).)*\1/g, '[redacted]')

  // A path-shaped substring anywhere in the message gets the same route scrub as a
  // view URL, so a message like `GET /poses/downward-dog 404` doesn't leak the slug
  // through a path that isn't inside quotes.
  scrubbed = scrubbed.replace(/\/(?:poses|read|flows|sequences|compose|org)\/[^\s"'`]+/g, (match) =>
    scrubViewUrl(match),
  )

  return scrubbed
}
