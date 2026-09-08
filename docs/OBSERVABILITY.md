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

- **`src/lib/telemetry/scrub.ts`** — `scrubViewUrl` parameterizes every dynamic route
  segment (`/poses/downward-dog` → `/poses/[slug]`) before a view URL reaches RUM;
  `scrubErrorMessage` strips quoted substrings and path-shaped content out of error
  text. Wired into RUM's `beforeSend` in `src/instrumentation-client.ts`. 100% branch
  coverage (`vitest.config.ts`).
- **`src/lib/utils/logger.ts`** — `assertSafeFields` throws if a structured-log call
  passes a banned field name (`note`, `journal`, `mood`, `token`, `secret`, …). A
  logger call must never be the reason a request fails, but passing banned content
  through the logger is exactly the failure this guard exists to catch before it ships.
- **`scripts/lib/telemetry-check.mjs`** (via `npm run lint:telemetry`, CI-blocking) —
  statically scans every `logger.*`/`datadogRum.*` call site under `src/` and every
  manifest under `datadog/` for a banned field name, and fails the build if it finds
  one. This is the automated test RULE-L7 never had before this feature — a check that
  asserts a constitutional guarantee and is itself untested is a claim, not a gate.

None of the three above can see inside a value, only a field *name* — a call site could
still smuggle content through a permitted field (e.g. `errorCode: <actual pose name>`).
There is no code-level defense against that; it depends on reviewers applying the
question above at PR time.

## 2. Attribute-naming conventions

| Prefix | Meaning | Example |
|---|---|---|
| `usr.*` | RUM user-identity attributes (Datadog's own convention) | not currently set — YogaKit does not identify RUM users by ID |
| `session.*` | RUM session-scoped attributes (Datadog's own convention) | set automatically by `@datadog/browser-rum` |
| `dd.*` | Datadog correlation IDs, always Datadog-internal identifiers, never content | `dd.trace_id`, `dd.span_id` (from `src/lib/utils/logger.ts`'s `traceContext()`); also present on RUM view/resource events for same-origin requests, since `src/instrumentation-client.ts`'s `allowedTracingUrls` propagates W3C trace context (`propagatorTypes: ['tracecontext']`) into the `@vercel/otel` backend spans — a RUM session and the server span it triggered now share one `dd.trace_id` |
| `error.*` | Top-level (not nested) error shape on a log line, so Datadog Error Tracking groups it | `error.kind`, `error.message`, `error.stack` (from `logger.error(msg, fields, err)`) |
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
| `NEXT_PUBLIC_DD_VERSION` | Version tag on RUM events | No | `1.0.0` |
| `DD_SERVICE` | Service name for `@vercel/otel` tracing + logger correlation | No | `yogakit`; run through `normalizeServiceName()` (`src/lib/dd-service-name.ts`) since a hyphen silently breaks `service:` queries |
| `DD_ENV` | Env tag for server-side tracing | No | `prod` |
| `DD_VERSION` | Version tag for server-side tracing | No | `1.0.0` |
| `DD_API_KEY` | Datadog API key | Only for `scripts/datadog/sync.mjs` and the content-free check's live-handle validation | Never bundled into the app — read only by Node scripts, never sent to the browser |
| `DD_APP_KEY` | Datadog application key | Same as `DD_API_KEY` | Same |
| `DD_SITE` | Datadog site for server-side/script API calls | Same as `DD_API_KEY` | `us5.datadoghq.com` |

Key-auth only. The sync tool and any headless routine (`/autoobs`) use
`DD_API_KEY`/`DD_APP_KEY`/`DD_SITE` exclusively — never an interactive `pup auth login`
session, which is a separate, expiring OAuth credential unrelated to these three vars
(verified live: `specs/008-observability-as-code/tasks.md` T031).

## 4. Routine → signal → query map

Every query below is scoped `env:prod` (not `env:production`) and, for RUM, additionally
scoped `@application.id:<rum-app-id>` — an unscoped `service:yogakit` RUM query can read
healthy while the scoped one is actually dark, or vice versa; see `.claude/commands/
autoobs.md` "Configuration" for the cross-check.

| Routine | Signal | Query shape | Time window |
|---|---|---|---|
| `/autoobs` step 1 | Monitor status | `pup monitors list` / `GET /api/v1/monitor?tags=service:yogakit`, cross-checked against `datadog/monitors/*.json` | current state (no window) |
| `/autoobs` step 2 | SLO status + error budget | `pup slos list` / `GET /api/v1/slo?tags_query=service:yogakit`, history via `GET /api/v1/slo/<id>/history` | 30d (the SLOs' own configured timeframe) |
| `/autoobs` step 3 | RUM error rate, LCP p75, INP p75 | `POST /api/v2/rum/analytics/aggregate`, `filter.query: "@application.id:<rum-app-id>"` | last 24h |
| `/autoobs` step 4 | Server error rate, API latency p95 | Datadog metrics query, `service:yogakit env:prod` | last 24h |
| `/autoobs` step 5 | Synthetic uptime | `GET /api/v1/synthetics/tests` filtered `service:yogakit`, then `GET /api/v1/synthetics/tests/<id>/results` | last 24h |
| `/autoobs` step 6 | Dashboard reachability | `GET /api/v1/dashboard/<id>` for `[YogaKit] Health` | current state (no window) |
| `npm run datadog:diff` | Manifest drift (any type) | Full read-compare over all 6 resource types | current state (no window) |

Thresholds for each monitor (what counts as AT-RISK vs. BREACHED): `datadog/README.md`
"Manifest notes" table.

**Pre-launch caveat on Core Web Vitals:** `datadog/synthetics/browser/
read-view-rum-session.json` loads the read view every hour purely to keep a real RUM
session arriving before there is any organic traffic — otherwise the RUM-dependent
monitors and SLOs above would read `No Data` indefinitely. Its LCP/INP will read
**optimistically**: a datacenter browser on a stable `aws:us-east-1` connection does not
represent a real mobile visitor, and the read view's own Lighthouse mobile score is 87
(below the RULE-L6 ≥ 90 floor — `specs/008-observability-as-code/tasks.md` T048). A green
`[YogaKit] Largest Contentful Paint p75 > 2.5s` monitor while this synthetic is the
dominant traffic source is proof the RUM pipeline works, **not** proof of real-user
performance. Re-evaluate this monitor's read once organic traffic outweighs the
synthetic's hourly tick.

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

## 5. Manual setup checklist (lives outside this repo)

These are one-time, click-through steps in Vercel/Datadog that the sync tool and the
codebase cannot apply for you — check them if a signal above reads unexpectedly dark:

- [ ] **Vercel → Datadog log drain** configured for the YogaKit project, so server logs
      (including `logger.ts`'s structured JSON lines) reach Datadog Log Management.
- [ ] **Vercel project env vars** — every `NEXT_PUBLIC_DD_*` and `DD_*` var in §3 set for
      the Production environment (and Preview, if preview-environment telemetry is
      wanted). `NEXT_PUBLIC_*` vars are inlined at build time — setting them after a
      build has already run does nothing until the next build.
- [ ] **Datadog ↔ Vercel integration** enabled in Datadog's Integrations catalog, so
      deployment events and Vercel-sourced infrastructure metrics correlate with
      `service:yogakit`.
- [ ] **Datadog ↔ GitHub integration** enabled, so a future CI JUnit upload
      (`.github/workflows/ci.yml`'s "Upload test results to Datadog" step) and any
      commit-correlation features work.
- [ ] **Synthetics global variables** — if any synthetic test needs a shared
      credential (none currently do; all three live API tests hit public routes), set
      it once in Datadog Synthetics → Settings → Global Variables rather than
      hardcoding it into a manifest.
- [ ] **RUM application exists in us5** with the ID/token in `.env.example` — already
      done for this branch (application ID `91af99b0-865b-405f-914e-bda170dc43b7`);
      re-check this box only if the application is ever recreated.

## 6. Source-map upload

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
failures are warnings; the script exits 0. Same call `ci.yml` already makes for the JUnit
upload with `continue-on-error: true`.

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

**`--release-version` must equal `NEXT_PUBLIC_DD_VERSION` exactly** — this is also what
RUM itself reports as its `version` attribute. A mismatch here is a silent failure: the
upload succeeds and error stacks still don't resolve, because Datadog looks up maps by
service+version+path, not by upload time. If `DD_VERSION` (server-side tag) and
`NEXT_PUBLIC_DD_VERSION` (browser-side tag, and the one this step uses) ever drift apart,
this is where it would show up.
