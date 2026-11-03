// Non-punitive cohort status pill (005 T053, FR-054, FR-058, Principle VII).
// Presentational and unmounted. Neutral tokens only: no warning colour, and no key for a student
// who stopped sharing (such students are omitted from the roster, never labelled). Vocabulary is
// provisional until contracts/guidance-tone.md (T007) is signed off; STATUS_LABELS is the one
// place to swap it.

export const STATUS_KEYS = ['practicing', 'returning', 'new'] as const
export type StatusKey = (typeof STATUS_KEYS)[number]

export const STATUS_LABELS: Record<StatusKey, string> = {
  practicing: 'Practicing',
  returning: 'Coming back',
  new: 'Just started',
}

interface StatusPillProps {
  status: StatusKey
}

export default function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      data-testid="sadhana-status-pill"
      className="inline-block rounded-full px-3 py-1 text-xs"
      style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--muted)' }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
