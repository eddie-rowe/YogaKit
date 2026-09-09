/**
 * Client-side RUM instrumentation — 008 US4/US1.
 *
 * Next.js 16's native client instrumentation hook: this file is loaded once, before
 * any page code, in every client bundle. It replaces `src/components/DatadogRum.tsx`,
 * which never actually initialized in production — its env var names
 * (`NEXT_PUBLIC_DATADOG_*`) never matched what `.env.local` defines
 * (`NEXT_PUBLIC_DD_RUM_*`). This file uses the names that are actually set.
 *
 * FR-025/FR-026/SC-011: full sampling, `mask` privacy. If any required var is unset,
 * `init()` is never called — RUM stays a silent no-op, never a thrown error
 * (FR-025/SC-011).
 *
 * 2026-09-08: replay + interaction/resource/long-task tracking turned on (previously
 * off — see DECISIONS.md for the full writeup and why this is a deliberate, tracked
 * departure from the "page views, errors, web vitals only" telemetry floor in the
 * constitution). Because replay is a visual reconstruction of the screen, default
 * `mask` privacy is not enough on its own for the app's few free-text fields — a
 * private flow title, phase name, or per-pose note is exactly the kind of "flow/note
 * content" the constitution says telemetry must never carry. Those three inputs
 * (src/app/compose/ComposeClient.tsx, src/app/compose/ComposeFlowItem.tsx) carry an
 * explicit `data-dd-privacy="mask-user-input"` so they stay masked in both replay and
 * action/input tracking even if a future page changes the default. Any new free-text
 * input added to the composer (or elsewhere) needs the same attribute.
 *
 * `@datadog/browser-rum-nextjs`'s `nextjsPlugin()` is what makes RUM App-Router-aware:
 * plain `@datadog/browser-rum` sees a client-side route change as an unrelated event,
 * not a new view, on the App Router. `onRouterTransitionStart` is re-exported below
 * under the exact name Next.js's client-instrumentation convention looks for — Next
 * calls it itself on every router transition; nothing else in this file invokes it.
 */

import { datadogRum } from '@datadog/browser-rum'
import { nextjsPlugin } from '@datadog/browser-rum-nextjs'

import { recordNavigationUrl } from '@/components/DatadogRumView'
import {
  scrubErrorMessage,
  scrubErrorStack,
  scrubResourceUrl,
  scrubViewUrl,
} from '@/lib/telemetry/scrub'

const applicationId = process.env.NEXT_PUBLIC_DD_RUM_APPLICATION_ID
const clientToken = process.env.NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN
const isObservableHost =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'

if (applicationId && clientToken && isObservableHost && !datadogRum.getInternalContext()) {
  datadogRum.init({
    applicationId,
    clientToken,
    site: process.env.NEXT_PUBLIC_DD_SITE ?? 'datadoghq.com',
    service: process.env.NEXT_PUBLIC_DD_SERVICE ?? 'yogakit',
    env: process.env.NEXT_PUBLIC_DD_ENV ?? 'prod',
    version: process.env.NEXT_PUBLIC_DD_VERSION,
    sessionSampleRate: 100,
    // Replays are useful for genuine sessions but wasteful for the scheduled browser
    // synthetic that runs every 15 minutes. Keep a bounded diagnostic sample.
    sessionReplaySampleRate: 10,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask',
    // Joins RUM sessions to the @vercel/otel backend spans (src/instrumentation.ts) so a
    // trace id shows up on both sides. Scoped to same-origin only — third parties
    // (Supabase, Stripe, Anthropic, Resend) are already excluded by construction here,
    // matching instrumentation.ts's own dontPropagateContextUrls list on the server side.
    // The propagator must be 'tracecontext' (W3C traceparent): @vercel/otel does not
    // speak the SDK's default 'datadog' header format, so headers would otherwise be
    // sent and silently never joined.
    allowedTracingUrls: [
      { match: (url: string) => url.startsWith(window.location.origin), propagatorTypes: ['tracecontext'] },
    ],
    plugins: [nextjsPlugin()],
    // Every event, view, and error passes through the scrubber before it leaves the
    // browser — the one enforcement point for RULE-L7 on the RUM path (FR-020/022).
    beforeSend: (event) => {
      if (event.view?.url) {
        event.view.url = scrubViewUrl(event.view.url)
      }
      // DatadogRumView.tsx already scrubs the name it passes to startView(), but this
      // is the enforcement point for RULE-L7, not a place that trusts a caller got it
      // right — a name that somehow arrives unscrubbed (a future call site, a plugin
      // default) must not reach Datadog raw.
      if (event.view?.name) {
        event.view.name = scrubViewUrl(event.view.name)
      }
      if (event.type === 'error') {
        if (event.error?.message) event.error.message = scrubErrorMessage(event.error.message)
        if (event.error?.stack) event.error.stack = scrubErrorStack(event.error.stack)
      }
      if (event.type === 'resource' && event.resource?.url) {
        event.resource.url = scrubResourceUrl(event.resource.url, window.location.origin)
      }
      return true
    },
  })
}

// FR-020: App Router transitions are RUM "views" only via this hook. Next.js's
// client-instrumentation convention calls a function of this exact name on every
// router transition — nothing in this file invokes it directly. Unlike the SDK's own
// @datadog/browser-rum-nextjs re-export, this feeds DatadogRumView.tsx's commit-phase
// view starter instead of the SDK's render-phase DatadogAppRouter — see that
// component's doc comment.
export function onRouterTransitionStart(url: string) {
  recordNavigationUrl(url)
}
