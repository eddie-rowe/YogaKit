# Observability

YogaKit's Datadog integration (`008-observability-as-code`), ported from the pattern in
`docs/BEST_PRACTICES_FROM_NEXTMOVE.md` §B5. This is the reference for every environment
variable, every attribute convention, and every routine that reads production health.

## 1. The content-free invariant (read this before adding any new attribute)

**Telemetry carries page views, errors, and web vitals only — never pose, flow, note,
journal, mood, or energy content, and never a credential or token.** This is RULE-L7
(constitution v3.0.0, Principle VI), and it is not a style preference: practice content
is private by design (Principle VIII), and a telemetry pipeline is a side channel that
bypasses every RLS policy protecting it.

Before adding any new field to a RUM attribute, a structured-log call, or a Datadog
manifest, ask one question: **is this a page/route identifier, an error type, a
performance number, or a Datadog-internal ID?** If yes, it's allowed. If it is, or could
ever be, user-authored text or a value derived from it (a pose name, a flow title, a
journal sentence, a mood/energy rating, a search query, free-text) — it is not allowed,
full stop, regardless of how useful it would be for debugging.

This is enforced at three points, not just documented:

- **`src/lib/telemetry/scrub.ts`** — view and resource URLs use explicit allow lists;
  reviewed dynamic routes are parameterized (`/poses/downward-dog` →
  `/poses/[slug]`) and unknown paths are redacted by default. Free-text error messages
  and stack message lines are always redacted, while sanitized stack frames remain
  available for source-map resolution. Wired into RUM's `beforeSend` and the server
  logger. 100% branch coverage (`vitest.config.ts`).
- **`src/lib/utils/logger.ts`** — `assertSafeFields` throws if a structured-log call
  passes a banned field name (`note`, `journal`, `mood`, `token`, `secret`, …). A
  logger call must never be the reason a request fails, but passing banned content
  through the logger is exactly the failure this guard exists to catch before it ships.
- **`scripts/lib/telemetry-check.mjs`** (via `npm run lint:telemetry`, CI-blocking) —
  statically scans every `logger.*`/`datadogRum.*` call site under `src/` and every
  manifest under `datadog/` for a banned field name, and fails the build if it finds
  one. This is the automated test RULE-L7 never had before this feature — a check that
  asserts a constitutional guarantee and is itself untested is a claim, not a gate.

The static field-name check cannot infer whether a permitted attribute value was
derived from user content. URL and error values have runtime defenses, but new custom
attributes still depend on reviewers applying the question above at PR time.

## 2. Attribute-naming conventions

| Prefix | Meaning | Example |
|---|---|---|
| `usr.*` | RUM user-identity attributes (Datadog's own convention) | not currently set — YogaKit does not identify RUM users by ID |
| `session.*` | RUM session-scoped attributes (Datadog's own convention) | set automatically by `@datadog/browser-rum` |
| `dd.*` | Datadog correlation IDs, always Datadog-internal identifiers, never content | `dd.trace_id`, `dd.span_id` (from `src/lib/utils/logger.ts`'s `traceContext()`); also present on RUM view/resource events for same-origin requests, since `src/instrumentation-client.ts`'s `allowedTracingUrls` propagates W3C trace context (`propagatorTypes: ['tracecontext']`) into the `@vercel/otel` backend spans — a RUM session and the server span it triggered now share one `dd.trace_id` |
| `error.*` | Top-level (not nested) error shape on a log line, so Datadog Error Tracking groups it | `error.kind`, `error.message`, `error.stack` (from `logger.error(msg, fields, err)`) |
| `db.*`, `supabase.*` | Low-cardinality server-side Supabase dependency metadata | `db.operation.name`, `db.collection.name`, `db.stored_procedure.name`, `supabase.component`; emitted by `src/lib/supabase/tracing.ts`, never query strings, row IDs, bodies, or object paths |
| `@view.*`, `@application.id` | RUM's own reserved attributes for view/app scoping | `@application.id:<rum-app-id>` — always filter RUM queries by this, not just `service:yogakit` (see §4) |

New attributes should extend one of these prefixes rather than invent a new one. If a
new attribute doesn't fit any of them, that's a signal to re-check §1 before adding it.

## 3. Environment variables

All Datadog variables are optional at boot — unset, RUM/tracing/logging correlation
degrade to a silent no-op, never a thrown error (FR-025/SC-011). None of them belong in
`src/lib/env.ts`'s required schema. Full inline documentation: `.env.example`.

| Variable | Purpose | Required? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_DD_RUM_APPLICATION_ID` | RUM application ID | No (RUM stays dark without it) | Inlined at build time — must be set in Vercel **before** the build that should carry it, not just in `.env.local` |
| `NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN` | RUM client token | No | Same build-time caveat as above |
| `NEXT_PUBLIC_DD_SITE` | Datadog site for the browser SDK | No | `us5.datadoghq.com` for this org |
| `NEXT_PUBLIC_DD_SERVICE` | Service name tag on RUM events | No | `yogakit` |
| `NEXT_PUBLIC_DD_ENV` | Env tag on RUM events | No | `prod` — **not** `production`; every query in §4 assumes `env:prod` |
| `NEXT_PUBLIC_DD_VERSION` | Version tag on RUM events | No | **Ignored on Vercel** — `next.config.ts` overrides it with the commit SHA (§8). Local only |
| `DD_SERVICE` | Service name for `@vercel/otel` tracing + logger correlation | No | `yogakit`; run through `normalizeServiceName()` (`src/lib/dd-service-name.ts`) since a hyphen silently breaks `service:` queries |
| `DD_ENV` | Env tag for server-side tracing | No | `prod` |
| `DD_VERSION` | Version tag for server-side tracing | No | `1.0.0` |
| `DD_APPSEC_ENABLED` | App & API Protection | Yes, for AAP | Enables request threat detection in `dd-trace` |
| `DD_APPSEC_RASP_ENABLED` | Runtime Application Self-Protection (RASP) | Yes, for RASP | Blocks supported exploit attempts from inside the application process |
| `DD_API_SECURITY_ENABLED` | API Security | Yes, for API discovery | Collects API endpoint and schema metadata; requires App & API Protection |
| `DD_IAST_ENABLED` | Interactive Application Security Testing (IAST) | Yes, for IAST | Tracks request data through supported code paths; assess its runtime overhead before production rollout |
| `DD_APPSEC_SCA_ENABLED` | Software Composition Analysis (SCA) | Yes, for runtime SCA | Reports vulnerable libraries loaded by the application process |
| `DD_API_KEY` | Datadog API key | Only for `scripts/datadog/sync.mjs` and the content-free check's live-handle validation | Never bundled into the app — read only by Node scripts, never sent to the browser |
| `DD_VERSION` | Version tag for server-side tracing | No | Same — **ignored on Vercel**, overridden with the commit SHA (§8) |
| `DD_API_KEY` | Datadog API key | `scripts/datadog/sync.mjs`, the content-free check's live-handle validation, and CI's test instrumentation | Never bundled into the app — read only by Node scripts, never sent to the browser. CI reads it as a GitHub Actions repository secret |
| `DD_APP_KEY` | Datadog application key | Same as `DD_API_KEY` | Same |
| `DD_SITE` | Datadog site for server-side/script API calls | Same as `DD_API_KEY` | `us5.datadoghq.com` |

Key-auth only. The sync tool and any headless routine (`/autoobs`) use
`DD_API_KEY`/`DD_APP_KEY`/`DD_SITE` exclusively — never an interactive `pup auth login`
session, which is a separate, expiring OAuth credential unrelated to these three vars
(verified live: `specs/008-observability-as-code/tasks.md` T031).

### Application security

`vercel.json` enables App & API Protection, RASP, API Security, IAST, and runtime
SCA for deployed server functions. The equivalent command for a conventional Node
deployment is:

```bash
DD_APPSEC_ENABLED=true DD_APPSEC_RASP_ENABLED=true DD_API_SECURITY_ENABLED=true DD_IAST_ENABLED=true DD_APPSEC_SCA_ENABLED=true node app.js
```

These settings are read by the Datadog Node tracing library (`dd-trace`). This
repository currently uses `@vercel/otel` for server tracing; OpenTelemetry export
by itself does not implement Datadog application security. The Vercel project must
therefore inject or package a compatible `dd-trace` version before these products
produce security telemetry. Keep the tracer loaded before Next.js and other
instrumented modules.

Datadog Workload Protection (also called Cloud Workload Security or host runtime
security) is not enabled by these variables. It requires a Datadog Agent with host
or container access for process, file, and network activity, which Vercel's managed
serverless runtime does not expose. RASP is the available in-process runtime
protection for this deployment model.

## 4. Routine → signal → query map

Every query below is scoped `env:prod` (not `env:production`) and, for RUM, additionally
scoped `@application.id:<rum-app-id>` — an unscoped `service:yogakit` RUM query can read
healthy while the scoped one is actually dark, or vice versa; see `.claude/commands/
autoobs.md` "Configuration" for the cross-check.

| Routine | Signal | Query shape | Time window |
|---|---|---|---|
| `/autoobs` step 1 | Monitor status | `pup monitors list` / `GET /api/v1/monitor?tags=service:yogakit`, cross-checked against `datadog/monitors/*.json` | current state (no window) |
| `/autoobs` step 2 | SLO status + error budget | `pup slos list` / `GET /api/v1/slo?tags_query=service:yogakit`, history via `GET /api/v1/slo/<id>/history` | 30d (the SLOs' own configured timeframe) |
| `/autoobs` step 3 | Real-user RUM error rate, LCP p75, page-load p75 | `POST /api/v2/rum/analytics/aggregate`, excluding `@session.type:synthetics` and `@browser.name:HeadlessChrome` | last 24h |
| `/autoobs` step 4 | Server error rate, API latency p95 | Datadog metrics query, `service:yogakit env:prod` | last 24h |
| `/autoobs` step 5 | Synthetic uptime | `GET /api/v1/synthetics/tests` filtered `service:yogakit`, then `GET /api/v1/synthetics/tests/<id>/results` | last 24h |
| `/autoobs` step 6 | Dashboard reachability | `GET /api/v1/dashboard/<id>` for `[YogaKit] Health` | current state (no window) |
| `npm run datadog:diff` | Manifest drift (any type) | Full read-compare over all 7 resource types | current state (no window) |
| `npm run datadog:validate-live` | Metric/log pipeline liveness | Every manifest metric must have an `env:prod,service:yogakit` series; logs search must return at least one event | last 24h |

The `rum-telemetry-freshness` and `apm-telemetry-freshness` monitors alert after 30
minutes without intake. The five-minute public synthetics make an empty APM window a
pipeline failure rather than merely a low-traffic period. Generation is monitored
separately because its SSE protocol reports application outcomes inside HTTP 200
responses: `generate.sequence` spans and `generate.outcome` logs carry only an outcome
code and stage/total durations, and the `yogakit.generate.outcomes` log metric powers
the generation error-rate monitor and dashboard.

Thresholds for each monitor (what counts as AT-RISK vs. BREACHED): `datadog/README.md`
"Manifest notes" table.

**Synthetic traffic is pipeline evidence, not user evidence.** `datadog/synthetics/
browser/read-view-rum-session.json` loads the read view every 15 minutes to prove RUM
ingestion before organic traffic exists. Real-user dashboard and monitor queries
exclude both Datadog synthetic sessions and HeadlessChrome sessions, so datacenter and
local automation cannot make user experience look healthy. Those panels may correctly
show no data pre-launch; synthetic companion monitors separately cover uptime.

**A green synthetic here is not proof RUM is firing.** This synthetic asserts the page
returns 200 — it says nothing about whether the RUM SDK actually started a session on
that load. Confirmed live 2026-09-08: RUM was dark in production for days despite this
synthetic passing every hour (now every 15 minutes), because `app/layout.tsx` never
mounted `<DatadogAppRouter />` (see `DECISIONS.md`, 2026-09-08 entry). The only
trustworthy check that RUM is actually producing sessions is `POST
/api/v2/rum/events/search` itself, not this synthetic's status.

**View *count* is its own separate check, once sessions exist at all.** Same day: after
the mount was fixed, one navigation to `/poses` produced ~90 duplicate view events in a
production session — a real second bug in `@datadog/browser-rum-nextjs`'s
`DatadogAppRouter`, replaced by `src/components/DatadogRumView.tsx` (see `DECISIONS.md`'s
next entry). Verify view-count sanity by capturing actual `browser-intake` beacon bodies
in a Playwright script across several fresh loads, never by polling
`getInternalContext()` — internal context only ever shows the *current* view, so it is
blind to a churn burst that starts and ends within a single render pass.

**Session replay is sampled at 10% — masking is enforced per-field, not just by
the app-wide default.** Every text, search, and email input carries
`data-dd-privacy="mask-user-input"`, including profile, organization, generation-theme,
catalog-search, and composer fields. **Any new free-text input must carry the same
attribute** before replay is trusted not to leak it. The app-wide
`defaultPrivacyLevel: 'mask'` remains a second layer of defense.

RUM does not initialize on `localhost` or `127.0.0.1`. This prevents local/headless
sessions and their dependency spans from polluting production RUM cohorts and the APM
service map. Server instrumentation also ignores localhost, npm registry, and Next.js
telemetry URLs, and only honors `DD_ENV` in Vercel's production environment; local and
preview spans use `development`/`preview`. Existing inferred service-map edges age out
according to Datadog's retention window.

## 5. Manual setup checklist (lives outside this repo)

These are one-time, click-through steps in Vercel/Datadog that the sync tool and the
codebase cannot apply for you — check them if a signal above reads unexpectedly dark:

- [ ] **Vercel → Datadog log drain** configured for the YogaKit project, so server logs
      (including `logger.ts`'s structured JSON lines) reach Datadog Log Management.
      Confirm with `npm run datadog:validate-live`; configuration is incomplete until
      that command sees at least one `service:yogakit` log in 24 hours.
- [ ] **Vercel project env vars** — every `NEXT_PUBLIC_DD_*` and `DD_*` var in §3 set for
      the Production environment (and Preview, if preview-environment telemetry is
      wanted). `NEXT_PUBLIC_*` vars are inlined at build time — setting them after a
      build has already run does nothing until the next build.
      In particular, `DD_ENV=prod` is required; server instrumentation uses the current
      `deployment.environment.name` OTel semantic attribute so Datadog maps it to
      `env:prod` instead of Vercel's default `env:production`.
- [ ] **Datadog ↔ Vercel integration** enabled in Datadog's Integrations catalog, so
      deployment events and Vercel-sourced infrastructure metrics correlate with
      `service:yogakit`.
- [x] **Datadog GitHub App** created and installed on the `YogaKit` repo, with
      **`Actions: Read`** (CI Pipeline Visibility) and **`Contents: Read`** (inline
      source snippets on stack frames). Datadog → Integrations → GitHub →
      *Add New GitHub Application*. One app covers both; see §8.
- [x] **CI Visibility enabled for the repo** — Software Delivery → CI Visibility →
      *Add a Pipeline Provider* → GitHub → *Enable Account*, then toggle `YogaKit`.
      Nothing in this repo turns this on; without it no workflow run is recorded, and
      installing the app is not sufficient on its own — the two are separate switches,
      which cost most of a day to establish.
- [x] **`DD_API_KEY` set as a GitHub Actions repository secret** —
      `gh secret set DD_API_KEY --repo eddie-rowe/YogaKit`. It was genuinely unset until
      2026-09-09, which is why the JUnit upload it was written for had never once
      succeeded — see FRICTION.md. Without it the test step runs the suite normally and
      sends Datadog nothing, silently and by design.
- [ ] **Vercel observability trace drain** connected to the same Datadog US5
      organization, with Traces enabled for the YogaKit project. `@vercel/otel`
      creates spans, but it does not make a trace visible in Datadog unless Vercel is
      configured to export it. Confirm a production request appears under APM service
      `yogakit` before debugging any child Supabase span. **Currently unset**, which is
      what fails `datadog:validate-live` on `main`.
- [ ] **Synthetics global variables** — if any synthetic test needs a shared
      credential (none currently do; all three live API tests hit public routes), set
      it once in Datadog Synthetics → Settings → Global Variables rather than
      hardcoding it into a manifest.
- [ ] **RUM application exists in us5** with the ID/token in `.env.example` — already
      done for this branch (application ID `91af99b0-865b-405f-914e-bda170dc43b7`);
      re-check this box only if the application is ever recreated.

## 6. Supabase traces and Database Monitoring

Server-created Supabase clients use `src/lib/supabase/tracing.ts` as their fetch
transport. Each Data API request is a child of the active Next.js request trace and is
tagged with a stable operation and allow-listed table or RPC name. Auth, Storage,
Realtime, and Functions requests get only their component and HTTP method. The wrapper
never records a URL query, row ID, request/response body, object path, authorization
header, or exception message.

In APM, start with `service:yogakit @supabase.component:postgrest`. Useful facets are
`@db.operation.name`, `@db.collection.name`, and `@db.stored_procedure.name`. The same
trace already joins to same-origin RUM requests and structured logs, so a slow browser
interaction can be followed through the Next request, the Supabase dependency span,
and its correlated log lines.

DBM itself requires infrastructure outside this repository:

1. Run a Datadog Agent where it can reach the Supabase Postgres endpoint; neither a
   Vercel Function nor hosted Supabase runs that Agent for this app. Use TLS, a
   least-privilege Datadog monitoring role, and `dbm: true` in the Agent's Postgres
   integration. Prefer the direct database endpoint when network support allows it;
   otherwise verify the chosen Supabase pooler mode exposes the DBM catalog/statistics
   queries Datadog requires.
2. Give that database instance the unified tags `service:yogakit` and `env:prod`, and
   use database name `postgres`, matching the APM span attributes. Restrict inbound
   database networking to the Agent and rotate the monitoring password normally.
3. Verify Query Metrics and Query Samples arrive in Datadog DBM, then pivot between APM
   and DBM by the same time window, database, operation, and table/RPC tags.

There is an important boundary: Supabase JS sends HTTP to PostgREST; YogaKit does not
execute SQL or hold a Postgres connection. PostgREST generates SQL after the Vercel
trace has left the process and does not inject that trace context into its SQL comment.
Consequently Datadog cannot provide one-click, exact query-sample-to-trace linking for
these calls. The spans above provide honest, time/resource correlation without
pretending it is exact propagation. Exact DBM/APM linking would require a server-only
direct Postgres client instrumented for DBM propagation. Do not migrate signed-in/RLS
queries to such a client merely for telemetry: preserving per-user transaction-local
identity and safe Vercel connection pooling is a prerequisite.

Browser-created Supabase clients remain visible as RUM resources, not backend APM
spans. Trace headers are intentionally not sent cross-origin to Supabase because they
would stop at the Data API and cannot create the missing SQL link.

## 7. Source-map upload

RUM error stack traces are minified without this step — a gap NextMove repeatedly
flagged and never closed. It is now wired into the build itself, not a manual follow-up:
`next.config.ts` sets `productionBrowserSourceMaps: true`, and `package.json`'s `build`
script is `next build && node scripts/upload-sourcemaps.mjs`. Since Vercel's project
build command is the default `npm run build`, every production build (Vercel or local)
runs this automatically — nothing extra to remember at deploy time.

`scripts/upload-sourcemaps.mjs` (thin I/O; decision logic lives in the unit-tested
`scripts/lib/sourcemaps.mjs`, `vitest.config.ts`'s 100%-coverage allow-list) does three
things in order:

1. **Skip quietly if `DD_API_KEY` is unset.** A local `npm run build`, or a fork PR with
   no repo secrets, must succeed normally — this is 008's degrade-don't-abort posture
   (FR-025/SC-011) applied to the build step, not an error.
2. **Upload** `.next/static/**/*.map` via `npx @datadog/datadog-ci sourcemaps upload`,
   using `--service=$NEXT_PUBLIC_DD_SERVICE`,
   `--release-version=$NEXT_PUBLIC_DD_VERSION`, and
   `--minified-path-prefix=/_next/static`.
3. **Delete every `.map` file** from the build output — whether or not the upload
   succeeded. Datadog then holds them server-side for stack resolution, but nothing sits
   publicly readable at `/_next/static` in the deployed app — the trade-off of turning on
   `productionBrowserSourceMaps` in the first place. The two failure modes are not
   symmetric: an unresolved stack in Datadog is degraded telemetry, while a map left in
   `.next/static` is readable by anyone who requests it, so a failed upload takes the
   worse telemetry rather than the disclosure.

**This step never fails a build, even with a key present.** On Vercel `npm run build`
*is* the deploy, so aborting here does not degrade observability, it stops the product
shipping — which is exactly what happened on 2026-09-08, when two production deploys
failed in a row over an optional telemetry upload while both builds were fine. Upload
failures are warnings; the script exits 0. Same call `ci.yml` makes for every optional
Datadog step it runs.

**`DD_API_KEY` is mirrored into `DATADOG_API_KEY` before the child runs.** They are not
interchangeable in this one command: `sourcemaps upload` constructs its internal metrics
logger *before* uploading and — alone among datadog-ci's upload commands — passes it no
`apiKey`, so the bundled `datadog-metrics` reads `DATADOG_API_KEY` only and throws
`DATADOG_API_KEY environment variable not set`. This is a datadog-ci bug (5.23.0), not a
configuration mistake; `uploadEnv()` works around it. If a future CLI version fixes it,
the mirror becomes harmless rather than wrong.

**Set `DD_SITE` wherever `DD_API_KEY` is set.** datadog-ci resolves its upload site from
`DATADOG_SITE || DD_SITE` and falls back to US1 (`datadoghq.com`), while the browser SDK
reads `NEXT_PUBLIC_DD_SITE` — and this project is on `us5`. Setting the key but not the
site uploads every map to the wrong region, where *both* halves succeed and RUM shows
minified stacks forever. `siteMismatchWarning()` prints a warning when the two disagree.

**`--release-version` must equal what RUM reports as its `version`, exactly.** A
mismatch is a silent failure: the upload succeeds and stacks still don't resolve,
because Datadog looks maps up by service+version+path, not by upload time. Rather than
trusting three env vars to stay in step, all three call sites now read one function,
`resolveVersion()` in `scripts/lib/dd-version.mjs` — see §8.


## 8. CI and source code integration

Three things had to be true before a production error could be traced back to the line
of source that caused it. Two of them live in this repo; one is a click-through.

**Pipeline Visibility is entirely a Datadog/GitHub UI setup** — no workflow YAML, no
tracer, nothing in this repo. The two checkboxes are in §5. Once enabled, every
`ci.yml` run appears under Software Delivery → CI Pipeline List with a span per job and
step. Note the list page shows only the repo's **default branch**; branch and PR runs
are on the Executions page, which is a surprising place to lose ten minutes.

**Test Optimization runs on dd-trace, not JUnit XML.** `ci.yml`'s unit-test step loads
the tracer through `NODE_OPTIONS` (`--import dd-trace/register.js -r dd-trace/ci/init` —
vitest is ESM-first and needs both hooks). This replaced a `datadog-ci junit upload`
step: JUnit gives Datadog a file of pass/fail lines, while the tracer emits a span per
test, which is what test history, flaky detection, and per-session code coverage are
built on. Running both would double-report, so the upload step is gone.

Three constraints on that step, each of which has a way of biting:

- **`NODE_OPTIONS` is scoped to the step, never the job.** Every Node process reads it,
  including `npm ci`, where dd-trace does not exist yet.
- **It is set only when `DD_API_KEY` is present**, so a fork PR runs the suite with no
  tracer at all rather than failing over telemetry. The corollary is that a *missing*
  secret looks exactly like a fork PR: green, quiet, and sending nothing. Check the
  step's `NODE_OPTIONS:` line in the run log — empty means no tracer loaded.
- **`DD_ENV` is `ci`.** Every monitor in `datadog/` queries `env:prod`; test runs
  landing there would mix CI data into production signals.

`dd-trace` is pinned exactly (not `^`) in `package.json`, because its vitest support is
declared as version ranges inside the tracer — a silent minor bump is a silent loss of
test data. It requires **Node ≥ 22**, which is why `ci.yml` pins 22 rather than 20.

**The release version is the commit SHA, resolved in one place.** `resolveVersion()`
(`scripts/lib/dd-version.mjs`) is wired through `next.config.ts`'s `env` key, which
inlines into both the client bundle and the bundled server code, so RUM's `version`, the
server's `service.version`, and the source-map upload's `--release-version` cannot drift.

Two things about it are worth knowing before they confuse someone:

- `VERCEL_GIT_COMMIT_SHA` **outranks an explicitly set `DD_VERSION`**, which is the
  opposite of the usual convention. Editing `DD_VERSION` in the Vercel dashboard will
  appear to do nothing. That is deliberate: the dashboard value was a stale `1.0.0` that
  made every deploy since RUM launched report as the same release.
- Values under `next.config.ts`'s `env` are inlined **at build time**, so the running
  server reports the SHA of the build, not of anything it reads at runtime. That is the
  correct behaviour here, and also why a runtime env change cannot move it.

**Source maps carry git metadata explicitly, because Vercel has no git.** Vercel builds
from a tarball: no `.git`, no remote, so datadog-ci printed `No git remotes available`
on every deploy and uploaded maps with no repository attached — stacks de-minified, but
no frame linked anywhere. `gitEnv()` (`scripts/lib/sourcemaps.mjs`) derives
`DD_GIT_REPOSITORY_URL` and `DD_GIT_COMMIT_SHA` from Vercel's `VERCEL_GIT_*` variables.
datadog-ci skips invoking git entirely when **both** are present — one alone still
shells out and still fails, which is why the function returns both keys or neither.

This depends on **"Enable access to System Environment Variables"** being on in the
Vercel project. Without it there are no `VERCEL_GIT_*` variables, `gitEnv()` returns
`{}`, and the upload quietly goes back to unlinked maps.

Two consequences to keep in view:

- In bypass mode datadog-ci reads source paths from each map's own `sources` field
  rather than from git's tracked-file list, so a path untracked locally can still be
  named. That is application source, not practice content — RULE-L7 is untouched — but
  it is worth stating rather than discovering.
- `--project-path` is stripped from source paths so they match repository paths. If
  frames de-minify but don't link to GitHub, that flag is the thing to adjust, not the
  git metadata.
