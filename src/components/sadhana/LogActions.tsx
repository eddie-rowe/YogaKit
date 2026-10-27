'use client'

// The paired one-tap actions (005 T030, FR-013, UX-005). Both buttons share one class and
// style constant so neither can be smaller or quieter than the other, and neither asks
// for confirmation. Persistence is the caller's, through the callbacks.

interface LogActionsProps {
  onLogPractice: () => void
  onLogRest: () => void
}

const ACTION_CLASS = 'flex-1 rounded-lg px-4 py-3 text-base font-medium'
const ACTION_STYLE = { background: 'var(--surface)', color: 'var(--foreground)' }

export default function LogActions({ onLogPractice, onLogRest }: LogActionsProps) {
  return (
    <div className="flex gap-3">
      <button type="button" data-testid="sadhana-log-practice" className={ACTION_CLASS} style={ACTION_STYLE} onClick={onLogPractice}>
        Log practice
      </button>
      <button type="button" data-testid="sadhana-log-rest" className={ACTION_CLASS} style={ACTION_STYLE} onClick={onLogRest}>
        Log rest
      </button>
    </div>
  )
}
