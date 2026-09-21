---
model: opus
description: Comprehensive Datadog Product Report
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Task: Generate Comprehensive Datadog Product Report

## Timeframe

The user may specify a timeframe as an argument: $ARGUMENTS

**Valid timeframe values:** `1h`, `4h`, `12h`, `24h`, `3d`, `7d`, `14d`, `30d`

**If no timeframe is provided** (i.e., `$ARGUMENTS` is empty or not a valid timeframe), use AskUserQuestion to ask the user which timeframe they want:

```
Question: "What timeframe should this report cover?"
Options:
- "24 hours (Recommended)" → use `24h`
- "7 days" → use `7d`
- "14 days" → use `14d`
- "30 days" → use `30d`
```

## Execution

Run the following pup commands to gather product data. Auth is headless: `pup` reads `DD_API_KEY`/`DD_APP_KEY`/`DD_SITE` from the environment — no interactive `pup auth login` needed (see `docs/OBSERVABILITY.md`). If a command exits with an auth error, **do NOT stop or wait for input** (this runs unattended): note the Datadog auth gap in the report, mark the affected sections `nodata`, and continue with the other connectors. If `pup` itself is missing, check `.datadog-cli-available` and fall back to the Datadog MCP if present.

```bash
# APM
pup apm services list --env production -o json
pup apm entities list --env production -o json
pup metrics query --query "sum:trace.next_js.BaseServer.handleRequest.errors{service:nextmove,env:production}.as_rate()" --from TIMEFRAME
pup metrics query --query "avg:trace.next_js.BaseServer.handleRequest{service:nextmove,env:production}" --from TIMEFRAME

# RUM
pup rum apps list -o json
pup rum sessions search --query "service:nextmove" --from TIMEFRAME -o json
pup rum events --query "@type:action service:nextmove" --from TIMEFRAME -o json
pup rum events --query "@type:error service:nextmove" --from TIMEFRAME -o json

# Logs
pup logs search --query "service:nextmove status:error" --from TIMEFRAME -o json
pup logs aggregate --query "service:nextmove" --from TIMEFRAME --compute count

# Monitors
pup monitors list -o json
pup monitors search --query "tag:managed_by:pup-sync" -o json

# SLOs
pup slos list -o json

# Synthetics
pup synthetics tests list -o json

# Inngest
pup metrics query --query "sum:inngest.function_run.ended.total{*}" --from TIMEFRAME
pup metrics query --query "sum:inngest.function_run.ended.total{result:failed}" --from TIMEFRAME
pup logs search --query "service:nextmove (@function.name:briefing-compose OR @function.name:briefing-daily-dispatch OR @function.name:first-sync-on-connect OR @function.name:integration-health-check OR @function.name:scoring-adaptation OR @function.name:snooze-requeue OR @function.name:trial-ending-email)" --from TIMEFRAME

# Error Tracking — grouped by track (logs, apm, rum)
pup error-tracking issues search --from TIMEFRAME --track rum -o json
pup error-tracking issues search --from TIMEFRAME --track logs -o json

# LLM Observability — Anthropic + OpenAI usage
pup llm-obs projects list -o json
pup llm-obs spans search --from TIMEFRAME -o json

# Security Signals
pup security signals list --query "service:nextmove" --from TIMEFRAME -o json

# Code Security findings (SCA + SAST + IaC) — snapshot, no --from flag
# NOTE: security findings search does NOT accept --from; it returns the current posture snapshot.
# Filter by resource/service tag client-side.
pup security findings search --query "service:nextmove" -o json
# SCA list has no flags; filter client-side
pup static-analysis sca list -o json

# CI/CD Visibility
pup cicd pipelines list --from TIMEFRAME -o json
pup cicd tests aggregate --from TIMEFRAME --compute count --group-by "@test.status" -o json
pup cicd flaky-tests search --from TIMEFRAME -o json

# Database Monitoring (Supabase Postgres)
pup metrics query --query "sum:postgresql.queries.count{*}" --from TIMEFRAME
pup metrics query --query "avg:postgresql.queries.duration{*} by {query_signature}" --from TIMEFRAME
pup metrics query --query "avg:postgresql.connections.active{*}" --from TIMEFRAME

# Service Catalog
pup service-catalog list -o json

# Deployment Events (Vercel deploys, GitHub events)
pup events search --query "source:vercel" --from TIMEFRAME -o json
pup events search --query "source:github tags:nextmove" --from TIMEFRAME -o json

# Dashboards
pup dashboards list -o json
```

Synthesize all pup output into the report template below. If a command returns no data, report that product as "No data in timeframe." If a command exits with an error, report it as unavailable with the error message.

## Report Template

Create a markdown report at `docs/observation/datadog-reports/YYYY-MM-DD.md` with these sections. Fill in actual values from the JSON. Use the report timeframe throughout.

1. **Executive Summary** — Total products available, products with active data, products with errors
2. **Product Inventory Table** — One row per product: status icon, last data, one-line summary (18 products total: APM, RUM, Logs, Monitors, SLOs, CI Pipelines, CI Tests, Inngest, Vercel, Code Security, LLM Obs, Error Tracking, Service Catalog, Deployment Events, DBM, Bits Code + Executive Summary + Recommended Actions)
3. **APM** — Error rate, latency from metrics series. Note: uses `@vercel/otel` (OpenTelemetry → Datadog OTLP intake). Check that `nextmove` appears in `pup apm services list --env production`.
4. **RUM** — Session count, authenticated users, Core Web Vitals, error count, business actions table (`integration_connected`, `integration_disconnected`, `onboarding_step_completed`, `briefing_viewed`, `action_clicked`, `billing_upgrade_clicked`), APM-RUM connection status. Note: NextMove RUM app ID = `257eb9e4-2254-4a51-bd8e-c7a3ef23884b` — **active** as of 2026-06-15 (migrated to `@datadog/browser-rum-nextjs@7.3.0` with `instrumentation-client.ts` + `<DatadogAppRouter />`). Confirm sessions flowing: `pup rum sessions search --query "service:nextmove" --from 24h`. Also check sourcemap upload status — RUM stacks will be minified without it.
5. **Logs** — Error count, top error messages from log entries
6. **Monitors** — Monitor count by state (OK/Alert/Warn/No Data), monitor details table. NextMove monitors: tag `managed_by:pup-sync`
7. **SLOs** — SLO compliance table with target, current, error budget, status
8. **CI Pipelines** — Pipeline runs grouped by branch and result using `pup cicd pipelines list`. Surface failed pipelines in the timeframe and link to the CI Pipeline Explorer. If no data: CI Visibility was recently enabled — confirm the first GitHub Actions run has fired since enabling.
9. **CI Tests** — Test run counts by status from `pup cicd tests aggregate`. Flaky tests from `pup cicd flaky-tests search`. Surface failed test names and suites; flag any test that appears in the flaky list. Tag `@test.service:nextmove` must be set in the test reporter for service-scoped queries to work.
10. **Inngest** — Function runs started/ended/rate-limited/scheduled, steps running/sleeping, available metrics list with tags. Requires Inngest native Datadog integration to be enabled.
11. **Vercel** — Request volume by source type, 5xx errors by path, cache performance, regions. Requires Vercel log drain to Datadog.
12. **Code Security** — Three sub-sections: (a) **Misconfigurations** — from `pup security findings search --query "service:nextmove" -o json`; filter client-side on `.vulnerability_type`. **Important**: `security findings search` does NOT accept `--from` — it returns the current posture snapshot, not a time-windowed query. Filter `by .attributes.resource | test("nextmove"; "i")` if `--query` is insufficient. (b) **SCA (library vulns)** — from `pup static-analysis sca list -o json`; empty until CI pipeline runs with the datadog-ci static analysis step. (c) **Signals (runtime)** — from `pup security signals list --query "service:nextmove" --from TIMEFRAME`. Escalate critical/high findings; list informational for reference. Note the rule name may be empty for hosted-scan findings — show severity + vulnerability_type + resource instead.
13. **LLM Observability** — Anthropic Claude + OpenAI token usage, latency, error rates per model. LLM Obs projects: `pup llm-obs projects list`. Spans: `pup llm-obs spans search`. **Not yet wired**: AI calls are at `src/inngest/functions/briefing-compose.ts:608` (Anthropic) and `:625` (OpenAI), and `src/services/intelligence/narrative.ts:291` (Anthropic). Instrument these with `dd-trace`'s LLMObs SDK to track cost/tokens per briefing, per user, per model — the highest-value observability gap given NextMove's AI-first product.
14. **Error Tracking** — Grouped errors from RUM + Logs + APM. Use `pup error-tracking issues search --track rum --from TIMEFRAME` and `--track logs`. Shows impacted_sessions per issue. Monitor for regressions after deploys.
15. **Service Catalog** — Check that `nextmove` is registered: `pup service-catalog list`. Manifest at `datadog/service-catalog/nextmove.yaml`. Register via Datadog API: `curl -X POST "https://api.us5.datadoghq.com/api/v2/catalog/entity" -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY" -F "file=@datadog/service-catalog/nextmove.yaml"`.
16. **Deployment Events** — Recent Vercel deploys and GitHub merges: `pup events search --query "source:vercel" --from 24h`. Useful for correlating regressions to specific deploys.
17. **Database Monitoring (Supabase)** — Query throughput (`postgresql.queries.count`), p95 query duration by signature (`postgresql.queries.duration by {query_signature}`), and connection saturation (`postgresql.connections.active`). Supabase Cloud integration confirmed live: 28 data points in 24h as of 2026-06-15. Flag if duration breakdown shows raw `?` placeholders instead of normalized query signatures — indicates explain plans are not flowing from the Supabase agent.
18. **Bits Code** — Datadog's AI PR-review product (attaches inline comments to GitHub PRs). Verify it posted on recent PRs: `gh pr list --json number,url,comments | jq '.[] | {pr: .number, dd_comments: [.comments[] | select(.author.login | test("datadog|bits"; "i"))] | length}'`. No pup endpoint — report "Active (N PR comments detected)" or "Not posting — check Bits Code GitHub App install at github.com/apps/datadog."
19. **Recommended Actions** — Prioritized action items based on findings

Each product section should include relevant **Datadog UI Links** (see reference below).

## Datadog UI Links Reference

- **APM Services**: https://us5.datadoghq.com/apm/services
- **APM Service (nextmove)**: https://us5.datadoghq.com/apm/services/nextmove/operations/next.js.request/resources?env=production
- **APM Traces**: https://us5.datadoghq.com/apm/traces?query=service%3Anextmove
- **RUM Explorer**: https://us5.datadoghq.com/rum/explorer
- **RUM App (NextMove)**: https://us5.datadoghq.com/rum/explorer?application_id=257eb9e4-2254-4a51-bd8e-c7a3ef23884b
- **RUM Sessions**: https://us5.datadoghq.com/rum/sessions
- **RUM Actions**: https://us5.datadoghq.com/rum/explorer?query=%40type%3Aaction
- **Log Explorer**: https://us5.datadoghq.com/logs?query=service%3Anextmove
- **Monitors**: https://us5.datadoghq.com/monitors/manage?q=tag%3Amanaged_by%3Apup-sync
- **SLOs**: https://us5.datadoghq.com/slo?query=service%3Anextmove
- **Synthetics**: https://us5.datadoghq.com/synthetics/tests?query=service%3Anextmove
- **CI Pipeline Explorer**: https://us5.datadoghq.com/ci/pipeline-executions
- **CI Test Explorer**: https://us5.datadoghq.com/ci/test-runs?query=%40test.service%3Anextmove
- **CI Flaky Tests**: https://us5.datadoghq.com/ci/test-runs?query=%40test.service%3Anextmove%20%40test.is_flaky%3Atrue
- **Inngest Metrics**: https://us5.datadoghq.com/metric/explorer?exp_metric=inngest.function_run.ended.total
- **Vercel Logs**: https://us5.datadoghq.com/logs?query=source%3Avercel
- **Vercel Errors**: https://us5.datadoghq.com/logs?query=source%3Avercel%20%40statusCode%3A%3E%3D500
- **Code Security**: https://us5.datadoghq.com/security/code-security
- **LLM Observability**: https://us5.datadoghq.com/llm/observability
- **Error Tracking (RUM)**: https://us5.datadoghq.com/error-tracking?query=service%3Anextmove
- **Service Catalog**: https://us5.datadoghq.com/services?query=service%3Anextmove
- **Deployment Events**: https://us5.datadoghq.com/event/explorer?query=source%3Avercel
- **Dashboards**: https://us5.datadoghq.com/dashboard/lists
- **Database Monitoring**: https://us5.datadoghq.com/databases/list
- **Static Analysis (SCA)**: https://us5.datadoghq.com/ci/code-analysis
- **Sensitive Data Scanner**: https://us5.datadoghq.com/sensitive-data-scanner/configuration

## Recommended Actions Guidance

Based on findings, include actionable recommendations:

- **APM No Data**: Check `@vercel/otel` config in `instrumentation.ts`, verify `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS` are set in Vercel env (production + preview). APM must receive traces before SLOs and many monitors have meaningful data.
- **Sourcemap Upload Missing**: RUM is now active but without `datadog-ci sourcemaps upload` in the Vercel build, all RUM error stacks will show minified code. Add the upload step to the Vercel build pipeline so Error Tracking is actually usable. Reference: `npx datadog-ci sourcemaps upload .next/static --service nextmove --release-version $NEXT_PUBLIC_DD_VERSION --minified-path-prefix /_next/static`.
- **Inngest No Data**: Enable the Inngest native Datadog integration (Inngest dashboard → Settings → Integrations → Datadog) with the Inngest signing key. This unlocks monitor #3 (function failures) and the Inngest section.
- **Vercel Log Drain Missing**: Install Vercel → Datadog integration from the Vercel Integrations Marketplace. This populates the Logs section.
- **LLM Observability Not Wired**: NextMove calls Anthropic (Claude) at `briefing-compose.ts:608` and `narrative.ts:291`, and OpenAI at `briefing-compose.ts:625`. Instrument these with `dd-trace` LLM Obs to track token usage, cost, latency, and error rates per model. This is the highest-value gap given the AI-first product.
- **Service Catalog**: Registered as entity `614e80e9-960d-4511-9b5c-69c0111def4c` (schema v2.1, tier Critical). Keep `datadog/service-catalog/nextmove.yaml` in sync if the schema or links change. To re-register after edits: `curl -X POST "https://api.us5.datadoghq.com/api/v2/catalog/entity" -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY" -H "Content-Type: text/yaml" --data-binary @datadog/service-catalog/nextmove.yaml`
- **Synthetics Failing**: If Homepage/Sign-up/Inngest synthetics are in Alert, check that the assertion `statusCode < 400` is deployed (manifests updated — run `scripts/datadog/sync.ts --apply --type synthetics` to push fixes).
- **No NextMove Dashboard**: Create a NextMove overview dashboard in Datadog UI showing APM error rate, RUM sessions, Inngest success rate, and monitor states. Link from Service Catalog entry.
- **Missing Monitors**: Consider adding: `briefing-compose` p99 latency > 30s, integration extractor failure rate > 10%, RUM session rage-click spike, LLM token spend > $X/day (once LLM Obs is wired).
- **Missing SLOs**: Consider adding: Briefing delivery success rate (99% / 30d), Integration sync success rate (95% / 7d).
- **Code Security Findings**: Prioritize critical/high SCA findings for package upgrades, review SAST for injection/XSS.
- **CI Visibility scoped to wrong org**: `pup cicd pipelines list` returns runs from other repos on this Datadog org. For NextMove data: add `DD_API_KEY` + `DD_APP_KEY` as GitHub Actions secrets in `eddie-rowe/NextMove` and add `datadog/ci-visibility-github-action@v2` + `npx @datadog/datadog-ci junit upload --service nextmove` steps to the workflow. Set `DD_SERVICE=nextmove` and `DATADOG_SITE=us5.datadoghq.com`.
- **Code Security findings not appearing in report**: `pup security findings search` does NOT accept `--from` — passing it causes a silent error and returns 0 results. Correct call: `pup security findings search --query "service:nextmove" -o json`. As of 2026-06-15 there are 2 high-severity misconfiguration findings in `github.com/eddie-rowe/nextmove` (hosted scan, `origin:ci`). Review at: https://us5.datadoghq.com/security/code-security
- **Sensitive Data Scanner not configured**: Gmail/Calendar PII flows through logs and RUM. Configure redaction rules via `pup data-governance scanner rules list` and the Sensitive Data Scanner UI. High priority given OAuth email content in logs. [Configure](https://us5.datadoghq.com/sensitive-data-scanner/configuration)
- **DBM query signature normalization**: Verify `postgresql.queries.duration` shows normalized query signatures (not raw `?` placeholders). If raw, confirm Supabase agent explain-plan forwarding is enabled in the integration settings.
- **Watchdog**: Confirm Watchdog is enabled for this org (Datadog Settings → Watchdog). Zero-config anomaly detection on APM + logs — only fires useful alerts once the APM metric export gap is fixed.
- **GitHub Integration**: Install Datadog GitHub App on `eddie-rowe/NextMove` for source code links in APM traces and deploy markers.

## Output Summary

After saving the report, output:

```
Report: docs/observation/datadog-reports/YYYY-MM-DD.md
Summary:
- Timeframe: [human-readable]
- Products: N/18 reporting data
- Issues Detected: N
Key Findings: [top 3-5 findings]
```
