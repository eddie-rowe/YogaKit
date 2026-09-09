#!/usr/bin/env node
/**
 * Datadog sync: the I/O half (008 US1, FR-002-FR-008/FR-024/FR-027).
 *
 * Reads `datadog/**` manifests, validates them (blocking the whole run on any
 * failure — FR-004), fetches the matching live objects, diffs, and prints a plan.
 * Nothing mutates unless `--apply` is passed. All decidable logic (validation,
 * diffing, tag/handle/placeholder resolution, dashboard matching, widget-ID
 * stripping) lives in `scripts/lib/datadog-sync.mjs` and is unit-tested there; this
 * file only reads files, shells out to `pup`/`fetch`, and prints.
 *
 * Usage:
 *   node scripts/datadog/sync.mjs --validate            # validate only, no network
 *   node scripts/datadog/sync.mjs                        # diff every type (default)
 *   node scripts/datadog/sync.mjs --type monitors        # diff one type
 *   node scripts/datadog/sync.mjs --type monitors --apply # mutate — requires the flag
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  RESOURCE_TYPES,
  TAG_MATCHED_TYPES,
  markerTagFor,
  extractSlug,
  validateManifest,
  extractSloPlaceholder,
  resolveMonitorPlaceholders,
  extractMetricNames,
  resolveSloPlaceholders,
  dashboardTitleMatches,
  stripWidgetIds,
  planAction,
  formatResultLine,
} from '../lib/datadog-sync.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..', '..')

// The only notification destination configured in this org (datadog/README.md) — no
// Slack integration exists, so this is a static allow-list rather than a live lookup.
const LIVE_HANDLES = ['@syntheticstesting@gmail.com']

const DIR_BY_TYPE = {
  monitors: 'monitors',
  slos: 'slos',
  'synthetics-api': path.join('synthetics', 'api'),
  'synthetics-browser': path.join('synthetics', 'browser'),
  dashboards: 'dashboards',
  'logs-metrics': 'logs-metrics',
  'service-catalog': 'service-catalog',
}

function parseArgs(argv) {
  const typeFlag = argv.indexOf('--type')
  const type = typeFlag !== -1 ? argv[typeFlag + 1] : null
  if (type && !RESOURCE_TYPES.includes(type)) {
    throw new Error(`unknown --type "${type}" — expected one of: ${RESOURCE_TYPES.join(', ')}`)
  }
  return {
    types: type ? [type] : RESOURCE_TYPES,
    apply: argv.includes('--apply'),
    validateOnly: argv.includes('--validate'),
    validateLive: argv.includes('--validate-live'),
  }
}

function loadEnv() {
  const envPath = path.join(repoRoot, '.env.local')
  const vars = { ...process.env }
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (match && !vars[match[1]]) vars[match[1]] = match[2]
    }
  }
  for (const required of ['DD_API_KEY', 'DD_APP_KEY', 'DD_SITE']) {
    if (!vars[required]) {
      throw new Error(`${required} is missing from the environment and .env.local — the sync tool uses key-auth only`)
    }
  }
  return vars
}

function readManifests(type) {
  const dir = path.join(repoRoot, 'datadog', DIR_BY_TYPE[type])
  if (!fs.existsSync(dir)) return []
  const ext = type === 'service-catalog' ? '.yaml' : '.json'
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((filename) => {
      const raw = fs.readFileSync(path.join(dir, filename), 'utf8')
      const manifest = ext === '.yaml' ? parseSimpleYaml(raw) : JSON.parse(raw)
      return { filename, manifest }
    })
}

// service-catalog is the one YAML file in the tree. Rather than take on a YAML
// dependency for a single, simple manifest, parse just enough of it: this file has no
// nested sequences-of-sequences or multiline scalars beyond `description: >`.
function parseSimpleYaml(raw) {
  // For validation and diffing purposes, structure matters more than full fidelity.
  // Delegate to `pup` at apply time (it accepts YAML natively); for the JS side we
  // only need `dd-service` and `tags` to satisfy validateManifest's checks.
  const ddService = raw.match(/^dd-service:\s*(.+)$/m)?.[1]?.trim()
  const tags = [...raw.matchAll(/^\s*-\s*(\S+)$/gm)]
    .map((m) => m[1])
    .filter((t) => t.includes(':'))
  return { 'dd-service': ddService, tags, __rawYaml: raw }
}

function ddSite(env) {
  return env.DD_SITE
}

function apiHeaders(env) {
  return {
    'DD-API-KEY': env.DD_API_KEY,
    'DD-APPLICATION-KEY': env.DD_APP_KEY,
    'Content-Type': 'application/json',
  }
}

async function restGet(env, urlPath) {
  const res = await fetch(`https://api.${ddSite(env)}${urlPath}`, { headers: apiHeaders(env) })
  if (!res.ok) throw new Error(`GET ${urlPath} → ${res.status} ${await res.text()}`)
  return res.json()
}

async function restRequest(env, method, urlPath, body) {
  const res = await fetch(`https://api.${ddSite(env)}${urlPath}`, {
    method,
    headers: apiHeaders(env),
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${urlPath} → ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

async function validateLiveTelemetry(env, manifestsByType) {
  const end = Math.floor(Date.now() / 1000)
  const start = end - 24 * 60 * 60
  const metrics = new Set()
  for (const manifests of Object.values(manifestsByType)) {
    for (const { manifest } of manifests) {
      for (const metric of extractMetricNames(manifest)) metrics.add(metric)
    }
  }

  const failures = []
  for (const metric of [...metrics].sort()) {
    const query = `avg:${metric}{service:yogakit,env:prod}`
    const result = await restGet(env, `/api/v1/query?from=${start}&to=${end}&query=${encodeURIComponent(query)}`)
    if (!result.series?.length) failures.push(`metric has no env:prod series in 24h: ${metric}`)
  }

  const logResult = await restRequest(env, 'POST', '/api/v2/logs/events/search', {
    filter: { from: new Date(start * 1000).toISOString(), to: new Date(end * 1000).toISOString(), query: 'service:yogakit' },
    page: { limit: 1 },
  })
  if (!logResult.data?.length) failures.push('no service:yogakit logs received in 24h (verify the Vercel log drain)')

  // Manifest validation only checks that `config.request.url` is present, so a synthetic
  // pointing at a hostname that no longer resolves syncs cleanly and then fails on every
  // run — quietly burning the availability SLO it backs. This is how the `yoga-kit` ->
  // `yogakit` Vercel rename stayed invisible. Probe each distinct URL for real.
  const syntheticUrls = new Map()
  for (const type of ['synthetics-api', 'synthetics-browser']) {
    for (const { filename, manifest } of manifestsByType[type] ?? []) {
      const url = manifest.config?.request?.url
      if (url && !syntheticUrls.has(url)) syntheticUrls.set(url, `${type}/${filename}`)
    }
  }
  for (const [url, source] of syntheticUrls) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (res.status >= 400) failures.push(`synthetic URL is dead: ${url} responded ${res.status} (${source})`)
    } catch (error) {
      failures.push(`synthetic URL is unreachable: ${url} (${source}): ${error.message}`)
    }
  }

  if (failures.length) {
    for (const failure of failures) console.error(`LIVE INVALID  ${failure}`)
    throw new Error(`live telemetry validation failed (${failures.length} issue(s))`)
  }
  console.log(
    `Live telemetry OK: ${metrics.size} metric(s), ${syntheticUrls.size} synthetic URL(s) and logs active in env:prod.`,
  )
}

function pup(env, args) {
  const out = execFileSync('pup', args, {
    encoding: 'utf8',
    env: { ...process.env, DD_API_KEY: env.DD_API_KEY, DD_APP_KEY: env.DD_APP_KEY, DD_SITE: env.DD_SITE },
  })
  // `pup list` prints a plain "No X found" message (to stdout, empty capture here) when
  // a tag filter matches nothing, rather than emitting `[]` — treat blank output as
  // "nothing live" instead of a JSON parse error.
  return out.trim() ? JSON.parse(out) : []
}

async function fetchLive(env, type) {
  if (type === 'monitors') {
    const result = pup(env, ['monitors', 'list', '--tags', 'service:yogakit', '--limit', '1000'])
    return Array.isArray(result) ? result : (result.data ?? result)
  }
  if (type === 'slos') {
    const result = pup(env, ['slos', 'list'])
    const all = Array.isArray(result) ? result : (result.data ?? [])
    return all.filter((s) => Array.isArray(s.tags) && s.tags.includes('service:yogakit'))
  }
  if (type === 'synthetics-api' || type === 'synthetics-browser') {
    const wantBrowser = type === 'synthetics-browser'
    const result = await restGet(env, '/api/v1/synthetics/tests')
    const all = result.tests ?? []
    return all.filter(
      (t) =>
        Array.isArray(t.tags) &&
        t.tags.includes('service:yogakit') &&
        (t.type === 'browser') === wantBrowser,
    )
  }
  if (type === 'dashboards') {
    const result = await restGet(env, '/api/v1/dashboard')
    return result.dashboards ?? []
  }
  if (type === 'logs-metrics') {
    const result = await restGet(env, '/api/v2/logs/config/metrics')
    return result.data ?? []
  }
  if (type === 'service-catalog') {
    const result = await restGet(env, '/api/v2/services/definitions')
    return (result.data ?? []).filter((d) => d.attributes?.schema?.['dd-service'] === 'yogakit')
  }
  throw new Error(`unhandled type: ${type}`)
}

// Datadog's API round-trips some fields in a form that differs from what was sent
// without the underlying value having changed: tags come back sorted, not in file
// order, and SLO thresholds gain server-computed `*_display` strings. Normalize both
// sides the same way before diffing so a real change can be told apart from an API
// reformatting artifact (planAction's own doc comment on why this stays shallow-ish).
function normalizeForDiff(type, obj, referenceOptions) {
  if (!obj) return obj
  const clone = JSON.parse(JSON.stringify(obj))
  if (Array.isArray(clone.tags)) clone.tags = [...clone.tags].sort()
  if (type === 'slos' && Array.isArray(clone.thresholds)) {
    clone.thresholds = clone.thresholds.map(({ target_display, warning_display, ...rest }) => rest)
  }
  // A monitor's live `options` carries server-assigned defaults (evaluation_delay,
  // include_tags, new_host_delay, require_full_window, silenced, ...) that never
  // appear in the manifest. Compare only the keys the manifest actually sets, or every
  // monitor reads as perpetually "changed" against its own untouched defaults.
  if ((type === 'monitors' || type === 'synthetics-api' || type === 'synthetics-browser') && clone.options && referenceOptions) {
    clone.options = Object.fromEntries(
      Object.keys(referenceOptions).map((key) => [key, clone.options[key]]),
    )
    // Synthetics nest a second layer of server defaults inside monitor_options
    // (on_missing_data, new_host_delay, include_tags, ...) — restrict the same way.
    if (referenceOptions.monitor_options && clone.options.monitor_options) {
      clone.options.monitor_options = Object.fromEntries(
        Object.keys(referenceOptions.monitor_options).map((key) => [
          key,
          clone.options.monitor_options[key],
        ]),
      )
    }
  }
  return clone
}

function matchRemote(type, filename, manifest, remoteList) {
  if (type === 'dashboards') {
    return remoteList.find((r) => dashboardTitleMatches(manifest.title, r.title)) ?? null
  }
  if (type === 'logs-metrics') {
    return remoteList.find((r) => r.id === manifest.data.id) ?? null
  }
  if (type === 'service-catalog') {
    return remoteList.find((r) => r.attributes?.schema?.['dd-service'] === manifest['dd-service']) ?? null
  }
  const wantSlug = markerTagFor(filename)
  return remoteList.find((r) => extractSlug(r.tags) && `yogakit:${extractSlug(r.tags)}` === wantSlug) ?? null
}

// service-catalog goes through `pup idp register <file>` rather than the REST
// `/api/v2/services/definitions` endpoint: the JS-side manifest (parseSimpleYaml) only
// carries `dd-service`/`tags` for validation/diffing, not the full schema, so posting it
// as the `schema` attribute rejects with "required field [dd-service] is not present" —
// pup reads the YAML file itself and registers the full document.
async function applyCreate(env, type, manifest, filename) {
  if (type === 'monitors') return pupCreateOrUpdate(env, 'monitors', manifest)
  if (type === 'slos') return pupCreateOrUpdate(env, 'slos', manifest)
  if (type === 'synthetics-api') return restRequest(env, 'POST', '/api/v1/synthetics/tests/api', manifest)
  if (type === 'synthetics-browser') return restRequest(env, 'POST', '/api/v1/synthetics/tests/browser', manifest)
  if (type === 'dashboards') return restRequest(env, 'POST', '/api/v1/dashboard', manifest)
  if (type === 'logs-metrics') return restRequest(env, 'POST', '/api/v2/logs/config/metrics', manifest)
  if (type === 'service-catalog') return pupRegisterServiceCatalog(env, filename)
  throw new Error(`unhandled type: ${type}`)
}

async function applyUpdate(env, type, manifest, remote, filename) {
  if (type === 'monitors') return pupCreateOrUpdate(env, 'monitors', manifest, remote.id)
  if (type === 'slos') {
    // Datadog cannot change an SLO's type in place. An update that switches type is
    // rejected with a message about the *live* type's required fields ("must specify the
    // query for count types" when the live SLO is metric-based), which reads like a
    // malformed manifest rather than the immutable-field problem it is. Say so here
    // instead: changing type means deleting the SLO, which issues a new ID and restarts
    // the trailing error budget, so it is never something to do as a side effect.
    if (manifest.type !== remote.type) {
      throw new Error(
        `SLO type is immutable: manifest says "${manifest.type}", live object ${remote.id} is ` +
          `"${remote.type}". Either match the live type or delete and recreate the SLO ` +
          `(which resets its 30d error budget and re-resolves {{slo_id:...}} references).`,
      )
    }
    return pupCreateOrUpdate(env, 'slos', manifest, remote.id)
  }
  if (type === 'synthetics-api') return restRequest(env, 'PUT', `/api/v1/synthetics/tests/api/${remote.public_id}`, manifest)
  if (type === 'synthetics-browser') return restRequest(env, 'PUT', `/api/v1/synthetics/tests/browser/${remote.public_id}`, manifest)
  if (type === 'dashboards') return restRequest(env, 'PUT', `/api/v1/dashboard/${remote.id}`, manifest)
  if (type === 'logs-metrics') {
    // The log-metrics update endpoint is PATCH, not PUT — a PUT answers 404 for a metric
    // that demonstrably exists, which reads as "object missing" rather than "wrong verb".
    // It also accepts only filter, group_by and compute.include_percentiles: the metric
    // ID and its aggregation_type are immutable, so send neither.
    const { filter, group_by: groupBy, compute } = manifest.data.attributes
    const attributes = { filter, group_by: groupBy }
    if (compute?.include_percentiles !== undefined) {
      attributes.compute = { include_percentiles: compute.include_percentiles }
    }
    return restRequest(env, 'PATCH', `/api/v2/logs/config/metrics/${remote.id}`, {
      data: { type: 'logs_metrics', attributes },
    })
  }
  if (type === 'service-catalog') return pupRegisterServiceCatalog(env, filename)
  throw new Error(`unhandled type: ${type}`)
}

function pupRegisterServiceCatalog(env, filename) {
  const file = path.join(repoRoot, 'datadog', DIR_BY_TYPE['service-catalog'], filename)
  return pup(env, ['idp', 'register', file, '--yes'])
}

function pupCreateOrUpdate(env, resource, manifest, id) {
  const tmpFile = path.join(repoRoot, `.datadog-sync-tmp-${resource}.json`)
  fs.writeFileSync(tmpFile, JSON.stringify(manifest))
  try {
    return id
      ? pup(env, [resource, 'update', id, '--file', tmpFile, '--yes'])
      : pup(env, [resource, 'create', '--file', tmpFile, '--yes'])
  } finally {
    fs.rmSync(tmpFile, { force: true })
  }
}

async function main() {
  const { types, apply, validateOnly, validateLive } = parseArgs(process.argv.slice(2))

  const manifestsByType = {}
  for (const type of types) {
    manifestsByType[type] = readManifests(type)
  }

  // Validate every manifest across every requested type before doing anything else
  // (FR-004): one bad file anywhere blocks the whole run, not just its own type.
  const knownSloTags = (manifestsByType.slos ?? readManifests('slos')).map((m) =>
    extractSlug(m.manifest.tags),
  )
  const knownMonitorTags = [
    ...(manifestsByType.monitors ?? readManifests('monitors')).map((m) => extractSlug(m.manifest.tags)),
    ...(manifestsByType['synthetics-api'] ?? readManifests('synthetics-api')).map((m) => extractSlug(m.manifest.tags)),
    ...(manifestsByType['synthetics-browser'] ?? readManifests('synthetics-browser')).map((m) => extractSlug(m.manifest.tags)),
  ]
  let anyInvalid = false
  for (const type of types) {
    for (const { filename, manifest } of manifestsByType[type]) {
      const { valid, errors } = validateManifest(type, filename, manifest, {
        liveHandles: LIVE_HANDLES,
        knownSloTags,
        knownMonitorTags,
      })
      if (!valid) {
        anyInvalid = true
        console.error(`INVALID  ${type}/${filename}`)
        for (const err of errors) console.error(`  - ${err}`)
      }
    }
  }
  if (anyInvalid) {
    console.error('\nOne or more manifests are invalid. Fixing them all, applying nothing.')
    process.exit(1)
  }
  console.log(`Validated ${types.reduce((n, t) => n + manifestsByType[t].length, 0)} manifest(s). OK.`)
  if (validateOnly && !validateLive) return

  const env = loadEnv()
  if (validateLive) {
    await validateLiveTelemetry(env, manifestsByType)
    return
  }
  const lines = []
  let exitCode = 0

  for (const type of types) {
    let remoteList
    try {
      remoteList = await fetchLive(env, type)
    } catch (err) {
      console.error(`Failed to fetch live ${type}: ${err.message}`)
      exitCode = 1
      continue
    }

    // Resolve live SLO IDs by slug once per run, for monitors that reference one.
    const sloIdBySlug = {}
    if (type === 'monitors') {
      const liveSlos = await fetchLive(env, 'slos').catch(() => [])
      for (const slo of liveSlos) {
        const slug = extractSlug(slo.tags)
        if (slug) sloIdBySlug[slug] = slo.id
      }
    }

    const monitorIdBySlug = {}
    if (type === 'slos') {
      const liveMonitors = await fetchLive(env, 'monitors')
      for (const monitor of liveMonitors) {
        const slug = extractSlug(monitor.tags)
        if (slug) monitorIdBySlug[slug] = monitor.id
      }
    }

    for (const { filename, manifest: rawManifest } of manifestsByType[type]) {
      let manifest = rawManifest
      if (type === 'monitors' && extractSloPlaceholder(manifest.query)) {
        try {
          manifest = { ...manifest, query: resolveSloPlaceholders(manifest.query, sloIdBySlug) }
        } catch (err) {
          lines.push(formatResultLine({ type, name: filename, action: 'error', status: 'blocked', detail: err.message }))
          exitCode = 1
          continue
        }
      }
      if (type === 'slos' && manifest.type === 'monitor') {
        try {
          manifest = { ...manifest, monitor_ids: resolveMonitorPlaceholders(manifest.monitor_ids, monitorIdBySlug) }
        } catch (err) {
          lines.push(formatResultLine({ type, name: filename, action: 'error', status: 'blocked', detail: err.message }))
          exitCode = 1
          continue
        }
      }

      let remote = matchRemote(type, filename, manifest, remoteList)
      // The dashboards LIST endpoint returns summaries only (no `widgets` field) — the
      // full object, needed for both diffing and PUT-on-update, only comes from the
      // single-dashboard GET.
      if (type === 'dashboards' && remote) {
        remote = await restGet(env, `/api/v1/dashboard/${remote.id}`)
      }
      // The JS-side service-catalog manifest (parseSimpleYaml) carries only
      // `dd-service`/`tags` plus a `__rawYaml` scratch field — real diffing happens
      // against the schema Datadog actually stored, at `attributes.schema`, and never
      // against `__rawYaml` (which the live side has no equivalent for).
      const localForCompare =
        type === 'service-catalog' ? { 'dd-service': manifest['dd-service'], tags: manifest.tags } : manifest
      const compareLocal = normalizeForDiff(type, type === 'dashboards' ? stripWidgetIds(localForCompare) : localForCompare, manifest.options)
      // logs-metrics manifests are written in the API's request/response envelope
      // ({ data: { id, type, attributes } }), but the v2 list/get endpoints return
      // that same object unwrapped — re-wrap before comparing, or every metric reads
      // as "changed" against its own unwrapped self.
      let remoteForCompare = type === 'logs-metrics' && remote ? { data: remote } : remote
      if (type === 'service-catalog' && remote) {
        const schema = remote.attributes?.schema ?? {}
        remoteForCompare = { 'dd-service': schema['dd-service'], tags: schema.tags }
      }
      const compareRemote = normalizeForDiff(
        type,
        type === 'dashboards' && remoteForCompare ? stripWidgetIds(remoteForCompare) : remoteForCompare,
        manifest.options,
      )
      const plan = planAction(compareLocal, compareRemote)
      const name = manifest.name ?? manifest.title ?? manifest['dd-service'] ?? manifest?.data?.id ?? filename

      if (plan.action === 'no-change') {
        lines.push(formatResultLine({ type, name, action: 'no-change', status: 'in sync' }))
        continue
      }

      if (!apply) {
        lines.push(
          formatResultLine({
            type,
            name,
            action: plan.action,
            status: 'would apply',
            detail: plan.changed?.join(', '),
          }),
        )
        continue
      }

      try {
        if (plan.action === 'create') await applyCreate(env, type, manifest, filename)
        else await applyUpdate(env, type, manifest, remote, filename)
        lines.push(formatResultLine({ type, name, action: plan.action, status: 'applied' }))
      } catch (err) {
        lines.push(formatResultLine({ type, name, action: plan.action, status: 'FAILED', detail: err.message }))
        exitCode = 1
      }
    }

    // Drift: live objects tagged service:yogakit with no matching local manifest.
    if (TAG_MATCHED_TYPES.includes(type)) {
      const localSlugs = new Set(manifestsByType[type].map(({ filename }) => extractSlug([markerTagFor(filename)])))
      for (const remote of remoteList) {
        const slug = extractSlug(remote.tags)
        if (slug && !localSlugs.has(slug)) {
          lines.push(formatResultLine({ type, name: remote.name ?? slug, action: 'drift', status: 'live, not in repo' }))
        }
      }
    }
  }

  console.log('')
  for (const line of lines) console.log(line)
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
