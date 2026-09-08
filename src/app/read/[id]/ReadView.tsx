'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Pose } from '@/lib/pose-types'
import type { Flow } from '@/lib/flow/types'
import { isStillnessNode } from '@/lib/flow/types'
import { resolveItemName } from '@/lib/pose-library/display-name'
import { approxDuration, formatApproxDuration, totalSeconds } from '@/lib/flow/duration'

interface Props {
  flow: Flow
  poses: Pose[]
}

// A teacher glances at this mid-pose (spec §10.6, "the 6am test") — large type,
// minimal chrome, one breath mark per item so it reads at arm's length.
//
// Split into a count and a unit rather than one string: the number is what she is
// looking for, so it carries the size and the full-contrast colour, and the word
// beside it can be quieter without being unreadable. Both still render inside the
// single `read-breath-mark` element (guardrails §1.3).
function breathMark(measure: { breaths?: number; seconds?: number }): {
  count: string
  unit: string
} {
  if (measure.breaths != null) {
    return { count: `${measure.breaths}`, unit: measure.breaths === 1 ? 'breath' : 'breaths' }
  }
  if (measure.seconds != null) {
    // `~` stays on time-based measures and off breath counts: five breaths is five
    // breaths, but "1.5 min" is a rounding of a hold nobody is timing to the second.
    const { count, unit } = approxDuration(measure.seconds)
    return { count: `~${count}`, unit }
  }
  return { count: '', unit: '' }
}

// Keeps the screen awake while a teacher is reading from the mat — this is the one
// screen meant to stay open and unattended (Phase 0). No-ops gracefully where the
// Wake Lock API isn't supported.
function useWakeLock() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    async function acquire() {
      try {
        sentinel = await navigator.wakeLock.request('screen')
      } catch {
        // Not fatal — e.g. backgrounded tab or unsupported context. Silent no-op.
      }
    }
    acquire()

    function onVisibilityChange() {
      if (!cancelled && document.visibilityState === 'visible' && !sentinel) acquire()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      sentinel?.release().catch(() => {})
    }
  }, [])
}

export default function ReadView({ flow, poses }: Props) {
  useWakeLock()
  const poseBySlug = new Map(poses.map(p => [p.slug, p]))
  const items = [...flow.items].sort((a, b) => a.order - b.order)

  // FR-002/SC-002: exactly one item is marked at all times, so there is no unmarked
  // state to start from — the flow opens on its first item and a tap moves the mark.
  // Seeded in useState from props, not in an effect: the server and the first client
  // render have to agree or the offline reload logs a hydration error, and that is
  // asserted (tests/e2e-qa/offline-read.spec.ts). Deliberately not persisted for the
  // same reason.
  const [currentId, setCurrentId] = useState<string | null>(() => items[0]?.id ?? null)
  // A flow whose current item was deleted elsewhere, or that arrives empty, still has
  // to show a mark. Falling back to the first item keeps "exactly one" literally true.
  const markedId = items.some(item => item.id === currentId) ? currentId : (items[0]?.id ?? null)

  // Group by phaseId across the whole flow, not just adjacency — a phase whose
  // items aren't contiguous in Compose used to render as two separate sections
  // (Phase 3). Each phase renders once, at the position of its first item.
  const grouped: Array<{ phaseId: string | null; name: string | null; items: typeof items }> = []
  const seenPhaseIds = new Set<string>()
  for (const item of items) {
    if (item.phaseId && seenPhaseIds.has(item.phaseId)) continue
    if (item.phaseId) {
      seenPhaseIds.add(item.phaseId)
      const phase = flow.phases.find(p => p.id === item.phaseId)
      grouped.push({
        phaseId: item.phaseId,
        name: phase?.name ?? null,
        items: items.filter(i => i.phaseId === item.phaseId),
      })
    } else {
      const last = grouped[grouped.length - 1]
      if (last && last.phaseId === null) last.items.push(item)
      else grouped.push({ phaseId: null, name: null, items: [item] })
    }
  }

  return (
    <div className="kk-page print-page">
      <div
        className="max-w-2xl mx-auto px-5 space-y-8"
        style={{
          paddingTop: 'calc(2rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
          paddingLeft: 'calc(1.25rem + env(safe-area-inset-left))',
          paddingRight: 'calc(1.25rem + env(safe-area-inset-right))',
        }}
      >
        {/* AppHeader/MobileNavSpacer are suppressed on /read/ — this is the only way
            out short of browser-back (Phase 3), plus a print action for the 6am
            paper-copy case. */}
        <div className="no-print flex items-center justify-between text-sm" style={{ color: 'var(--muted-strong)' }}>
          <Link href="/flows" data-testid="read-exit" className="hover:opacity-70 transition-opacity">
            ← Flows
          </Link>
          <button
            data-testid="read-print"
            onClick={() => window.print()}
            className="hover:opacity-70 transition-opacity"
          >
            Print
          </button>
        </div>

        <header className="mb-2">
          <h1 className="font-serif text-3xl font-semibold">{flow.title}</h1>
        </header>

        {grouped.map((group, gi) => (
          <section key={gi} data-testid={group.phaseId ? `read-phase-${group.phaseId}` : undefined}>
            {/* FR-049: how long this block runs, next to what it is called. Every
                group carries it, named or not — a flow with no phases would otherwise
                show a total for none of itself. The stem is `read-phasetotal-`, not
                `read-phase-duration-`, so it isn't matched by the `read-phase-` prefix
                selector the offline test counts sections with (guardrails §1.3). */}
            <div className={`flex items-baseline gap-3 mb-3 ${group.name ? 'justify-between' : 'justify-end'}`}>
              {group.name && (
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-strong)' }}>
                  {group.name}
                </h2>
              )}
              <span
                data-testid={`read-phasetotal-${group.phaseId ?? `unphased-${gi}`}`}
                className="text-xs whitespace-nowrap"
                style={{ color: 'var(--muted-strong)' }}
              >
                {formatApproxDuration(totalSeconds(group.items))}
              </span>
            </div>
            <div className="space-y-4">
              {group.items.map(item => {
                const globalIndex = items.indexOf(item)
                const pose = poseBySlug.get(item.poseSlug)
                const stillness = isStillnessNode(item.poseSlug)
                const isCurrent = item.id === markedId
                const mark = breathMark(item.measure)
                return (
                  <div
                    key={item.id}
                    data-testid={`read-item-${globalIndex}`}
                    data-current={isCurrent ? 'true' : undefined}
                    // A row, not a <button>: it contains <p> elements, and <p> inside
                    // <button> is invalid HTML that React reports as a hydration error
                    // — which offline-read.spec.ts fails on.
                    role="button"
                    tabIndex={0}
                    aria-current={isCurrent ? 'true' : undefined}
                    onClick={() => setCurrentId(item.id)}
                    onKeyDown={event => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      setCurrentId(item.id)
                    }}
                    className={`pose-row pb-2 border-b ${stillness ? 'kk-stillness' : ''}`}
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      {/* First span in the row, and it stays first: walk4-read.spec.ts
                          measures `.pose-row span` first for the arm's-length size. */}
                      <span className={`kk-nocallout read-pose-name ${stillness ? '' : 'font-medium'}`}>
                        {resolveItemName(pose, item.poseSlug)}
                      </span>
                      <span data-testid="read-breath-mark" className="whitespace-nowrap">
                        <span
                          className="text-xl font-medium"
                          style={{ color: stillness ? 'var(--muted-strong)' : 'var(--foreground)' }}
                        >
                          {mark.count}
                        </span>
                        {mark.unit && (
                          <span className="text-sm ml-1" style={{ color: 'var(--muted-strong)' }}>
                            {mark.unit}
                          </span>
                        )}
                      </span>
                    </div>
                    {/* FR-031: the library does not have this slug, and the flow still
                        opens. Said once, quietly, next to the item it applies to. */}
                    {!pose && (
                      <p
                        data-testid={`read-unknown-pose-${globalIndex}`}
                        className="text-sm mt-1"
                        style={{ color: 'var(--muted-strong)' }}
                      >
                        This pose isn't in your library.
                      </p>
                    )}
                    {item.note && (
                      <p
                        data-testid={`read-note-${globalIndex}`}
                        className="text-sm mt-1"
                        style={{ color: 'var(--muted-strong)' }}
                      >
                        {item.note}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
