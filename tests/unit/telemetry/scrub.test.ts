/**
 * Unit tests for the telemetry scrubber (008 US4, FR-020/FR-022).
 *
 * Everything here runs in memory against strings. This is the module that stands
 * between a pose slug in a view URL and Datadog — 100% coverage is the repo's
 * standard bar for a privacy gate, not an aspiration.
 */

import { describe, expect, it } from 'vitest'

import { scrubErrorMessage, scrubViewUrl } from '../../../src/lib/telemetry/scrub'

describe('scrubViewUrl', () => {
  it('parameterizes a pose slug', () => {
    expect(scrubViewUrl('/poses/downward-facing-dog')).toBe('/poses/[slug]')
  })

  it('parameterizes a pose slug with a trailing slash', () => {
    expect(scrubViewUrl('/poses/downward-facing-dog/')).toBe('/poses/[slug]')
  })

  it('parameterizes a read view id', () => {
    expect(scrubViewUrl('/read/abc-123')).toBe('/read/[id]')
  })

  it('parameterizes a flow id', () => {
    expect(scrubViewUrl('/flows/my-morning-flow')).toBe('/flows/[id]')
  })

  it('parameterizes a sequence id', () => {
    expect(scrubViewUrl('/sequences/seq-1')).toBe('/sequences/[id]')
  })

  it('parameterizes a compose id', () => {
    expect(scrubViewUrl('/compose/draft-1')).toBe('/compose/[id]')
  })

  it('parameterizes an org members path before the bare org path', () => {
    expect(scrubViewUrl('/org/acme/members')).toBe('/org/[orgId]/members')
  })

  it('parameterizes a bare org id path', () => {
    expect(scrubViewUrl('/org/acme')).toBe('/org/[orgId]')
  })

  it('drops the query string and hash', () => {
    expect(scrubViewUrl('/poses/downward-facing-dog?ref=email#top')).toBe('/poses/[slug]')
  })

  it('accepts a full URL, not only a bare path', () => {
    expect(scrubViewUrl('https://yoga-kit.vercel.app/poses/warrior-ii')).toBe('/poses/[slug]')
  })

  it('leaves a static route untouched', () => {
    expect(scrubViewUrl('/settings')).toBe('/settings')
    expect(scrubViewUrl('/')).toBe('/')
  })

  it('falls back to manual splitting when URL parsing throws', () => {
    // An absolute-looking URL with a malformed host is one of the few inputs `new
    // URL(url, base)` cannot resolve against a valid base — it throws rather than
    // treating the string as a relative reference, which exercises the catch branch.
    expect(scrubViewUrl('http://[::1?x=1#y')).toBe('http://[::1')
  })
})

describe('scrubErrorMessage', () => {
  it('redacts a double-quoted literal', () => {
    expect(scrubErrorMessage('Failed to load pose "Downward Dog"')).toBe(
      'Failed to load pose [redacted]',
    )
  })

  it('redacts a single-quoted literal', () => {
    expect(scrubErrorMessage("Could not save note 'left knee felt tight'")).toBe(
      'Could not save note [redacted]',
    )
  })

  it('redacts a backtick-quoted literal', () => {
    expect(scrubErrorMessage('Unexpected token `my flow title`')).toBe(
      'Unexpected token [redacted]',
    )
  })

  it('scrubs an unquoted pose path embedded in the message', () => {
    expect(scrubErrorMessage('GET /poses/downward-facing-dog 404')).toBe(
      'GET /poses/[slug] 404',
    )
  })

  it('scrubs an unquoted read path embedded in the message', () => {
    expect(scrubErrorMessage('fetch failed for /read/abc-123')).toBe(
      'fetch failed for /read/[id]',
    )
  })

  it('returns an empty message unchanged', () => {
    expect(scrubErrorMessage('')).toBe('')
  })

  it('leaves a message with no quoted literal or content path untouched', () => {
    expect(scrubErrorMessage('Network request failed')).toBe('Network request failed')
  })
})
