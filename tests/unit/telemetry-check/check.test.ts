import { describe, expect, it } from 'vitest'
import {
  BANNED_FIELD_NAMES,
  extractTelemetryCalls,
  checkSource,
  checkManifestObject,
  coverageLimits,
  formatReport,
} from '../../../scripts/lib/telemetry-check.mjs'

describe('extractTelemetryCalls', () => {
  it('finds a logger.info call and its field names', () => {
    const calls = extractTelemetryCalls(`logger.info('read view opened', { viewId: 'abc' })`, 'x.ts')
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ callee: 'logger', method: 'info' })
    expect(calls[0].fields.map((f) => f.name)).toEqual(['viewId'])
  })

  it('finds a datadogRum.addAction call', () => {
    const calls = extractTelemetryCalls(`datadogRum.addAction('click', { target: 'save' })`, 'x.ts')
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ callee: 'datadogRum', method: 'addAction' })
  })

  it('ignores calls to unrelated objects/methods', () => {
    const calls = extractTelemetryCalls(`console.log('hi', { note: 'x' })`, 'x.ts')
    expect(calls).toHaveLength(0)
  })

  it('recurses into nested object literals for field names', () => {
    const calls = extractTelemetryCalls(
      `logger.error('failed', { context: { poseName: 'x' } })`,
      'x.ts',
    )
    expect(calls[0].fields.map((f) => f.name)).toEqual(['context', 'poseName'])
  })

  it('does not see fields introduced via a spread', () => {
    const calls = extractTelemetryCalls(`logger.info('event', { ...extra })`, 'x.ts')
    expect(calls[0].fields).toEqual([])
  })

  it('reports line and column of each field', () => {
    const calls = extractTelemetryCalls(`logger.info('x', { viewId: 'a' })`, 'x.ts')
    expect(calls[0].fields[0].line).toBe(1)
    expect(calls[0].fields[0].column).toBeGreaterThan(0)
  })

  it('ignores a bare function call (not a property access)', () => {
    const calls = extractTelemetryCalls(`someFunction('x', { note: 'y' })`, 'x.ts')
    expect(calls).toHaveLength(0)
  })

  it('ignores a chained property access whose object is not a plain identifier', () => {
    const calls = extractTelemetryCalls(`a.b.info('x', { note: 'y' })`, 'x.ts')
    expect(calls).toHaveLength(0)
  })

  it('picks up a shorthand property and a string-literal-keyed property', () => {
    const viewId = 'abc'
    const calls = extractTelemetryCalls(`logger.info('x', { viewId, 'durationMs': 1 })`, 'x.ts')
    expect(calls[0].fields.map((f) => f.name)).toEqual(['viewId', 'durationMs'])
  })

  it('parses a .tsx file', () => {
    const calls = extractTelemetryCalls(`logger.info('x', { viewId: 'a' })`, 'x.tsx')
    expect(calls).toHaveLength(1)
  })

  it('ignores a computed property key (not statically a name)', () => {
    const calls = extractTelemetryCalls(`logger.info('x', { [someVar]: 'a' })`, 'x.ts')
    expect(calls[0].fields).toEqual([])
  })

  it('ignores a method-shorthand property (neither an assignment nor a spread)', () => {
    const calls = extractTelemetryCalls(`logger.info('x', { helper() { return 1 } })`, 'x.ts')
    expect(calls[0].fields).toEqual([])
  })
})

describe('checkSource', () => {
  it('reports no violations for a clean logger call', () => {
    const { violations, callsScanned } = checkSource(
      `logger.info('read view opened', { viewId: 'abc', durationMs: 12 })`,
      'clean.ts',
    )
    expect(violations).toEqual([])
    expect(callsScanned).toBe(1)
  })

  it('flags a banned field name passed to logger', () => {
    const { violations } = checkSource(`logger.error('failed', { pose_name: 'Downward Dog' })`, 'bad.ts')
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({ file: 'bad.ts', callee: 'logger.error', field: 'pose_name' })
  })

  it('flags a banned field name nested under a wrapper object', () => {
    const { violations } = checkSource(
      `datadogRum.addAction('save', { context: { journal: 'today felt good' } })`,
      'bad.ts',
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].field).toBe('journal')
  })

  it('is case-insensitive on the banned field name', () => {
    const { violations } = checkSource(`logger.info('x', { PoseName: 'y' })`, 'bad.ts')
    expect(violations).toHaveLength(1)
  })

  it('does not flag a field name that merely contains a banned substring', () => {
    // "notesCount" is a count, not the note content itself — only exact banned names match.
    const { violations } = checkSource(`logger.info('x', { notesCount: 3 })`, 'clean.ts')
    expect(violations).toEqual([])
  })
})

describe('checkManifestObject', () => {
  it('finds no violations in a clean monitor manifest', () => {
    const violations = checkManifestObject({
      name: '[YogaKit] RUM Error Rate',
      query: 'sum:rum.error{service:yogakit}',
      tags: ['env:prod', 'service:yogakit'],
    })
    expect(violations).toEqual([])
  })

  it('flags a banned key anywhere in a nested manifest structure', () => {
    const violations = checkManifestObject({
      name: 'test',
      options: { thresholds: { flow_name: 'x' } },
    })
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({ key: 'flow_name', path: '$.options.thresholds.flow_name' })
  })

  it('walks arrays of objects', () => {
    const violations = checkManifestObject({ widgets: [{ pose: 'a' }, { fine: 'b' }] })
    expect(violations).toHaveLength(1)
    expect(violations[0].path).toBe('$.widgets[0].pose')
  })

  it('returns an empty array for non-object leaves', () => {
    expect(checkManifestObject('just a string')).toEqual([])
    expect(checkManifestObject(42)).toEqual([])
    expect(checkManifestObject(null)).toEqual([])
  })
})

describe('BANNED_FIELD_NAMES', () => {
  it('covers the practice-content vocabulary and the logger.ts secret list', () => {
    for (const name of ['pose_name', 'flow_title', 'journal', 'mood', 'energy', 'secret', 'token']) {
      expect(BANNED_FIELD_NAMES.has(name)).toBe(true)
    }
  })
})

describe('coverageLimits', () => {
  it('returns a non-empty list of stated gaps', () => {
    expect(coverageLimits().length).toBeGreaterThan(0)
  })
})

describe('formatReport', () => {
  it('reports a clean pass with no violations', () => {
    const report = formatReport({ violations: [], manifestViolations: [], filesScanned: 5, callsScanned: 3 })
    expect(report).toContain('✓ telemetry-check')
    expect(report).toContain('3 call site(s)')
  })

  it('reports call-site and manifest violations distinctly', () => {
    const report = formatReport({
      violations: [{ file: 'a.ts', line: 1, column: 2, callee: 'logger.info', field: 'pose_name' }],
      manifestViolations: [{ file: 'm.json', path: '$.flow_name', key: 'flow_name' }],
      filesScanned: 2,
      callsScanned: 1,
    })
    expect(report).toContain('✗ telemetry-check: 2 violation(s)')
    expect(report).toContain('a.ts:1:2 — logger.info(...) passes field "pose_name"')
    expect(report).toContain('m.json — $.flow_name')
  })
})
