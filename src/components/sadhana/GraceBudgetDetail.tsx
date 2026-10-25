'use client'

// The grace-budget detail, shown only on request from the streak detail (005 T032,
// FR-018/020). It is never mounted on Today. Collapsed by default; once opened it states
// the plain numbers and nothing that frames use of the allowance as a consequence.

import { useState } from 'react'
import { graceBudgetDetail } from '@/lib/sadhana/grace-budget'
import type { Checkin, GraceBudget } from '@/lib/sadhana/streak'

interface GraceBudgetDetailProps {
  checkins: readonly Checkin[]
  today: string
  budget?: GraceBudget
}

export default function GraceBudgetDetail({ checkins, today, budget }: GraceBudgetDetailProps) {
  const [open, setOpen] = useState(false)
  const detail = graceBudgetDetail(checkins, today, budget)
  return (
    <div>
      <button
        type="button"
        data-testid="sadhana-grace-toggle"
        aria-expanded={open}
        aria-controls="sadhana-grace-detail"
        onClick={() => setOpen((o) => !o)}
        className="text-sm underline"
        style={{ color: 'var(--muted)' }}
      >
        About rest days
      </button>
      {open && (
        <p id="sadhana-grace-detail" data-testid="sadhana-grace-detail" className="text-sm mt-2">
          {detail.used} of {detail.size} quiet days used in the last {detail.periodDays} days. Your count only ever grows.
        </p>
      )}
    </div>
  )
}
