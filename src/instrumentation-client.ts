/**
 * Client-side RUM instrumentation — 008 US4/US1.
 *
 * Next.js 16's native client instrumentation hook: this file is loaded once, before
 * any page code, in every client bundle. It replaces `src/components/DatadogRum.tsx`,
 * which never actually initialized in production — its env var names
 * (`NEXT_PUBLIC_DATADOG_*`) never matched what `.env.local` defines
 * (`NEXT_PUBLIC_DD_RUM_*`). This file uses the names that are actually set.
 *
 * FR-025/FR-026/SC-011: every posture flag below is a floor carried over unchanged
 * from the component this replaces — full sampling, replay off, interaction/resource/
 * long-task tracking off, `mask` privacy. Full NextMove manifest parity does not mean
 * matching NextMove's RUM posture; NextMove runs replay at 100% and interaction
 * tracking on, and this app deliberately does not follow it there. If any required
 * var is unset, `init()` is never called — RUM stays a silent no-op, never a thrown
 * error (FR-025/SC-011).
 *
 * `@datadog/browser-rum-nextjs`'s `nextjsPlugin()` is what makes RUM App-Router-aware:
 * plain `@datadog/browser-rum` sees a client-side route change as an unrelated event,
 * not a new view, on the App Router. `onRouterTransitionStart` is re-exported below
 * under the exact name Next.js's client-instrumentation convention looks for — Next
 * calls it itself on every router transition; nothing else in this file invokes it.
 */

import { datadogRum } from '@datadog/browser-rum'
import { nextjsPlugin, onRouterTransitionStart } from '@datadog/browser-rum-nextjs'

import { scrubErrorMessage, scrubViewUrl } from '@/lib/telemetry/scrub'

const applicationId = process.env.NEXT_PUBLIC_DD_RUM_APPLICATION_ID
const clientToken = process.env.NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN

if (applicationId && clientToken && !datadogRum.getInternalContext()) {
  datadogRum.init({
    applicationId,
    clientToken,
    site: process.env.NEXT_PUBLIC_DD_SITE ?? 'datadoghq.com',
    service: process.env.NEXT_PUBLIC_DD_SERVICE ?? 'yogakit',
    env: process.env.NEXT_PUBLIC_DD_ENV ?? 'prod',
    version: process.env.NEXT_PUBLIC_DD_VERSION,
    sessionSampleRate: 100,
    sessionReplaySampleRate: 0,
    trackUserInteractions: false,
    trackResources: false,
    trackLongTasks: false,
    defaultPrivacyLevel: 'mask',
    plugins: [nextjsPlugin()],
    // Every event, view, and error passes through the scrubber before it leaves the
    // browser — the one enforcement point for RULE-L7 on the RUM path (FR-020/022).
    beforeSend: (event) => {
      if (event.view?.url) {
        event.view.url = scrubViewUrl(event.view.url)
      }
      if (event.type === 'error' && event.error?.message) {
        event.error.message = scrubErrorMessage(event.error.message)
      }
      return true
    },
  })
}

// FR-020: App Router transitions are RUM "views" only via this hook. Next.js's
// client-instrumentation convention calls a function of this exact name on every
// router transition — nothing in this file invokes it directly.
export { onRouterTransitionStart }
