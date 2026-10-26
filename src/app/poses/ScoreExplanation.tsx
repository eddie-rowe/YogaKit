'use client'

import { useId, useState } from 'react'
import type { Pose } from '@/lib/pose-types'
import { SCORE_EXPLANATIONS, SCORE_EXPLANATION_FOOTER, type ScoreField } from './score-explanation'

interface ScoreProps {
  pose: Pose
  field: ScoreField
}

/** One score number with its adjacent explanation trigger (FR-022, SC-009). The number
 *  and the trigger are rendered together here so no caller can show one without the other. */
export function ScoreWithExplanation({ pose, field }: ScoreProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const value = pose[field]
  if (value == null) return null
  const copy = SCORE_EXPLANATIONS[field]

  return (
    <span className="inline-flex flex-col" data-testid={`score-${field}-${pose.slug}`}>
      <span className="inline-flex items-center gap-1">
        <span data-testid={`score-value-${field}-${pose.slug}`}>
          {copy.label} {value}/10
        </span>
        <button
          type="button"
          className="kk-chip px-2 text-xs"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`About ${copy.label.toLowerCase()} score`}
          data-testid={`score-explain-${field}-${pose.slug}`}
          onClick={() => setOpen(o => !o)}
        >
          ?
        </button>
      </span>
      {open && (
        <span
          id={panelId}
          role="note"
          className="block mt-1 text-xs leading-relaxed"
          style={{ color: 'var(--muted)' }}
          data-testid={`score-explanation-${field}-${pose.slug}`}
        >
          <strong className="block" style={{ color: 'var(--foreground)' }}>
            {copy.label} {value}/10
          </strong>
          {copy.body}
          <span className="block mt-1">Lineage: {pose.source}</span>
          <span className="block mt-1">{SCORE_EXPLANATION_FOOTER}</span>
        </span>
      )}
    </span>
  )
}
