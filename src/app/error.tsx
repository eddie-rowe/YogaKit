'use client'

import { useEffect } from 'react'
import { addNextjsError } from '@datadog/browser-rum-nextjs'

// Route-segment error boundary. Nothing existed here before 008 — a React render
// error inside a page was invisible to RUM, because RUM never initialized at all
// (see src/instrumentation-client.ts). `addNextjsError` reports through the same RUM
// session the scrubber already guards; there is no separate content-free step here
// because RUM's `beforeSend` already scrubs every error message before it leaves the
// browser, no matter which call site raised it.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    addNextjsError(error)
  }, [error])

  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="font-serif text-2xl">Something didn&apos;t load</h1>
      <p className="text-stone-600">Try refreshing the page.</p>
      <button
        data-testid="error-boundary-retry"
        type="button"
        onClick={reset}
        className="kk-btn px-4 py-2 font-medium"
      >
        Try again
      </button>
    </main>
  )
}
