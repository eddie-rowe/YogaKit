'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAllEntries, revive, subscribeOutbox, type OutboxEntry } from '@/lib/storage/outbox'
import { flushOutbox, startSync } from '@/lib/storage/sync'

// The entire sync-state UI (FR-014, UX-009): a word in the header while work is
// outstanding, and a line of text with a retry when something has stopped trying.
//
// What is deliberately absent is most of it. No per-flow badge in any list, no spinner,
// no progress, and — the part that matters — nothing at all when the queue is settled,
// which is almost always. A teacher whose work is safe should see no evidence that
// safety is a thing the software has to do; a status light that is on all day teaches
// people to stop reading it. Scenarios 6 and 7 are both "nothing appears".
//
// No hue either. Guardrails §2 allows exactly one accent in the UI, and chrome does not
// get to spend it (plan: "a sync-state label is chrome, so no hue").

interface Counts {
  queued: number
  dead: number
}

function count(entries: OutboxEntry[]): Counts {
  return {
    queued: entries.filter(entry => entry.state === 'queued').length,
    dead: entries.filter(entry => entry.state === 'dead').length,
  }
}

export default function SyncLabel() {
  const [counts, setCounts] = useState<Counts>({ queued: 0, dead: 0 })
  const [retrying, setRetrying] = useState(false)

  const refresh = useCallback(() => {
    getAllEntries()
      .then(entries => setCounts(count(entries)))
      // IndexedDB unavailable (private mode, blocked storage). The label is not worth
      // an error surface of its own; the composer already reports a failed local write.
      .catch(() => setCounts({ queued: 0, dead: 0 }))
  }, [])

  useEffect(() => {
    refresh()
    const unsubscribe = subscribeOutbox(refresh)
    const stop = startSync(refresh)
    return () => {
      unsubscribe()
      stop()
    }
  }, [refresh])

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    try {
      const entries = await getAllEntries()
      await Promise.all(
        entries.filter(entry => entry.state === 'dead').map(entry => revive(entry.flowId)),
      )
      await flushOutbox()
    } finally {
      setRetrying(false)
      refresh()
    }
  }, [refresh])

  if (counts.queued === 0 && counts.dead === 0) return null

  return (
    <>
      {counts.queued > 0 && (
        <span
          data-testid="sync-label"
          className="hidden sm:inline text-xs px-2 tabular-nums"
          style={{ color: 'var(--muted)' }}
        >
          Saving to your account
        </span>
      )}

      {counts.dead > 0 && (
        // Above the mobile tab bar, below the header on wider screens. Either way it
        // sits beside the chrome rather than over the work: FR-015 is explicit that
        // this must not block anything.
        <div
          data-testid="sync-failure-notice"
          role="status"
          className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] sm:bottom-auto sm:top-14 z-10 px-4 py-2 border-t sm:border-t-0 sm:border-b text-xs flex items-center justify-between gap-3"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}
        >
          {/* No urgency, no count-up, no instruction to act. The one fact a teacher
              needs is that the work is not lost, and the retry is there when they
              want it (RULE-C2; every string here goes through `npm run lint:copy`). */}
          <span>
            {counts.dead === 1
              ? 'A flow is still on this device only.'
              : `${counts.dead} flows are still on this device only.`}
          </span>
          <button
            data-testid="sync-retry"
            onClick={handleRetry}
            disabled={retrying}
            className="underline underline-offset-2 shrink-0 disabled:opacity-50"
            style={{ color: 'var(--foreground)' }}
          >
            {retrying ? 'Trying' : 'Try again'}
          </button>
        </div>
      )}
    </>
  )
}
