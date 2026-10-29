'use client'

// Gap-triggered guidance card (005 T062-T064, FR-037..043). Renders one entry chosen by
// `selectGuidance`: its title and a single next action, both read from the guidance corpus.
// This component authors no tone copy beyond a dismiss label. It counts nothing, links nowhere,
// and exposes no browsing of the corpus. `onShown` fires once per mounted entry and `onDismiss`
// on dismissal so the caller can consume the trigger; persistence is the caller's.

import { useEffect, useRef } from 'react'
import type { GuidanceEntry } from '@/lib/sadhana/guidance'

export interface GuidanceCardEntry extends GuidanceEntry {
  title: string
  action: string
}

interface GuidanceCardProps {
  entry: GuidanceCardEntry
  onShown: (entry: GuidanceCardEntry) => void
  onDismiss: (entry: GuidanceCardEntry) => void
}

export default function GuidanceCard({ entry, onShown, onDismiss }: GuidanceCardProps) {
  const shownFor = useRef<string | null>(null)
  useEffect(() => {
    if (shownFor.current === entry.id) return
    shownFor.current = entry.id
    onShown(entry)
  }, [entry, onShown])

  return (
    <section
      data-testid="sadhana-guidance"
      aria-label={entry.title}
      className="rounded-lg p-4 text-sm"
      style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
    >
      <p data-testid="sadhana-guidance-title" className="font-medium">
        {entry.title}
      </p>
      <p data-testid="sadhana-guidance-action" className="mt-1" style={{ color: 'var(--muted)' }}>
        {entry.action}
      </p>
      <button
        type="button"
        data-testid="sadhana-guidance-dismiss"
        onClick={() => onDismiss(entry)}
        className="mt-3 underline"
        style={{ color: 'var(--muted)' }}
      >
        Dismiss
      </button>
    </section>
  )
}
