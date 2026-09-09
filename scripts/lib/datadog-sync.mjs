/**
 * Datadog sync: the pure half (008 US1).
 *
 * No filesystem, no network, no `pup`/`fetch` call — every export here is a function
 * of its arguments: manifest validation, the marker-tag idempotency key, SLO
 * placeholder resolution, dashboard title matching, and widget-ID stripping. The I/O
 * lives in `scripts/datadog/sync.mjs`. Same split as `scripts/lib/copy-lint.mjs` and
 * `scripts/lib/tier1-report.mjs`, for the same reason: the sync tool is the only path
 * by which config reaches production Datadog (FR-027), so its decision logic needs to
 * be testable without actually touching us5.
 */

export const RESOURCE_TYPES = [
  'monitors',
  'slos',
  'synthetics-api',
  'synthetics-browser',
  'dashboards',
  'logs-metrics',
  'service-catalog',
]

// Types whose identity is the yogakit:<slug> tag (FR-008). Dashboards are the one
// exception — matched by exact title instead, since the Dashboards API has no tags
// field (data-model.md, "Dashboard Manifest").
export const TAG_MATCHED_TYPES = [
  'monitors',
  'slos',
  'synthetics-api',
  'synthetics-browser',
  'logs-metrics',
]

const REQUIRED_TAGS = ['env:prod', 'service:yogakit', 'managed_by:git']

/** `yogakit-error-rate` style filename → `yogakit:error-rate` marker tag. */
export function markerTagFor(filename) {
  const slug = filename.replace(/\.json$/, '')
  return `yogakit:${slug}`
}

/** Extract the `yogakit:<slug>` tag from a tags array, or null if absent. */
export function extractSlug(tags) {
  if (!Array.isArray(tags)) return null
  const found = tags.find((t) => typeof t === 'string' && t.startsWith('yogakit:'))
  return found ? found.slice('yogakit:'.length) : null
}

/**
 * Validate a manifest object against the shared tagging convention plus any
 * type-specific rules. Returns `{ valid, errors }` — never throws, so the caller can
 * validate every manifest in a run and report every failure at once (FR-005) instead
 * of stopping at the first one.
 */
export function validateManifest(type, filename, manifest, opts = {}) {
  const errors = []
  const expectedSlug = filename.replace(/\.(json|ya?ml)$/, '')

  if (type === 'dashboards') {
    if (!manifest.title || typeof manifest.title !== 'string') {
      errors.push(`missing or non-string "title"`)
    }
    if (!Array.isArray(manifest.widgets)) {
      errors.push(`missing "widgets" array`)
    }
    return { valid: errors.length === 0, errors }
  }

  if (type === 'service-catalog') {
    if (!manifest['dd-service']) errors.push(`missing "dd-service"`)
    if (!Array.isArray(manifest.tags) || !manifest.tags.includes('env:prod')) {
      errors.push(`"tags" must include "env:prod"`)
    }
    return { valid: errors.length === 0, errors }
  }

  if (type === 'logs-metrics') {
    const attrs = manifest?.data?.attributes
    if (manifest?.data?.type !== 'logs_metrics') {
      errors.push(`"data.type" must be "logs_metrics"`)
    }
    if (!attrs?.compute?.aggregation_type) {
      errors.push(`missing "data.attributes.compute.aggregation_type"`)
    }
    if (!attrs?.filter?.query) {
      errors.push(`missing "data.attributes.filter.query"`)
    }
    if (manifest?.data?.id !== expectedSlug) {
      errors.push(`"data.id" ("${manifest?.data?.id}") must match the filename ("${expectedSlug}")`)
    }
    return { valid: errors.length === 0, errors }
  }

  // monitors, slos, synthetics-api, synthetics-browser: all tag-matched (FR-008).
  const tags = manifest.tags
  const slug = extractSlug(tags)
  if (!slug) {
    errors.push(`missing a "yogakit:<slug>" tag`)
  } else if (slug !== expectedSlug) {
    errors.push(`"yogakit:${slug}" tag does not match the filename ("yogakit:${expectedSlug}")`)
  }
  for (const required of REQUIRED_TAGS) {
    if (!Array.isArray(tags) || !tags.includes(required)) {
      errors.push(`missing required tag "${required}"`)
    }
  }

  if (type === 'monitors') {
    if (!manifest.name) errors.push(`missing "name"`)
    if (!manifest.query) errors.push(`missing "query"`)
    if (!manifest.message) errors.push(`missing "message"`)
    const queryThreshold =
      typeof manifest.query === 'string'
        ? Number(manifest.query.match(/[<>]=?\s*(-?\d+(?:\.\d+)?)\s*$/)?.[1])
        : Number.NaN
    const criticalThreshold = Number(manifest.options?.thresholds?.critical)
    if (
      Number.isFinite(queryThreshold) &&
      Number.isFinite(criticalThreshold) &&
      queryThreshold !== criticalThreshold
    ) {
      errors.push(
        `query threshold (${queryThreshold}) does not match options.thresholds.critical (${criticalThreshold})`,
      )
    }
    const handle = extractHandle(manifest.message)
    if (!handle) {
      errors.push(`"message" does not end with a notification handle (e.g. "@syntheticstesting@gmail.com")`)
    } else if (opts.liveHandles && !opts.liveHandles.includes(handle)) {
      // FR-024/SC-010: a monitor that cannot notify is worse than no monitor.
      errors.push(`notification handle "${handle}" does not resolve against the live handle list`)
    }
    const placeholder = extractSloPlaceholder(manifest.query)
    if (placeholder && opts.knownSloTags && !opts.knownSloTags.includes(placeholder)) {
      errors.push(`SLO placeholder references unknown tag "yogakit:${placeholder}" — no manifest in datadog/slos/ carries it`)
    }
  }

  if (type === 'slos') {
    if (!manifest.name) errors.push(`missing "name"`)
    if (!Array.isArray(manifest.thresholds) || manifest.thresholds.length === 0) {
      errors.push(`missing "thresholds"`)
    }
    if (manifest.type === 'metric' && !manifest.query) {
      errors.push(`metric SLO missing "query"`)
    }
    if (
      filename === 'read-view-availability.json' &&
      (!manifest.query?.numerator?.includes('yogakit:read-view-200') ||
        !manifest.query?.denominator?.includes('yogakit:read-view-200'))
    ) {
      errors.push(`read-view SLO queries must be scoped to "yogakit:read-view-200"`)
    }
    if (manifest.type === 'monitor' && !Array.isArray(manifest.monitor_ids)) {
      errors.push(`monitor SLO missing "monitor_ids"`)
    }
  }

  if (type === 'synthetics-api' || type === 'synthetics-browser') {
    if (!manifest.name) errors.push(`missing "name"`)
    if (!manifest.config?.request?.url) errors.push(`missing "config.request.url"`)
    if (!['live', 'paused'].includes(manifest.status)) {
      errors.push(`"status" must be "live" or "paused"`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/** The handle a monitor message ends with, e.g. "@syntheticstesting@gmail.com". */
export function extractHandle(message) {
  if (typeof message !== 'string') return null
  const match = message.match(/(@\S+)\s*$/)
  return match ? match[1] : null
}

const SLO_PLACEHOLDER = /\{\{slo_id:yogakit:([a-z0-9-]+)\}\}/

/** The `yogakit:<slug>` tag a `{{slo_id:yogakit:<slug>}}` placeholder references. */
export function extractSloPlaceholder(query) {
  if (typeof query !== 'string') return null
  const match = query.match(SLO_PLACEHOLDER)
  return match ? match[1] : null
}

/**
 * Replace every `{{slo_id:yogakit:<slug>}}` placeholder in `query` with the live SLO
 * ID for that slug. Throws if a referenced slug has no matching live SLO — an
 * unresolvable placeholder must block the run, the same as any other invalid
 * manifest (FR-004), never silently apply a monitor with a literal template string
 * as its query.
 */
export function resolveSloPlaceholders(query, sloIdBySlug) {
  return query.replace(new RegExp(SLO_PLACEHOLDER, 'g'), (whole, slug) => {
    const id = sloIdBySlug[slug]
    if (!id) {
      throw new Error(`no live SLO found tagged "yogakit:${slug}" — cannot resolve "${whole}"`)
    }
    return id
  })
}

/** Exact-title match for dashboards — the one type without a tag namespace. */
export function dashboardTitleMatches(localTitle, remoteTitle) {
  return typeof localTitle === 'string' && localTitle === remoteTitle
}

/**
 * Strip server-assigned widget IDs (top-level and inside `group` widgets) so a local
 * manifest can be diffed against a fetched dashboard without every widget always
 * reading as changed.
 */
export function stripWidgetIds(dashboard) {
  const strip = (widget) => {
    const { id: _id, ...rest } = widget
    if (rest.definition?.widgets) {
      rest.definition = {
        ...rest.definition,
        widgets: rest.definition.widgets.map(strip),
      }
    }
    return rest
  }
  return {
    ...dashboard,
    widgets: Array.isArray(dashboard.widgets) ? dashboard.widgets.map(strip) : dashboard.widgets,
  }
}

/**
 * Decide what the sync tool should do for one manifest given the live object it
 * matched (or `null` if none matched). Diffing is a plain deep-equal over the fields
 * that round-trip through the API (`fields`, defaulting to every own key of `local`)
 * — this stays intentionally shallow-ish rather than a generic deep-diff library,
 * because a false "changed" on a field the API silently reformats (e.g. a
 * server-normalized query string) is worse than missing a real one.
 */
export function planAction(local, remote, fields) {
  if (!remote) return { action: 'create' }
  const keys = fields ?? Object.keys(local)
  const changed = keys.filter((key) => !deepEqual(local[key], remote[key]))
  return changed.length === 0 ? { action: 'no-change' } : { action: 'update', changed }
}

function deepEqual(a, b) {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }
  if (typeof a === 'object') {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every((k) => deepEqual(a[k], b[k]))
  }
  return false
}

/** One line of the sync tool's printed table. */
export function formatResultLine({ type, name, action, status, detail }) {
  const base = `${type.padEnd(18)} | ${name.padEnd(48)} | ${action.padEnd(10)} | ${status}`
  return detail ? `${base} | ${detail}` : base
}
