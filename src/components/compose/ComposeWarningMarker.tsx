'use client'

import type { ValidatorWarning } from '@/lib/validator/lite'

interface Props {
  warning: ValidatorWarning
  onDismiss: (warning: ValidatorWarning) => void
}

/** One validator-lite warning with a session-only dismiss control (004 US6). Advisory
 *  only — it never blocks save, export, or share. Shared by the flow-level list and
 *  the per-row anchor so both render identically. */
export default function ComposeWarningMarker({ warning, onDismiss }: Props) {
  return (
    <div
      data-testid={`validator-warning-${warning.code}`}
      className="kk-warning px-3 py-2 text-sm flex items-start gap-2"
    >
      <span className="flex-1 min-w-0">{warning.message}</span>
      <button
        type="button"
        data-testid={`validator-warning-dismiss-${warning.code}`}
        onClick={() => onDismiss(warning)}
        className="flex-shrink-0 text-xs underline"
      >
        Dismiss
      </button>
    </div>
  )
}
