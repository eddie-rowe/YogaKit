/**
 * Unit tests for the Datadog sync's pure module (008 US1, FR-002-FR-008/FR-024).
 *
 * Everything here runs in memory against plain objects — no filesystem, no network,
 * no live Datadog call. The sync tool is the only path by which config reaches
 * production (FR-027), so its validation/diff/resolution logic needs a test that
 * doesn't depend on us5 being reachable or in any particular state.
 */

import { describe, expect, it } from 'vitest'

import {
  dashboardTitleMatches,
  extractHandle,
  extractSlug,
  extractSloPlaceholder,
  formatResultLine,
  markerTagFor,
  planAction,
  resolveSloPlaceholders,
  stripWidgetIds,
  validateManifest,
} from '../../../scripts/lib/datadog-sync.mjs'

const baseTags = ['env:prod', 'service:yogakit', 'managed_by:git', 'yogakit:api-error-rate']

describe('markerTagFor / extractSlug', () => {
  it('derives the marker tag from a filename', () => {
    expect(markerTagFor('api-error-rate.json')).toBe('yogakit:api-error-rate')
  })

  it('extracts the slug from a tags array', () => {
    expect(extractSlug(baseTags)).toBe('api-error-rate')
  })

  it('returns null when no yogakit tag is present', () => {
    expect(extractSlug(['env:prod', 'service:yogakit'])).toBeNull()
  })

  it('returns null for a non-array', () => {
    expect(extractSlug(undefined)).toBeNull()
  })
})

describe('validateManifest — monitors', () => {
  const validMonitor = {
    name: '[YogaKit] API Error Rate',
    type: 'query alert',
    query: 'sum(last_15m):sum:trace.errors{service:yogakit,env:prod} > 10',
    message: 'API error rate exceeded threshold. @syntheticstesting@gmail.com',
    tags: baseTags,
    options: { thresholds: { critical: 10 } },
  }

  it('accepts a well-formed monitor', () => {
    const result = validateManifest('monitors', 'api-error-rate.json', validMonitor)
    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('rejects a query threshold that differs from the critical threshold', () => {
    const manifest = {
      ...validMonitor,
      query: 'sum(last_15m):sum:trace.errors{service:yogakit,env:prod} > 5',
    }
    const result = validateManifest('monitors', 'api-error-rate.json', manifest)
    expect(result.errors).toContain(
      'query threshold (5) does not match options.thresholds.critical (10)',
    )
  })

  it('allows monitor query types with no final numeric comparator', () => {
    const manifest = { ...validMonitor, query: 'unsupported_for_threshold_check' }
    expect(validateManifest('monitors', 'api-error-rate.json', manifest).valid).toBe(true)
  })

  it('rejects a monitor missing the yogakit marker tag', () => {
    const manifest = { ...validMonitor, tags: ['env:prod', 'service:yogakit', 'managed_by:git'] }
    const result = validateManifest('monitors', 'api-error-rate.json', manifest)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('missing a "yogakit:<slug>" tag')
  })

  it('rejects a monitor whose marker tag does not match its filename', () => {
    const manifest = { ...validMonitor, tags: [...baseTags.slice(0, 3), 'yogakit:wrong-slug'] }
    const result = validateManifest('monitors', 'api-error-rate.json', manifest)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('does not match the filename'))).toBe(true)
  })

  it('rejects a monitor missing a required tag', () => {
    const manifest = { ...validMonitor, tags: ['service:yogakit', 'yogakit:api-error-rate'] }
    const result = validateManifest('monitors', 'api-error-rate.json', manifest)
    expect(result.errors).toContain('missing required tag "env:prod"')
  })

  it('rejects a monitor missing name/query/message', () => {
    const result = validateManifest('monitors', 'api-error-rate.json', { tags: baseTags })
    expect(result.errors).toEqual(
      expect.arrayContaining(['missing "name"', 'missing "query"', 'missing "message"']),
    )
  })

  it('rejects a message with no notification handle', () => {
    const manifest = { ...validMonitor, message: 'API error rate exceeded threshold.' }
    const result = validateManifest('monitors', 'api-error-rate.json', manifest)
    expect(result.errors.some((e) => e.includes('notification handle'))).toBe(true)
  })

  it('rejects a monitor whose handle does not resolve (FR-024/SC-010)', () => {
    const manifest = { ...validMonitor, message: 'Something broke. @nobody-here' }
    const result = validateManifest('monitors', 'api-error-rate.json', manifest, {
      liveHandles: ['@syntheticstesting@gmail.com'],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('does not resolve'))).toBe(true)
  })

  it('accepts a resolvable handle against the live handle list', () => {
    const result = validateManifest('monitors', 'api-error-rate.json', validMonitor, {
      liveHandles: ['@syntheticstesting@gmail.com'],
    })
    expect(result.valid).toBe(true)
  })

  it('rejects an SLO placeholder referencing an unknown SLO tag', () => {
    const manifest = {
      ...validMonitor,
      query: 'burn_rate("{{slo_id:yogakit:missing-slo}}").over("1h") > 10',
    }
    const result = validateManifest('monitors', 'api-error-rate.json', manifest, {
      knownSloTags: ['read-view-availability'],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('unknown tag'))).toBe(true)
  })

  it('accepts an SLO placeholder referencing a known SLO tag', () => {
    const manifest = {
      ...validMonitor,
      query: 'burn_rate("{{slo_id:yogakit:read-view-availability}}").over("1h") > 10',
    }
    const result = validateManifest('monitors', 'api-error-rate.json', manifest, {
      knownSloTags: ['read-view-availability'],
    })
    expect(result.valid).toBe(true)
  })
})

describe('validateManifest — slos', () => {
  const baseSlo = {
    name: '[YogaKit] Read View Availability',
    tags: [...baseTags.slice(0, 3), 'yogakit:read-view-availability'],
    thresholds: [{ target: 99.5, timeframe: '30d' }],
  }

  it('accepts a metric SLO with a query', () => {
    const manifest = {
      ...baseSlo,
      type: 'metric',
      query: {
        numerator: 'sum:availability{yogakit:read-view-200}',
        denominator: 'sum:availability{yogakit:read-view-200}',
      },
    }
    expect(validateManifest('slos', 'read-view-availability.json', manifest).valid).toBe(true)
  })

  it('rejects a read-view SLO that aggregates unrelated synthetics', () => {
    const manifest = { ...baseSlo, type: 'metric', query: { numerator: 'a', denominator: 'b' } }
    const result = validateManifest('slos', 'read-view-availability.json', manifest)
    expect(result.errors).toContain(
      'read-view SLO queries must be scoped to "yogakit:read-view-200"',
    )
  })

  it('rejects a metric SLO with no query', () => {
    const manifest = { ...baseSlo, type: 'metric' }
    const result = validateManifest('slos', 'read-view-availability.json', manifest)
    expect(result.errors).toContain('metric SLO missing "query"')
  })

  it('rejects a monitor-type SLO with no monitor_ids', () => {
    const manifest = { ...baseSlo, type: 'monitor' }
    const result = validateManifest('slos', 'read-view-availability.json', manifest)
    expect(result.errors).toContain('monitor SLO missing "monitor_ids"')
  })

  it('rejects an SLO missing a name', () => {
    const manifest = { tags: baseSlo.tags, type: 'metric', query: {}, thresholds: baseSlo.thresholds }
    const result = validateManifest('slos', 'read-view-availability.json', manifest)
    expect(result.errors).toContain('missing "name"')
  })

  it('rejects an SLO missing thresholds', () => {
    const manifest = { name: baseSlo.name, tags: baseSlo.tags, type: 'metric', query: {} }
    const result = validateManifest('slos', 'read-view-availability.json', manifest)
    expect(result.errors).toContain('missing "thresholds"')
  })
})

describe('validateManifest — synthetics', () => {
  const validSynthetic = {
    name: '[YogaKit] Homepage Returns 200',
    tags: [...baseTags.slice(0, 3), 'yogakit:homepage-200'],
    config: { request: { url: 'https://yoga-kit.vercel.app/' } },
    status: 'live',
  }

  it('accepts a well-formed API synthetic', () => {
    expect(validateManifest('synthetics-api', 'homepage-200.json', validSynthetic).valid).toBe(true)
  })

  it('rejects a synthetic missing a name', () => {
    const manifest = { ...validSynthetic, name: undefined }
    const result = validateManifest('synthetics-api', 'homepage-200.json', manifest)
    expect(result.errors).toContain('missing "name"')
  })

  it('rejects a synthetic missing a request URL', () => {
    const manifest = { ...validSynthetic, config: {} }
    const result = validateManifest('synthetics-api', 'homepage-200.json', manifest)
    expect(result.errors).toContain('missing "config.request.url"')
  })

  it('rejects a synthetic with an invalid status', () => {
    const manifest = { ...validSynthetic, status: 'archived' }
    const result = validateManifest('synthetics-api', 'homepage-200.json', manifest)
    expect(result.errors).toContain('"status" must be "live" or "paused"')
  })
})

describe('validateManifest — dashboards', () => {
  it('accepts a dashboard with a title and widgets array', () => {
    const result = validateManifest('dashboards', 'yogakit-health.json', {
      title: '[YogaKit] Health',
      widgets: [],
    })
    expect(result.valid).toBe(true)
  })

  it('rejects a dashboard missing a title', () => {
    const result = validateManifest('dashboards', 'yogakit-health.json', { widgets: [] })
    expect(result.errors).toContain('missing or non-string "title"')
  })

  it('rejects a dashboard missing widgets', () => {
    const result = validateManifest('dashboards', 'yogakit-health.json', { title: 'x' })
    expect(result.errors).toContain('missing "widgets" array')
  })
})

describe('validateManifest — service-catalog', () => {
  it('accepts a valid entry', () => {
    const result = validateManifest('service-catalog', 'yogakit.yaml', {
      'dd-service': 'yogakit',
      tags: ['env:prod'],
    })
    expect(result.valid).toBe(true)
  })

  it('rejects an entry missing dd-service', () => {
    const result = validateManifest('service-catalog', 'yogakit.yaml', { tags: ['env:prod'] })
    expect(result.errors).toContain('missing "dd-service"')
  })

  it('rejects an entry missing the env:prod tag', () => {
    const result = validateManifest('service-catalog', 'yogakit.yaml', { 'dd-service': 'yogakit', tags: [] })
    expect(result.errors).toContain('"tags" must include "env:prod"')
  })
})

describe('validateManifest — logs-metrics', () => {
  const valid = {
    data: {
      type: 'logs_metrics',
      id: 'yogakit.request.errors',
      attributes: { compute: { aggregation_type: 'count' }, filter: { query: 'service:yogakit' } },
    },
  }

  it('accepts a valid entry', () => {
    expect(validateManifest('logs-metrics', 'yogakit.request.errors.json', valid).valid).toBe(true)
  })

  it('rejects the wrong data.type', () => {
    const manifest = { data: { ...valid.data, type: 'wrong' } }
    const result = validateManifest('logs-metrics', 'yogakit.request.errors.json', manifest)
    expect(result.errors).toContain('"data.type" must be "logs_metrics"')
  })

  it('rejects a mismatched data.id', () => {
    const manifest = { data: { ...valid.data, id: 'wrong.id' } }
    const result = validateManifest('logs-metrics', 'yogakit.request.errors.json', manifest)
    expect(result.errors.some((e) => e.includes('must match the filename'))).toBe(true)
  })

  it('rejects a missing compute/filter', () => {
    const manifest = { data: { type: 'logs_metrics', id: 'yogakit.request.errors', attributes: {} } }
    const result = validateManifest('logs-metrics', 'yogakit.request.errors.json', manifest)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'missing "data.attributes.compute.aggregation_type"',
        'missing "data.attributes.filter.query"',
      ]),
    )
  })
})

describe('extractHandle', () => {
  it('extracts a trailing handle', () => {
    expect(extractHandle('Something broke. @syntheticstesting@gmail.com')).toBe(
      '@syntheticstesting@gmail.com',
    )
  })

  it('returns null with no handle', () => {
    expect(extractHandle('Something broke.')).toBeNull()
  })

  it('returns null for a non-string', () => {
    expect(extractHandle(undefined)).toBeNull()
  })
})

describe('extractSloPlaceholder / resolveSloPlaceholders', () => {
  it('extracts the referenced slug', () => {
    expect(extractSloPlaceholder('burn_rate("{{slo_id:yogakit:read-view-availability}}") > 1')).toBe(
      'read-view-availability',
    )
  })

  it('returns null when no placeholder is present', () => {
    expect(extractSloPlaceholder('avg:some.metric{env:prod} > 1')).toBeNull()
  })

  it('returns null for a non-string', () => {
    expect(extractSloPlaceholder(undefined)).toBeNull()
  })

  it('substitutes a resolvable placeholder', () => {
    const resolved = resolveSloPlaceholders(
      'burn_rate("{{slo_id:yogakit:read-view-availability}}").over("1h") > 1',
      { 'read-view-availability': 'abc123' },
    )
    expect(resolved).toBe('burn_rate("abc123").over("1h") > 1')
  })

  it('substitutes every occurrence of a repeated placeholder (multi-window burn rate)', () => {
    const resolved = resolveSloPlaceholders(
      'burn_rate("{{slo_id:yogakit:read-view-availability}}").over("1h") > 1 && burn_rate("{{slo_id:yogakit:read-view-availability}}").over("5m") > 1',
      { 'read-view-availability': 'abc123' },
    )
    expect(resolved).toBe(
      'burn_rate("abc123").over("1h") > 1 && burn_rate("abc123").over("5m") > 1',
    )
  })

  it('throws on an unresolvable placeholder', () => {
    expect(() =>
      resolveSloPlaceholders('burn_rate("{{slo_id:yogakit:missing}}") > 1', {}),
    ).toThrow(/no live SLO found/)
  })
})

describe('dashboardTitleMatches', () => {
  it('matches identical titles', () => {
    expect(dashboardTitleMatches('[YogaKit] Health', '[YogaKit] Health')).toBe(true)
  })

  it('rejects a different title', () => {
    expect(dashboardTitleMatches('[YogaKit] Health', '[YogaKit] Other')).toBe(false)
  })

  it('rejects a non-string local title', () => {
    expect(dashboardTitleMatches(undefined, '[YogaKit] Health')).toBe(false)
  })
})

describe('stripWidgetIds', () => {
  it('removes top-level widget ids', () => {
    const dashboard = { title: 'x', widgets: [{ id: 1, definition: { type: 'timeseries' } }] }
    expect(stripWidgetIds(dashboard).widgets).toEqual([{ definition: { type: 'timeseries' } }])
  })

  it('removes nested widget ids inside a group', () => {
    const dashboard = {
      title: 'x',
      widgets: [
        {
          id: 1,
          definition: {
            type: 'group',
            widgets: [{ id: 11, definition: { type: 'timeseries' } }],
          },
        },
      ],
    }
    expect(stripWidgetIds(dashboard)).toEqual({
      title: 'x',
      widgets: [{ definition: { type: 'group', widgets: [{ definition: { type: 'timeseries' } }] } }],
    })
  })

  it('leaves a dashboard with no widgets array untouched', () => {
    const dashboard = { title: 'x' }
    expect(stripWidgetIds(dashboard)).toEqual({ title: 'x', widgets: undefined })
  })
})

describe('planAction', () => {
  it('plans a create when no remote object matches', () => {
    expect(planAction({ name: 'a' }, null)).toEqual({ action: 'create' })
  })

  it('plans no-change when every field matches', () => {
    const local = { name: 'a', tags: ['x'] }
    const remote = { name: 'a', tags: ['x'], extra: 'ignored-by-default-field-list' }
    expect(planAction(local, remote)).toEqual({ action: 'no-change' })
  })

  it('plans an update when a field differs', () => {
    const local = { name: 'a', query: 'new' }
    const remote = { name: 'a', query: 'old' }
    expect(planAction(local, remote)).toEqual({ action: 'update', changed: ['query'] })
  })

  it('restricts comparison to the given field list', () => {
    const local = { name: 'a', tags: ['x'] }
    const remote = { name: 'a', tags: ['y'] }
    expect(planAction(local, remote, ['name'])).toEqual({ action: 'no-change' })
  })

  it('deep-compares nested arrays and objects', () => {
    const local = { options: { thresholds: { critical: 10, warning: [1, 2] } } }
    const remote = { options: { thresholds: { critical: 10, warning: [1, 2] } } }
    expect(planAction(local, remote)).toEqual({ action: 'no-change' })
  })

  it('detects a difference inside a nested array', () => {
    const local = { options: { thresholds: { critical: 10, warning: [1, 2] } } }
    const remote = { options: { thresholds: { critical: 10, warning: [1, 3] } } }
    expect(planAction(local, remote)).toEqual({ action: 'update', changed: ['options'] })
  })

  it('treats mismatched array/object shapes as different', () => {
    expect(planAction({ a: [1] }, { a: { 0: 1 } })).toEqual({ action: 'update', changed: ['a'] })
  })

  it('treats null on one side as different from an object', () => {
    expect(planAction({ a: null }, { a: { x: 1 } })).toEqual({ action: 'update', changed: ['a'] })
  })

  it('treats mismatched types as different', () => {
    expect(planAction({ a: 'x' }, { a: 1 })).toEqual({ action: 'update', changed: ['a'] })
  })

  it('treats objects with different key counts as different', () => {
    expect(planAction({ a: { x: 1 } }, { a: { x: 1, y: 2 } })).toEqual({ action: 'update', changed: ['a'] })
  })
})

describe('formatResultLine', () => {
  it('formats without a detail', () => {
    const line = formatResultLine({ type: 'monitors', name: 'x', action: 'create', status: 'would', detail: undefined })
    expect(line).toContain('monitors')
    expect(line).toContain('would')
    expect(line).not.toContain('undefined')
  })

  it('formats with a detail', () => {
    const line = formatResultLine({
      type: 'monitors',
      name: 'x',
      action: 'update',
      status: 'applied',
      detail: 'query changed',
    })
    expect(line).toContain('query changed')
  })
})
