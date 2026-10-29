'use client'

// Sharing pill and what-is-shared sheet (005 T046-T048, FR-044..047/052). One pill per enrollment
// that shares signals, so stopping is always per organization, never a global switch. The sheet
// names exactly what a teacher can see (practice signals) and offers one stop action. Content
// (reflections, journal, notes) is never shared and is not listed. Stopping is a callback; the
// revoke call and any policy change are the caller's.

import { useState } from 'react'

export interface SharingEnrollment {
  id: string
  organizationName: string
  shareSignals: boolean
}

interface SharingPillProps {
  enrollments: readonly SharingEnrollment[]
  onStop: (enrollmentId: string) => void
}

export default function SharingPill({ enrollments, onStop }: SharingPillProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const sharing = enrollments.filter((e) => e.shareSignals)
  if (sharing.length === 0) return null
  const open = sharing.find((e) => e.id === openId) ?? null

  return (
    <div data-testid="sadhana-sharing">
      <div className="flex flex-wrap gap-2">
        {sharing.map((e) => (
          <button
            key={e.id}
            type="button"
            data-testid="sadhana-sharing-pill"
            onClick={() => setOpenId(e.id)}
            className="rounded-full px-3 py-1 text-xs"
            style={{ background: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
          >
            Sharing with {e.organizationName}
          </button>
        ))}
      </div>
      {open && (
        <div
          role="dialog"
          aria-label={`Sharing with ${open.organizationName}`}
          data-testid="sadhana-sharing-sheet"
          className="mt-2 rounded-lg p-4 text-sm"
          style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
        >
          <p className="font-medium">What {open.organizationName} can see</p>
          <ul className="mt-1 list-disc pl-5" style={{ color: 'var(--muted)' }}>
            <li>The days you checked in</li>
            <li>Your streak and milestones</li>
          </ul>
          <button
            type="button"
            data-testid="sadhana-sharing-stop"
            onClick={() => {
              onStop(open.id)
              setOpenId(null)
            }}
            className="mt-3 rounded-md px-3 py-2"
            style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--muted)' }}
          >
            Stop sharing with {open.organizationName}
          </button>
          <button
            type="button"
            data-testid="sadhana-sharing-close"
            onClick={() => setOpenId(null)}
            className="ml-3 underline"
            style={{ color: 'var(--muted)' }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
