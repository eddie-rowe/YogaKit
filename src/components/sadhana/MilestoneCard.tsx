'use client'

// One milestone card (005 T033, FR-021/022/023). The caller picks which milestone to show
// with `nextMilestone`, which returns one at a time and keeps the rest queued, so two on one
// day arrive as two cards in turn. The card looks forward and asks nothing of the reader.
// Dismissal is a callback only; remembering it is the caller's job.

import type { Milestone } from '@/lib/sadhana/milestones'

interface MilestoneCardProps {
  milestone: Milestone
  onDismiss: (milestone: Milestone) => void
}

const INVITATION: Record<Milestone, string> = {
  10: 'Ten days of practice so far. What would you like to explore next?',
  30: 'Thirty days of practice. There is a lot of room ahead, so what draws you next?',
  90: 'Ninety days of practice. Here is a good moment to look toward what you want to grow into.',
}

export default function MilestoneCard({ milestone, onDismiss }: MilestoneCardProps) {
  return (
    <section
      data-testid="sadhana-milestone"
      aria-label={`${milestone} days practised`}
      className="rounded-lg p-4 text-sm"
      style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
    >
      <p className="font-medium">{milestone} days practised</p>
      <p data-testid="sadhana-milestone-invitation" className="mt-1" style={{ color: 'var(--muted)' }}>
        {INVITATION[milestone]}
      </p>
      <button
        type="button"
        data-testid="sadhana-milestone-dismiss"
        onClick={() => onDismiss(milestone)}
        className="mt-3 underline"
        style={{ color: 'var(--muted)' }}
      >
        Dismiss
      </button>
    </section>
  )
}
