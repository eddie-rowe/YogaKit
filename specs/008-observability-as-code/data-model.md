# Data Model: Observability as Code

This feature introduces no application data model (no new tables, no RLS policy). The
"entities" are the manifest shapes the spec names, plus the two non-manifest artifacts
the sync tool and check operate on.

## Monitor Manifest

One file per monitor under `datadog/monitors/*.json`.

| Field | Type | Notes |
|---|---|---|
| `name` | string | `[YogaKit] <Human Readable Name>` |
| `type` | enum | `query alert` \| `log alert` \| `slo alert` |
| `query` | string | Must reference only `service`/`env`/metric identifiers — never an interpolated user value (FR-023) |
| `message` | string | Ends with the notification handle. Identifier-only body (FR-023) |
| `tags` | string[] | MUST include `env:prod`, `service:yogakit`, `managed_by:git`, and `yogakit:<slug>` (the FR-008 marker, matching the filename) |
| `options.thresholds` | object | `{critical, warning?}` |

**Validation rules** (enforced by `scripts/lib/datadog-sync.mjs`):
- `tags` MUST contain a `yogakit:<slug>` entry matching the filename — reject if
  missing (FR-008).
- The handle in `message` MUST resolve against the live handle list, or the manifest is
  rejected outright — a monitor that cannot notify is treated as worse than no monitor
  (FR-024, SC-010).
- `query` and `message` MUST contain no quoted literal that isn't a known identifier
  pattern (`service:`, `env:`, a metric name, a tag) — checked by the content-free tool,
  not the sync tool, but validation failure in either blocks apply.

## Objective (SLO) Manifest

One file per objective under `datadog/slos/*.json`.

| Field | Type | Notes |
|---|---|---|
| `name` | string | `[YogaKit] <Human Readable Name>` |
| `type` | enum | `metric` \| `monitor` |
| `query.numerator` / `query.denominator` | string | metric type only |
| `monitor_ids` | string[] | monitor type only — resolved by the sync tool from `yogakit:<slug>` tags at apply time, **never hardcoded** (research.md §5 — this is the one place this plan diverges from NextMove's manifests, which hardcode live SLO/monitor IDs and are therefore unportable) |
| `thresholds` | array | `[{target, warning?, timeframe}]` |
| `tags` | string[] | same convention as Monitor Manifest |

## Synthetic Manifest

`datadog/synthetics/api/*.json` and `datadog/synthetics/browser/*.json`.

| Field | Type | Notes |
|---|---|---|
| `name` | string | `[YogaKit] Synthetic: <name>` |
| `type` / `subtype` | string | `api` and `http`, or `browser` |
| `config` | object | request/assertions (api) or empty steps (browser stub) |
| `locations` | string[] | e.g. `["aws:us-east-1"]` |
| `status` | enum | `live` \| `paused` — browser stubs start `paused` until steps are recorded in the Datadog UI, same convention as NextMove |
| `tags` | string[] | same convention |

## Dashboard Manifest

`datadog/dashboards/*.json`. **Exception to the tag-match convention**: the Dashboards
API has no `tags` field, so identity is exact `title` match, per NextMove's documented
convention. Widget IDs are server-assigned and stripped before diffing
(`stripWidgetIds()`, ported).

## Log-Based Metric Manifest

`datadog/logs-metrics/*.json`, Datadog v2 `logs_metrics` JSON:API shape — `filter.query`,
`compute.{aggregation_type, path}`, `group_by[]`. Unlike NextMove (where this directory
is documentation only, with no sync handler), this plan's sync tool gets a real handler
for this type (research.md §3 / plan.md Phase 3).

## Service Catalog Entry

`datadog/service-catalog/yogakit.yaml`, schema-version `v2.1`: `dd-service: yogakit`,
`team`, `tier`, contact, links (repo, prod URL, `docs/OBSERVABILITY.md` as runbook, APM
service URL).

## Sync Tool (non-persisted; the process, not a data entity)

Reads all manifests → validates every one → diffs against live state fetched via
`pup`/REST → prints a table → mutates only under `--apply`, and only if every manifest in
the run validated (FR-004). Drift (live objects with no matching manifest) is reported,
never auto-deleted (FR-006).

## Documented Query (a row in `docs/OBSERVABILITY.md`, not a manifest)

| Field | Meaning |
|---|---|
| Signal | client error rate / LCP / INP / CLS / page-view volume |
| Window | e.g. "last 24h" — every query states one (FR-013) |
| Query | the exact `pup`/REST invocation |
| Consuming routine | `/autoobs` (this pass); 007's observe routine (future) |

## Content-Free Invariant (the rule the check enforces, not a stored entity)

Telemetry MUST carry page views, errors, and web vitals only. No pose selection, flow,
note, journal entry, reflection, mood, or energy value in any attribute, log field,
session record, or alert payload (FR-020). Enforced by
`scripts/check-telemetry-content-free.mjs` over `datadog/**/*.json` and every
`logger.*`/`datadogRum.*` call site in `src/`.
