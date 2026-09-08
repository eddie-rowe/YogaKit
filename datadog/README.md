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
```

Credentials come from `.env.local` at the repo root (`DD_API_KEY`, `DD_APP_KEY`,
`DD_SITE=us5.datadoghq.com`) — key-auth only, never an interactive `pup auth login`
session (`docs/OBSERVABILITY.md` explains why).

## Manifest notes

| File | Kind | Threshold (critical) |
|---|---|---|
| `rum-error-rate.json` | query alert | client error rate > 10% (warn 5%) |
| `web-vitals-lcp.json` | query alert | LCP p75 > 4s (warn 2.5s) |
| `web-vitals-inp.json` | query alert | INP p75 > 500ms (warn 200ms) |
| `api-error-rate.json` | query alert | server error rate > 10% (warn 5%) |
| `api-latency-p95.json` | query alert | p95 > 5s (warn 2s, in nanoseconds) |
| `synthetic-read-view-down.json` | query alert | any synthetic HTTP failure / 15m |
| `slo-burn-fast-read-view-availability.json` | slo alert | 100% of the 30-day error budget consumed (SLO breached) |
| `slo-burn-slow-read-view-availability.json` | slo alert | 50% of the 30-day error budget consumed (trending toward breach) |

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

### Expected drift under `--type monitors`

`npm run datadog:diff` reports four monitors tagged `service:yogakit` as
`drift | live, not in repo`, named after the synthetic tests (`[YogaKit] Synthetic:
Homepage Returns 200`, etc., plus the browser test). These are **not** unmanaged
config — Datadog auto-creates a companion alert monitor for every synthetic test,
inheriting its name and tags, and that monitor is not addressable as a separate
manifest. There is nothing under `synthetics/` to add; this drift is Datadog's own
synthetics infrastructure surfacing under the `monitors` type, and is expected to
persist across every run.
