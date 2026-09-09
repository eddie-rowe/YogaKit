/**
 * Unit tests for the telemetry scrubber (008 US4, FR-020/FR-022).
 *
 * Everything here runs in memory against strings. This is the module that stands
 * between a pose slug in a view URL and Datadog — 100% coverage is the repo's
 * standard bar for a privacy gate, not an aspiration.
 */

import { describe, expect, it } from 'vitest'

import {
  scrubErrorMessage,
  scrubErrorStack,
  scrubResourceUrl,
  scrubViewUrl,
} from '../../../src/lib/telemetry/scrub'

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
    expect(scrubViewUrl('https://yogakit.vercel.app/poses/warrior-ii')).toBe('/poses/[slug]')
  })

  it('leaves a static route untouched', () => {
    expect(scrubViewUrl('/settings')).toBe('/settings')
    expect(scrubViewUrl('/')).toBe('/')
  })

  it('falls back to manual splitting when URL parsing throws', () => {
    // An absolute-looking URL with a malformed host is one of the few inputs `new
    // URL(url, base)` cannot resolve against a valid base — it throws rather than
    // treating the string as a relative reference, which exercises the catch branch.
    expect(scrubViewUrl('http://[::1?x=1#y')).toBe('/[unknown]')
  })

  it('redacts an unreviewed route by default', () => {
    expect(scrubViewUrl('/future/private-title')).toBe('/[unknown]')
  })
})

describe('scrubResourceUrl', () => {
  const origin = 'https://yogakit.vercel.app'

  it('preserves reviewed same-origin endpoints without query strings', () => {
    expect(scrubResourceUrl('/api/generate?flow=my-flow', origin)).toBe('/api/generate')
    expect(scrubResourceUrl('/', origin)).toBe('/')
  })

  it('parameterizes reviewed dynamic application paths', () => {
    expect(scrubResourceUrl('/read/private-flow', origin)).toBe('/read/[id]')
  })

  it('preserves Next assets for performance and source-map diagnostics', () => {
    expect(scrubResourceUrl('/_next/static/chunks/app-123.js?cache=1', origin)).toBe(
      '/_next/static/chunks/app-123.js',
    )
  })

  it('redacts unreviewed same-origin paths', () => {
    expect(scrubResourceUrl('/future/private-title', origin)).toBe('/[resource]')
  })

  it('retains only the origin for third-party resources', () => {
    expect(scrubResourceUrl('https://example.com/users/private-id?token=secret', origin)).toBe(
      'https://example.com/[resource]',
    )
  })

  it('redacts malformed resource URLs', () => {
    expect(scrubResourceUrl('http://[::1', origin)).toBe('/[resource]')
  })
})

describe('scrubErrorMessage', () => {
  it('redacts all free-text messages, including apparently harmless ones', () => {
    expect(scrubErrorMessage('Failed to load pose "Downward Dog"')).toBe('[redacted]')
    expect(scrubErrorMessage('Network request failed')).toBe('[redacted]')
  })

  it('returns an empty message unchanged', () => {
    expect(scrubErrorMessage('')).toBe('')
  })
})

describe('scrubErrorStack', () => {
  it('redacts the message line while preserving frames and removing URL parameters', () => {
    expect(
      scrubErrorStack(
        'Error: private flow title\n    at save (https://yogakit.vercel.app/_next/app.js?token=secret#x:1:2)',
      ),
    ).toBe('[redacted]\n    at save (https://yogakit.vercel.app/_next/app.js)')
  })

  it('returns absent stacks unchanged', () => {
    expect(scrubErrorStack(undefined)).toBeUndefined()
  })
})
