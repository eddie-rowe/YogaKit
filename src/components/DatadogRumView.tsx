'use client'

/**
 * Commit-phase replacement for `@datadog/browser-rum-nextjs`'s `DatadogAppRouter`.
 *
 * `DatadogAppRouter` starts a view *during render*, guarded only by a per-instance
 * `useRef`:
 *
 *   if (previousPathname.current !== pathname) {
 *     previousPathname.current = pathname
 *     startNextjsView(computeViewNameFromParams(pathname, params))
 *   }
 *
 * A `useRef` is only stable across *committed* renders. A discarded concurrent render
 * attempt, or a remount of the root layout during hydration recovery, gets a fresh ref
 * and fires `startView` again for the same pathname. Since `nextjsPlugin()` sets
 * `trackViewsManually = true`, `startView` is the *only* thing that creates a view, so N
 * render attempts means N views. Verified live 2026-09-08: a single navigation to
 * `/poses` produced ~90 `route_change` views in a 35ms window, all for the same URL, each
 * lasting 0-1ms — see `DECISIONS.md` for the full writeup. This is not a "correct the
 * import" situation; deliberately diverging from the documented mount is the fix.
 *
 * This component moves the same call to `useEffect`, which only ever runs after a render
 * commits, and replaces the per-instance ref with **module-scoped** state so a remount of
 * this component (e.g. hydration recovery re-rendering the whole root layout) can't
 * restart a view that already started.
 */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { datadogRum } from '@datadog/browser-rum'
import { scrubViewUrl } from '@/lib/telemetry/scrub'

let lastPathname: string | null = null

// Set by `onRouterTransitionStart` (src/instrumentation-client.ts) before Next commits
// the new pathname — React renders before `pushState` updates `window.location`, so this
// is the only way to know the real destination URL at the moment the view starts.
let pendingNavigationUrl: string | undefined

export function recordNavigationUrl(url: string) {
  pendingNavigationUrl = url
}

// Test-only: module state persists across test cases within one process otherwise.
export function resetDatadogRumView() {
  lastPathname = null
  pendingNavigationUrl = undefined
}

export function DatadogRumView() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === lastPathname) return
    lastPathname = pathname

    const url = pendingNavigationUrl
    pendingNavigationUrl = undefined

    // RULE-L7: the view name is scrubbed the same way a view URL is (see
    // beforeSend in instrumentation-client.ts) — a path scrubViewUrl doesn't
    // recognize would otherwise reach Datadog as a raw, potentially
    // content-bearing pathname.
    datadogRum.startView({ name: scrubViewUrl(pathname), url })
  }, [pathname])

  return null
}
