'use client'

import { useEffect } from 'react'
import { addNextjsError } from '@datadog/browser-rum-nextjs'

// Root-layout error boundary — catches an error the layout itself throws, which
// `error.tsx` cannot (it renders inside the layout, so a layout error would bypass
// it). Next.js requires this file to render its own <html>/<body>, since the root
// layout it's replacing is itself the thing that failed.
export default function GlobalError({
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
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
          <h1 className="font-serif text-2xl">Something didn&apos;t load</h1>
          <p className="text-stone-600">Try refreshing the page.</p>
          <button
            data-testid="global-error-boundary-retry"
            type="button"
            onClick={reset}
            className="kk-btn px-4 py-2 font-medium"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
