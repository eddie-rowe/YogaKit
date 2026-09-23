'use client'

import type { ValidatorWarning } from '@/lib/validator/lite'

interface Props {
  warnings: ValidatorWarning[]
}

/** Validator-lite warnings — informational only, never blocks save. Split out of
 *  `ComposeClient.tsx` (004 T043). */
export default function ComposeWarnings({ warnings }: Props) {
  return (
    <>
      {warnings.map(w => (
        <div
          key={`${w.code}-${w.itemId ?? 'flow'}`}
          data-testid={`validator-warning-${w.code}`}
          className="kk-warning px-3 py-2 text-sm"
        >
          {w.message}
        </div>
      ))}
    </>
  )
}
