# YogaKit Datadog Manifests

Source-of-truth JSON/YAML definitions for Datadog monitors, SLOs, synthetics,
dashboards, logs-based metrics, and the service catalog entry. Ported pattern from
NextMove (`docs/BEST_PRACTICES_FROM_NEXTMOVE.md` §B5), adapted per
`specs/008-observability-as-code/research.md`.

**Nothing here is live until `scripts/datadog/sync.mjs --apply` runs.** This is a new
integration, not a migration — see research.md §1: RUM had never actually initialized
before this branch, and no monitor tagged `service:yogakit` existed in us5.

## Structure

- `monitors/` — alert monitors, CRUD via `pup` (key-auth)
- `slos/` — service level objectives, CRUD via `pup`
- `synthetics/api/` — API uptime tests, applied via the Datadog REST API
- `synthetics/browser/` — browser flow tests (stub only; steps must be recorded in
  the Datadog UI, then flipped from `status: paused` to `status: live`)
- `dashboards/` — dashboards, applied via the Datadog REST API
- `logs-metrics/` — log-based metrics (v2 `logs_metrics` JSON:API shape), applied via
  the Datadog REST API. Unlike NextMove, this directory has a real sync handler, not
  just documentation of hand-clicked setup.
- `service-catalog/` — one YAML entry (schema-version v2.1), applied via the Service
  Definitions REST API

## Identity convention

Every manifest carries a tag `yogakit:<filename-without-extension>` — the sync tool's
idempotency key (FR-008). Every manifest also carries `env:prod`, `service:yogakit`,
and `managed_by:git`. `managed_by:git` rather than NextMove's `managed_by:pup-sync`,
because the marker should name the source of truth (this repo), not the transport
tool used to reach it.

**Exception: `dashboards/`.** The Dashboards API has no `tags` field, so dashboard
manifests are matched by exact `title` instead. Keep dashboard titles unique, and
rename the manifest file alongside any title change — the sync tool will otherwise
treat a renamed title as a new dashboard.

**No hardcoded SLO IDs.** A monitor whose `query` needs a live SLO ID (the
`slo-burn-*` monitors) writes a placeholder — `{{slo_id:yogakit:<slo-slug>}}` — which
`scripts/lib/datadog-sync.mjs` resolves against the live SLO carrying that
`yogakit:<slo-slug>` tag at apply time and substitutes before sending the request.
NextMove's four burn-rate monitors instead embed literal Datadog SLO hashes, which
makes them unportable between orgs; this plan deliberately does not carry that
forward (`data-model.md`, "Objective (SLO) Manifest").

## Running the sync

```bash
npm run datadog:diff                        # dry run, every type
npm run datadog:diff -- --type monitors      # dry run, one type
npm run datadog:apply -- --type monitors     # mutate — requires the explicit flag
npm run datadog:validate                     # validate every manifest, no network call
npm run datadog:validate-live                # require active env:prod metrics + logs
```

Credentials come from `.env.local` at the repo root (`DD_API_KEY`, `DD_APP_KEY`,
`DD_SITE=us5.datadoghq.com`) — key-auth only, never an interactive `pup auth login`
session (`docs/OBSERVABILITY.md` explains why).

## Manifest notes

| File | Kind | Threshold (critical) |
|---|---|---|
| `rum-error-rate.json` | query alert | client error rate > 5% (warn 2%) |
| `web-vitals-lcp.json` | query alert | LCP p75 > 2.5s (warn 2s) |
| `web-vitals-inp.json` | query alert | real-user page load p75 > 4s (warn 2.5s; legacy filename preserves live identity) |
| `api-error-rate.json` | query alert | server error rate > 5% (warn 2%) |
| `api-latency-p95.json` | query alert | p95 > 5s (warn 2s, in nanoseconds) |
| `synthetic-read-view-down.json` | query alert | no synthetic test runs / 15m (legacy filename preserves live identity) |
| `log-ingestion-liveness.json` | log alert | no production logs / 30m |
| `rum-telemetry-freshness.json` | query alert | no RUM sessions for 30m |
| `apm-telemetry-freshness.json` | query alert | no Next.js request spans for 30m |
| `slo-burn-fast-read-view-availability.json` | slo alert | 25% of the 30-day error budget consumed |
| `slo-burn-slow-read-view-availability.json` | slo alert | 10% of the 30-day error budget consumed |

Both SLO alerts use `error_budget("<slo_id>").over("<timeframe>")`, not `burn_rate(...)`.
`burn_rate()` monitor queries were rejected outright by this org/plan
(`invalid burn rate query`, with no further detail, for every window and multi-window
form tried) — `error_budget()` is the mechanism that us5 actually accepts, and its
`.over()` window must equal the referenced SLO's own configured timeframe (`30d` here)
or the API rejects it (`Slo '<id>' does not have timeframe '<window>'`).

Every monitor message ends `@syntheticstesting@gmail.com` (the address in
`.env.local`'s `DDOG_SYNTHETIC_TESTING_EMAIL`) — there is no Slack integration
configured in this org (confirmed by a 404 against
`/api/v1/integration/slack/channels`), so email is the notification destination for
this pass.

The read-view availability SLO (`slos/read-view-availability.json`) is metric-based: its
numerator and denominator are `synthetics.test_runs{yogakit:read-view-200,...}` counts
(numerator additionally scoped to `status:success`), not a reference to the synthetic's
companion monitor. `{{monitor_id:...}}` portable-tag resolution exists in the sync
tooling for a monitor-based SLO, but no manifest currently uses it.

Use `synthetics.test_runs`'s `status` tag (`success`/`failure`), not
`synthetics.http.response`'s `status_code_class`, for any SLO or monitor meant to catch
a synthetic *assertion* failure — a synthetic can return HTTP 200 and still fail its
content assertion, which `status_code_class:2xx` cannot see. This is not hypothetical:
it is why the read-view SLO reported 100% availability throughout the 13-day outage
behind `#39` (see `DECISIONS.md`, 2026-09-23 entry).

`datadog:validate` also rejects retired metric families that Datadog accepts
syntactically but no longer populates. `datadog:validate-live` goes further: over the
last 24 hours it requires an `env:prod,service:yogakit` series for every metric named
by a manifest and at least one YogaKit log. CI runs this authenticated check after a
push to `main`; PR validation remains credential-free.

### Expected drift under `--type monitors`

`npm run datadog:diff` reports five monitors tagged `service:yogakit` as
`drift | live, not in repo`, named after the synthetic tests (`[YogaKit] Synthetic:
Homepage Returns 200`, etc., plus the two browser tests — `Read Flow Offline` and
`Read View RUM Session`). These are **not** unmanaged
config — Datadog auto-creates a companion alert monitor for every synthetic test,
inheriting its name and tags, and that monitor is not addressable as a separate
manifest. There is nothing under `synthetics/` to add; this drift is Datadog's own
synthetics infrastructure surfacing under the `monitors` type, and is expected to
persist across every run.

### Monitors legitimately reading No Data pre-launch

A monitor's `overall_state` can read `No Data` without anything being broken — RUM and
the offline-read synthetic have zero real traffic before launch. Tag such a monitor
`yogakit:no-data-expected` and `datadog:validate-live`'s evaluated-state check will
skip it; anything untagged that reads `No Data` fails CI. Currently tagged this way:
`rum-error-rate`, `rum-telemetry-freshness`, `web-vitals-inp`, `web-vitals-lcp`, and
the `read-flow-offline` synthetic (its browser steps are a recorded stub, `status:
paused` — see the manifest's own `message`).

`rum-telemetry-freshness` has been No Data since 2026-09-10, older and unrelated to the
Next.js metric-rename incident below — `rum.measure.session{service:yogakit}` appears
to have no live series for this service at all pre-launch. Tracked as a known gap, not
fixed as a side effect of `#64`.

### `#64` — three APM monitors read No Data despite healthy traffic (fixed 2026-09-24)

The Next.js 16.3.5 bump (`#42`, `337239e`) changed dd-trace's span naming: `dd-trace`
stopped emitting `trace.next_js.BaseServer.handleRequest*` at 2026-09-21 18:29:59 UTC
and started emitting the generic `trace.web.request*` at 18:00:00 UTC the same day — a
clean cutover, not a partial outage. `api-error-rate.json`, `api-latency-p95.json`, and
`apm-telemetry-freshness.json` still queried the dead family, so each read `No Data`
while the service itself served ~2,031 req/24h at 0% errors. Fixed by re-pointing all
three (plus the equivalent dashboard widgets in `yogakit-health.json`) at
`trace.web.request*`.

Separately, `api-error-rate.json`'s numerator (`http.status_code:5*`) has zero
occurrences ever — Datadog counters emit no points at count zero, so that tag slice
looks identical to "wrong metric name" to a raw query. Fixed by appending `.fill(0)` to
the numerator so the ratio evaluates to 0% rather than `No Data` when there are no 5xx
requests, and taught `datadog:validate-live`'s query-probe to skip any fragment guarded
by `.fill(0)` (the absence is declared, not accidental).

This is also why `validateLiveTelemetry` used to miss it: it reconstructed a generic
`avg:<metric>{service:yogakit,env:prod}` probe from the bare metric name, discarding
each manifest's real aggregation and tag filters — so it validated a query no monitor
actually runs. It now probes the manifest's own scoped query fragment
(`extractScopedQueries`) and separately reads each live monitor's real `overall_state`
(`findUnexpectedNoData`), rather than only diffing manifest-declared keys.
