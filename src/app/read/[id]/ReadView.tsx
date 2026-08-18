'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import type { Pose } from '@/lib/pipeline/types'
import type { Flow } from '@/lib/flow/types'
import { isStillnessNode } from '@/lib/flow/types'
import { resolveDisplayName } from '@/lib/pose-library/display-name'

interface Props {
  flow: Flow
  poses: Pose[]
}

// A teacher glances at this mid-pose (spec §10.6, "the 6am test") — large type,
// minimal chrome, one breath mark per phase of the hold so it reads at arm's length.
function breathMark(measure: { breaths?: number; seconds?: number }): string {
  if (measure.breaths != null) return `${measure.breaths} breath${measure.breaths === 1 ? '' : 's'}`
  if (measure.seconds != null) {
    const minutes = measure.seconds / 60
    if (minutes >= 1) {
      // Round to the nearest half-minute so a 90s hold reads "1.5 min", not a
      // lossy "2 min" (spec §10, FR-017).
      const rounded = Math.round(minutes * 2) / 2
      return `~${rounded} min`
    }
    return `~${measure.seconds}s`
  }
  return ''
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
        <div className="no-print flex items-center justify-between text-sm" style={{ color: 'var(--muted)' }}>
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
            {group.name && (
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
                {group.name}
              </h2>
            )}
            <div className="space-y-4">
              {group.items.map(item => {
                const globalIndex = items.indexOf(item)
                const pose = poseBySlug.get(item.poseSlug)
                const stillness = isStillnessNode(item.poseSlug)
                return (
                  <div
                    key={item.id}
                    data-testid={`read-item-${globalIndex}`}
                    className={`pose-row pb-2 border-b ${stillness ? 'kk-stillness' : ''}`}
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className={`kk-nocallout ${stillness ? 'text-xl' : 'text-2xl font-medium'}`}>
                        {pose ? resolveDisplayName(pose) : item.poseSlug}
                      </span>
                      <span data-testid="read-breath-mark" className="text-lg whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                        {breathMark(item.measure)}
                      </span>
                    </div>
                    {item.note && (
                      <p
                        data-testid={`read-item-note-${globalIndex}`}
                        className="text-sm mt-1"
                        style={{ color: 'var(--muted)' }}
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
