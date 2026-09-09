# Mobile observability — Datadog product survey (decision record, not built)

**Status:** reference only. No mobile client exists in this repo. Nothing here is
adopted; it is written down so the choice isn't re-researched from scratch when a mobile
app actually starts, and so the masking mistake from the web RUM rollout
(`DECISIONS.md`, 2026-09-08) isn't repeated.

## Context

Investigating the 2026-09-09 SLO/monitor outage (`DECISIONS.md`) prompted a survey of
what else Datadog offers, specifically toward "when this becomes a mobile app, we want as
much observability data as possible to make decisions and troubleshoot." This records
that survey's conclusions against YogaKit's actual stack (Next.js on Vercel, Supabase
Postgres, RUM already live on web) rather than Datadog's product catalog in the abstract.

## Direct mobile analogs of what's already live on web

| Product | What it gives you | Constitution note |
|---|---|---|
| **Mobile RUM** (`@datadog/mobile-react-native` or native iOS/Android SDKs) | Sessions, views, crashes, ANRs (Android) / App Hangs (iOS), network requests, user actions — the mobile counterpart to `src/instrumentation-client.ts` | Needs the same content-free scrub this repo already enforces for web (RULE-L7). The mobile SDK's per-field override is `textAndInputPrivacyLevel` (SDK-wide) plus a per-view `RUMPrivacy` override — same shape as `data-dd-privacy`, different API. |
| **Mobile Session Replay** | Visual reconstruction, iOS-only today (Android is limited/beta) | Same masking obligation as Mobile RUM's row above. |
| **Distributed tracing continuity** | Mobile RUM → Vercel Node traces joined into one trace, via `firstPartyHosts` (mobile SDK's analog to `allowedTracingUrls` in `src/instrumentation-client.ts`) | None beyond the existing `tracecontext` propagator requirement already handled server-side. |
| **Mobile Logs SDK** | Structured client logs (network failures, custom app events) alongside RUM | Same content-free rule as everywhere else — no flow/pose/journal payload in a log message, ever. |

**The one thing to get right structurally, learned the hard way on web:** bake masking
into the *first* PR that adds Mobile RUM, not a follow-up. Web RUM shipped content-blind
in 008, then needed a second PR (2026-09-08) to retrofit `data-dd-privacy` on three
composer inputs after the fact. A mobile client should ship its per-view privacy
overrides in the same commit that adds RUM to a screen with free-text input — not as a
"comes back to it later" item.

## Worth adopting now, independent of mobile

- **Datadog CI Visibility / Test Optimization.** `npm run test:e2e` (Playwright) and the
  Vitest 100%-coverage-gated suite already run in CI; CI Visibility adds flaky-test
  detection and historical pass-rate trends with no app-code change. (Note: PR #24 already
  added `chore(ci): configure Datadog Test Optimization metadata` — check whether this is
  already partially wired before treating it as untouched.)
- **Database Monitoring (DBM) for Postgres.** Supabase is managed Postgres and `postgres`
  is already an installed Datadog integration in this org; DBM adds query-level
  latency/lock/vacuum insight that neither RUM nor APM traces surface. Useful now, and
  more useful once a mobile client multiplies query volume.
- **Incident Management.** Ties the monitors/SLOs fixed in the 2026-09-09 repair into a
  declared-incident timeline instead of ad-hoc `/autoobs` digests. No new instrumentation
  required.

## Parked, with the specific reason each is low-signal here

- **Application Security Management (ASM)** — overlaps with Supabase RLS, which is
  already the constitution's enforced boundary ("enforced at the table/RLS layer, never
  application code"). Low marginal value on top of that.
- **Mobile App Testing** (synthetic device-farm testing of a real app binary) — real value
  once a binary exists to test, but paid-tier and higher-effort; adopt after Mobile RUM
  proves out, not on day one.
- **Universal Service Monitoring / Cloud Cost Management** — built for persistent
  hosts/Kubernetes spend. Vercel's serverless model and Supabase's managed-service model
  make these low-signal for this stack specifically.

## Why this stays a decision record, not a plan

A prior decision (`ops-practices-deferred-until-launch` memory) defers production-grade
ops investment until the ~Nov 2026 launch. Adopting any of the "worth adopting now" items
above is new ops surface and should go through that same gate — this document exists so
the research isn't lost, not to pre-approve the work.
