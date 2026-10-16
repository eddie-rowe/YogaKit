'use client'

import type { ValidatorWarning } from '@/lib/validator/lite'
import ComposeWarningMarker from './ComposeWarningMarker'

interface Props {
  warnings: ValidatorWarning[]
  onDismiss: (warning: ValidatorWarning) => void
}

/** Flow-level validator-lite warnings — the ones not tied to a single item. Item
 *  warnings render anchored to their row instead (004 US6). Informational only,
 *  never blocks save. */
export default function ComposeWarnings({ warnings, onDismiss }: Props) {
  return (
    <>
      {warnings
        .filter(w => !w.itemId)
        .map(w => (
          <ComposeWarningMarker key={w.code} warning={w} onDismiss={onDismiss} />
        ))}
    </>
  )
}
