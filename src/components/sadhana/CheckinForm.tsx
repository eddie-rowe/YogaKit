'use client'

// The check-in form (005 T021/T022, FR-001..004). Mood is a small set of discrete choices,
// never a slider. Note and flow link are optional and set lower. The privacy line sits
// beside the fields and is always rendered. The local day is resolved when the form is
// submitted, not when it opened. Content stays author-only through RLS, not here; this
// component only hands its values to the caller. "Log for yesterday" is a single toggle
// offered only while `canLogYesterday` holds (FR-006); there is no date entry (FR-007).

import { useState } from 'react'
import { canLogYesterday, resolveCheckinDay } from '@/lib/sadhana/checkin-day'
import type { Checkin } from '@/lib/sadhana/streak'

export interface CheckinSubmission {
  localDate: string
  mood: number
  durationMinutes: number | null
  note: string
  flowLink: string
}

interface CheckinFormProps {
  durationPrefill?: number
  timeZone?: string
  existing?: readonly Checkin[]
  onSubmit: (checkin: CheckinSubmission) => void
}

const MOODS = [
  { value: 1, icon: '🌧️', label: 'Heavy' },
  { value: 2, icon: '🌥️', label: 'Quiet' },
  { value: 3, icon: '🌤️', label: 'Steady' },
  { value: 4, icon: '☀️', label: 'Bright' },
]

export default function CheckinForm({ durationPrefill, timeZone, existing = [], onSubmit }: CheckinFormProps) {
  const [mood, setMood] = useState<number | null>(null)
  const [duration, setDuration] = useState(durationPrefill === undefined ? '' : String(durationPrefill))
  const [note, setNote] = useState('')
  const [flowLink, setFlowLink] = useState('')
  const [forYesterday, setForYesterday] = useState(false)
  const offerYesterday = canLogYesterday(new Date(), existing, timeZone)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (mood === null) return
    const minutes = Number.parseInt(duration, 10)
    onSubmit({
      localDate: resolveCheckinDay(new Date(), existing, forYesterday ? 'yesterday' : 'today', timeZone).localDate,
      mood,
      durationMinutes: Number.isNaN(minutes) ? null : minutes,
      note,
      flowLink,
    })
  }

  return (
    <form data-testid="sadhana-checkin-form" onSubmit={submit} className="space-y-4 text-sm">
      <div role="radiogroup" aria-label="How do you feel?" className="flex gap-2">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={mood === m.value}
            aria-label={m.label}
            data-testid={`sadhana-checkin-mood-${m.value}`}
            onClick={() => setMood(m.value)}
            className="rounded-lg px-3 py-2 text-xl"
            style={{ background: mood === m.value ? 'var(--surface)' : 'transparent', outline: mood === m.value ? '2px solid var(--foreground)' : 'none' }}
          >
            {m.icon}
          </button>
        ))}
      </div>

      {offerYesterday && (
        <button
          type="button"
          data-testid="sadhana-checkin-yesterday"
          aria-pressed={forYesterday}
          onClick={() => setForYesterday((v) => !v)}
          className="rounded-lg px-3 py-1 text-xs"
          style={{ background: forYesterday ? 'var(--surface)' : 'transparent', outline: forYesterday ? '2px solid var(--foreground)' : '1px solid var(--muted)' }}
        >
          Log for yesterday
        </button>
      )}

      <label className="block">
        Minutes
        <input
          data-testid="sadhana-checkin-duration"
          type="number"
          min={0}
          inputMode="numeric"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="ml-2 w-20 rounded border px-2 py-1"
        />
      </label>

      <label className="block text-xs" style={{ color: 'var(--muted)' }}>
        Note (optional)
        <textarea
          data-testid="sadhana-checkin-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 block w-full rounded border px-2 py-1"
        />
      </label>
      <label className="block text-xs" style={{ color: 'var(--muted)' }}>
        Flow link (optional)
        <input
          data-testid="sadhana-checkin-flow"
          type="text"
          value={flowLink}
          onChange={(e) => setFlowLink(e.target.value)}
          className="mt-1 block w-full rounded border px-2 py-1"
        />
      </label>

      <p data-testid="sadhana-checkin-privacy" className="text-xs" style={{ color: 'var(--muted)' }}>
        Only you can see this.
      </p>

      <button type="submit" data-testid="sadhana-checkin-submit" disabled={mood === null} className="rounded-lg px-4 py-2 font-medium" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
        Save check-in
      </button>
    </form>
  )
}
