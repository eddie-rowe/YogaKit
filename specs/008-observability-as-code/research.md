# Research: Observability as Code

Input: `specs/008-observability-as-code/spec.md`. This resolves the open questions the
spec leaves to planning, drawing on the working reference implementation at
`/Users/eddie.rowe/Repos/NextMove` (`docs/BEST_PRACTICES_FROM_NEXTMOVE.md` §B5) and on
what is actually live today, verified against the Datadog API.

## 1. Which Datadog org, and what's live there today

**Decision**: `us5.datadoghq.com`, the same org NextMove uses, with credentials from
this repo's own `.env.local` (`DD_API_KEY`, `DD_APP_KEY`, `DD_SITE=us5.datadoghq.com`).

**Rationale**: `.env.local` already carries a full `DD_*`/`NEXT_PUBLIC_DD_*` variable set
pointed at us5 — someone provisioned this before 008 was scoped. `/api/v1/validate`
against those keys returns `{"valid":true}`.

**What's actually live, verified by API call, not assumed**:
- Zero monitors carry `service:yogakit` today.
- The us5 org's RUM applications (10 total) include no application named `yogakit` or
  `YogaKit`. `NEXT_PUBLIC_DD_RUM_APPLICATION_ID` and `NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN` in
  `.env.local` are both empty strings.
- `src/components/DatadogRum.tsx` reads `NEXT_PUBLIC_DATADOG_APP_ID` /
  `NEXT_PUBLIC_DATADOG_CLIENT_TOKEN` — variable names that do not match anything in
  `.env.local` or the Vercel project. Its own guard (`if (!applicationId ||
  !clientToken) return`) means it has been a no-op in every environment.

**Consequence for scope**: FR-026 ("extend the existing client-side telemetry
integration rather than replacing it") is read as *extend the posture*, not *extend the
working wiring* — there is no working wiring to extend. The posture (full sampling,
replay off, interaction/resource/long-task tracking off, `mask` privacy) is preserved
exactly; the plumbing connecting it to a real Datadog RUM application is new.

**Alternatives considered**: a fresh org, to avoid mixing with NextMove's resources —
rejected per explicit owner direction; namespacing by tag (`service:yogakit`,
`yogakit:<slug>`) keeps the two products fully separable inside one org without the
overhead of managing two orgs' credentials.

## 2. Sync mechanism: pup CLI vs. raw REST vs. Terraform

**Decision**: `pup` (Datadog's key-authed first-party CLI, already installed at
`/opt/homebrew/bin/pup`, v0.43.1) for monitors and SLOs; direct REST calls for
synthetics, dashboards, service-catalog, and logs-metrics, because pup does not expose
write operations for those object types. No Terraform.

**Rationale**: This is NextMove's proven choice, and the reasoning transfers unchanged:
`pup` supports `DD_API_KEY`/`DD_APP_KEY`/`DD_SITE` key-auth that does not expire on a
fixed short interval, which is what FR-010/FR-011 require for a headless routine. The
Datadog MCP server, by contrast, is OAuth — this session's own `pup auth status` shows a
token expiring in under an hour, which is exactly the failure mode a 30-day unattended
routine cannot tolerate. Terraform would add a state-file dependency and a second
apply-mechanism (`terraform apply`) alongside `pup`/REST, contradicting FR-003's "no
mode in which merely running the tool mutates" if state drifts from either path.

**Alternatives considered**: Terraform's `datadog` provider — rejected; it manages
state outside git-diffable JSON, doesn't match the "one concern per file" shape FR-001
asks for as naturally as flat manifests, and NextMove has zero Terraform usage to draw a
proven pattern from. Raw REST-only (no pup) — rejected because pup's CLI ergonomics
(`pup monitors create --file <tmp>`) are simpler to shell out to than hand-rolling
monitor/SLO REST payloads, and pup is what actually kept NextMove's routine authenticated
for 30 days.

## 3. Idempotency marker

**Decision**: every manifest carries the tag `yogakit:<filename-without-extension>` as
its match key, plus `env:prod`, `service:yogakit`, and `managed_by:git`.

**Rationale**: satisfies FR-008 directly. `managed_by:git` (rather than NextMove's
`managed_by:pup-sync`) names the source of truth — the repository — not the transport
tool, so the marker survives if the transport changes later.

**Alternatives considered**: NextMove's own two conventions,
`managed_by:pup-sync`/`nextmove:<slug>` and the divergent, likely-never-applied
`managed-by:spec-005`. Neither is ported: NextMove's own READMEs flag the two-system
split as a live problem, and porting a known problem alongside the pattern that works
would be porting drift, not the pattern.

## 4. Notification handle

**Decision**: `@syntheticstesting@gmail.com`, sourced from `.env.local`'s
`DDOG_SYNTHETIC_TESTING_EMAIL`.

**Rationale**: FR-024 requires validation reject a monitor whose destination doesn't
resolve. us5 has no Slack integration configured (verified: `/api/v1/integration/slack/*`
returns 404) and no existing PagerDuty service for YogaKit (NextMove's is
`@pagerduty-nextmove`, a different product). An email handle always resolves and needs no
console setup this session can't perform headlessly.

**Alternatives considered**: reusing `@pagerduty-nextmove` — rejected, mixes two
products' escalation paths. A new PagerDuty/Slack integration — deferred; it is a console
setup step outside this branch's reach, and the spec's own assumption is that a single
resolvable destination plus the owner-digest issue is sufficient for now (008
Assumptions: "alerts route to both a standing digest and a human notification channel").

## 5. Scope: monitors/SLOs only, or full NextMove parity

**Decision**: full parity — monitors, SLOs, synthetics, dashboards, logs-metrics,
service-catalog — which amends the spec's stated dashboard exclusion.

**Rationale**: explicit owner direction, recorded in `DECISIONS.md`. The spec's own
argument against dashboards ("poor ratio of review value to churn") is accepted as a
real cost, not refuted; the owner chose breadth over that argument for this branch. FR-009
is satisfied as a floor ("at least one monitor... at least one objective"), not a ceiling.

**Alternatives considered**: the spec's own default (monitors + SLOs only) — this was the
first option offered and not chosen.

## 6. Server-side tracing

**Decision**: add `@vercel/otel` via `src/instrumentation.ts`, exporting OTLP to
`https://otlp.us5.datadoghq.com` (already the value of `OTEL_EXPORTER_OTLP_ENDPOINT` in
`.env.local`).

**Rationale**: without server traces, an "API availability" SLO or latency monitor has
no signal to query — NextMove's own SLOs are built on `trace.next_js.BaseServer.*`
metrics that only exist because `@vercel/otel` is registered. FR-012 requires the read
path obtain error rate, web vitals, and page-view volume; the availability SLO FR-009
requires is honest only if something is actually measuring server-side success/failure.
No `dd-trace` agent is used — this app runs on Vercel serverless, where an always-on
agent process isn't available; OTLP export configured by env vars is the pattern that
works there.

**Alternatives considered**: basing the availability SLO purely on synthetic uptime
checks with no APM — considered adequate for "is the site up" but not for "is a request
succeeding," which is the FR-009 concern; rejected once tracing was approved.

## 7. Content-free enforcement mechanism (FR-021)

**Decision**: a dedicated pure-core/thin-entry pair,
`scripts/lib/telemetry-check.mjs` + `scripts/check-telemetry-content-free.mjs`, mirroring
`scripts/lib/copy-lint.mjs` + `scripts/copy-lint.mjs` exactly in shape: pure logic
unit-tested to 100% in the coverage allow-list, thin CLI wrapper doing file I/O only.

**Rationale**: RULE-L7 currently has zero automated test — only a compliant hand-written
configuration. The repo already has a proven template for "an automated check that must
demonstrably fail" (both `copy-lint.mjs --dir` and `validate-poses.mjs --dir` exist
expressly to prove their gates can fail, per those scripts' own comments). Reusing that
shape rather than inventing a new one keeps the check's blocking-CI behavior consistent
with the one other lint the repo already trusts to gate merges.

**What it checks**: (a) every `datadog/**/*.json` manifest's `query`, `message`, and
`tags` fields contain no interpolated non-identifier value (satisfies FR-023 in the same
pass); (b) every call site of `logger.{info,warn,error,debug}` in `src/` passes only
field names, never a literal string value, for any key not in a small allow-list of
known-safe identifiers (route names, status codes, counts) — a stricter, statically
checkable version of the `BANNED_FIELD_NAMES` set the logger already enforces at
runtime. The static check catches what the runtime guard's name-based denylist can miss:
a *value* that happens to be a flow title logged under an innocuously-named field.

**Alternatives considered**: an AST-based analysis of every string literal reaching
`datadogRum.*` calls — more thorough but a materially larger build; deferred, noted in
plan.md as a known gap, not attempted this pass.

## 8. `/autoobs` scope this branch

**Decision**: ship the command definition (`.claude/commands/autoobs.md`) and the
`docs/observation/` / `docs/routine_runs/autoobs/` scaffolding so the routine is runnable
by hand. Do not build 007's scheduler, label taxonomy, or owner-digest issue automation.

**Rationale**: explicit owner direction — 008 first, autoobs stub second. 007 is
unimplemented (spec only, no plan/tasks, no `.claude/commands/` directory exists at all
yet in this repo). Building a full four-routine loop here would mean inventing 007's
design decisions (done-gates, work-consumption labels, digest ladder) as a side effect of
an 008 branch, which is scope this plan explicitly declines.

**Alternatives considered**: building all of 007 alongside — rejected as out of scope;
008-only with no command at all — rejected because the spec's own US2 opens with "the
observe routine from Feature 007 needs... on a schedule, with no human present," and a
completely unproven read path is a worse deliverable than one proven runnable by hand.
