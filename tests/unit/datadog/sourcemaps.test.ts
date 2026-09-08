import { describe, expect, it } from 'vitest'
import { shouldUpload, buildUploadArgs, mapFilesToDelete } from '../../../scripts/lib/sourcemaps.mjs'

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
