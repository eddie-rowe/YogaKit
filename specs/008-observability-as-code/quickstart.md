# Quickstart: Observability as Code

## Prerequisites

`DD_API_KEY`, `DD_APP_KEY`, `DD_SITE=us5.datadoghq.com` in `.env.local` (already present
in this repo). `pup` installed (`brew install ddev/tap/pup` or see NextMove's
`scripts/setup-web-env.sh`) and **not** logged in interactively — key-auth only:

```bash
pup auth status   # should show "not authenticated" or be ignored — DD_API_KEY/DD_APP_KEY take precedence
```

## Diff manifests against live Datadog (safe — never mutates)

```bash
npm run datadog:diff                        # every type
npm run datadog:diff -- --type monitors      # one type
```

Prints a `TYPE | NAME | ACTION | STATUS` table. `create`/`update`/`no-change`/`error`.
Exits non-zero only on a validation error, never because drift exists.

## Apply (mutates live Datadog — requires the explicit flag)

```bash
npm run datadog:apply -- --type monitors
```

Validates every manifest first; if any manifest of the requested type is invalid,
**nothing is applied**, including the valid ones in the same run (FR-004).

## Validate only (CI-safe, no credentials required beyond validation)

```bash
npm run datadog:validate
```

## Run the content-free check

```bash
node scripts/check-telemetry-content-free.mjs
```

Blocking in CI, next to `npm run lint:copy`. Prove it can fail:

```bash
node scripts/check-telemetry-content-free.mjs --dir tests/fixtures/telemetry-violation
```

## Read telemetry health by hand (the path `/autoobs` uses)

```bash
pup rum aggregate --query 'service:yogakit @application.id:<rum-app-id>' --from 24h --compute count
pup metrics query --query 'avg:rum.error.count{service:yogakit}' --from 24h
pup metrics query --query 'p75:rum.view.largest_contentful_paint{service:yogakit}' --from 24h
```

Every query and its window is also documented in `docs/OBSERVABILITY.md`, which is the
guide's actual authority — this file is a fast local check, not a substitute for it.

## Run the routine by hand

```bash
# Paste the contents of docs/routine_runs/autoobs/system-instructions.md into a session.
```

Produces `docs/observation/digests/YYYY-MM-DD.md` and appends one line to
`docs/planning/routine-log.md`.
