import { describe, expect, it } from 'vitest'
import {
  shouldUpload,
  buildUploadArgs,
  mapFilesToDelete,
  uploadEnv,
  siteMismatchWarning,
} from '../../../scripts/lib/sourcemaps.mjs'

describe('shouldUpload', () => {
  it('does not run when DD_API_KEY is absent', () => {
    const result = shouldUpload({})
    expect(result.shouldRun).toBe(false)
    expect(result.reason).toMatch(/DD_API_KEY/)
  })

  it('does not run when DD_API_KEY is an empty string', () => {
    expect(shouldUpload({ DD_API_KEY: '' }).shouldRun).toBe(false)
  })

  it('runs when DD_API_KEY is set', () => {
    const result = shouldUpload({ DD_API_KEY: 'abc123' })
    expect(result.shouldRun).toBe(true)
    expect(result.reason).toBeUndefined()
  })
})

describe('uploadEnv', () => {
  // This is the regression: `shouldUpload` opens the gate on DD_API_KEY, but
  // datadog-ci's sourcemaps command reads DATADOG_API_KEY for its internal metrics
  // logger and throws without it. That mismatch failed two production deploys.
  it('mirrors DD_API_KEY under the name datadog-ci actually reads', () => {
    expect(uploadEnv({ DD_API_KEY: 'abc123' })).toEqual({ DATADOG_API_KEY: 'abc123' })
  })

  it('leaves an explicit DATADOG_API_KEY alone, and prefers it over DD_API_KEY', () => {
    expect(uploadEnv({ DATADOG_API_KEY: 'explicit', DD_API_KEY: 'fallback' })).toEqual({
      DATADOG_API_KEY: 'explicit',
    })
  })

  it('mirrors nothing when there is no key — the gate has already skipped the upload', () => {
    expect(uploadEnv({})).toEqual({})
    expect(uploadEnv({ DD_API_KEY: '' })).toEqual({})
  })

  it('adds only that one key, so it can be spread over process.env safely', () => {
    expect(Object.keys(uploadEnv({ DD_API_KEY: 'abc123' }))).toEqual(['DATADOG_API_KEY'])
  })
})

describe('siteMismatchWarning', () => {
  it('warns when DD_SITE is unset and datadog-ci would fall back to US1', () => {
    // The dangerous case: both halves succeed and the stacks never resolve.
    expect(siteMismatchWarning({ NEXT_PUBLIC_DD_SITE: 'us5.datadoghq.com' })).toMatch(
      /uploading to datadoghq\.com but RUM reports to us5\.datadoghq\.com/,
    )
  })

  it('warns when the two are set to different sites', () => {
    expect(
      siteMismatchWarning({ NEXT_PUBLIC_DD_SITE: 'us5.datadoghq.com', DD_SITE: 'datadoghq.eu' }),
    ).toMatch(/datadoghq\.eu/)
  })

  it('is silent when they agree', () => {
    expect(
      siteMismatchWarning({ NEXT_PUBLIC_DD_SITE: 'us5.datadoghq.com', DD_SITE: 'us5.datadoghq.com' }),
    ).toBeUndefined()
  })

  it('prefers DATADOG_SITE over DD_SITE, as datadog-ci does', () => {
    expect(
      siteMismatchWarning({
        NEXT_PUBLIC_DD_SITE: 'us5.datadoghq.com',
        DATADOG_SITE: 'us5.datadoghq.com',
        DD_SITE: 'datadoghq.eu',
      }),
    ).toBeUndefined()
  })

  it('says nothing when RUM has no configured site — there is no mismatch to claim', () => {
    expect(siteMismatchWarning({ DD_SITE: 'us5.datadoghq.com' })).toBeUndefined()
    expect(siteMismatchWarning({})).toBeUndefined()
  })
})

describe('buildUploadArgs', () => {
  it('builds the full datadog-ci argument list', () => {
    const args = buildUploadArgs({
      buildDir: '/repo/.next/static',
      service: 'yogakit',
      releaseVersion: '1.0.0',
      minifiedPathPrefix: '/_next/static',
    })
    expect(args).toEqual([
      'sourcemaps',
      'upload',
      '/repo/.next/static',
      '--service=yogakit',
      '--release-version=1.0.0',
      '--minified-path-prefix=/_next/static',
      '--project-path=/repo/.next/static',
    ])
  })

  it('throws when releaseVersion is missing — a silent version mismatch is worse than a loud failure', () => {
    expect(() =>
      buildUploadArgs({
        buildDir: '/repo/.next/static',
        service: 'yogakit',
        minifiedPathPrefix: '/_next/static',
      } as Parameters<typeof buildUploadArgs>[0]),
    ).toThrow(/releaseVersion is required/)
  })

  it('throws when releaseVersion is an empty string', () => {
    expect(() =>
      buildUploadArgs({
        buildDir: '/repo/.next/static',
        service: 'yogakit',
        releaseVersion: '',
        minifiedPathPrefix: '/_next/static',
      }),
    ).toThrow(/releaseVersion is required/)
  })
})

describe('mapFilesToDelete', () => {
  it('keeps only .map files', () => {
    const files = [
      '/repo/.next/static/chunks/main.js',
      '/repo/.next/static/chunks/main.js.map',
      '/repo/.next/static/css/app.css',
      '/repo/.next/static/chunks/vendor.js.map',
    ]
    expect(mapFilesToDelete(files)).toEqual([
      '/repo/.next/static/chunks/main.js.map',
      '/repo/.next/static/chunks/vendor.js.map',
    ])
  })

  it('returns an empty array when there are no map files', () => {
    expect(mapFilesToDelete(['/repo/.next/static/chunks/main.js'])).toEqual([])
  })

  it('returns an empty array for an empty input', () => {
    expect(mapFilesToDelete([])).toEqual([])
  })
})
