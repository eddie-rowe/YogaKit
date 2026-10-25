// The streak, as a single calm number (005 T029, FR-015/016/017, Principle VII).
//
// One presentation only, with no alternate states. The count is
// distinct practised days and cannot decrease, so before a first practice there is nothing
// to show and the component renders nothing rather than a zero.

interface StreakDisplayProps {
  streak: number
}

export default function StreakDisplay({ streak }: StreakDisplayProps) {
  if (streak < 1) return null
  return (
    <p data-testid="sadhana-streak" className="text-sm" style={{ color: 'var(--muted)' }}>
      <span data-testid="sadhana-streak-count" className="font-medium" style={{ color: 'var(--foreground)' }}>
        {streak}
      </span>{' '}
      {streak === 1 ? 'day practised' : 'days practised'}
    </p>
  )
}
