'use client'

import { formatDuration } from '@/lib/flow/duration'

interface Props {
  onAddStillness: () => void
  onAddPhase: () => void
  totalSeconds: number
}

/** "Add stillness" / "Add phase" actions plus the live total-duration readout.
 *  Split out of `ComposeClient.tsx` (004 T043). */
export default function ComposeToolbar({ onAddStillness, onAddPhase, totalSeconds }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-2">
        <button onClick={onAddStillness} className="kk-btn-outline px-3 py-1.5 text-sm">
          + Add stillness
        </button>
        <button onClick={onAddPhase} className="kk-btn-outline px-3 py-1.5 text-sm">
          + Add phase
        </button>
      </div>
      <div data-testid="compose-total-duration" className="text-sm font-medium">
        Total: {formatDuration(totalSeconds)}
      </div>
    </div>
  )
}
