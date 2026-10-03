'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import type { Pose, FiveElement } from '@/lib/pose-types'
import { resolveDisplayName } from '@/lib/pose-library/display-name'
import {
  complexityExplanation,
  injuryRiskExplanation,
  SCORE_EXPLANATION_FOOTER,
} from './score-explanation'

interface Props {
  pose: Pose
  onOpen: () => void
}

const ELEMENT_DOT_COLORS: Record<FiveElement, string> = {
  wood:  'bg-green-500',
  fire:  'bg-red-500',
  earth: 'bg-yellow-500',
  metal: 'bg-gray-400',
  water: 'bg-blue-500',
}

type ScoreField = 'complexity' | 'injury_risk'

// FR-022/023, SC-009: a short static explanation, reachable in place from the number
// itself — a disclosure, not a separate page. `complexity` is Tier-1 (always rendered);
// `injury_risk` is Tier-2 and rendered only when present, so the 67/67 coverage the pose
// library happens to have today never becomes a load-bearing assumption here.
function ScoreExplanationGroup({ pose }: { pose: Pose }) {
  const [open, setOpen] = useState<ScoreField | null>(null)
  const name = resolveDisplayName(pose)
  const complexity = complexityExplanation(pose.complexity, pose.source)
  const injuryRisk =
    pose.injury_risk != null ? injuryRiskExplanation(pose.injury_risk, pose.source) : null
  const openCopy = open === 'complexity' ? complexity : open === 'injury_risk' ? injuryRisk : null

  function toggle(field: ScoreField) {
    setOpen(prev => (prev === field ? null : field))
  }

  return (
    <div className="px-4 pb-3 -mt-1 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span
          data-testid={`poses-score-value-complexity-${pose.slug}`}
          className="px-2 py-0.5 rounded-full"
          style={{ background: 'var(--surface-raised)', color: 'var(--foreground)' }}
        >
          {complexity.heading}
        </span>
        <button
          type="button"
          data-testid={`poses-score-trigger-complexity-${pose.slug}`}
          aria-expanded={open === 'complexity'}
          aria-label={`What the complexity score for ${name} reflects`}
          onClick={() => toggle('complexity')}
          className="p-1 rounded-full transition-colors"
          style={{ color: 'var(--muted)', transitionDuration: '150ms' }}
        >
          <Info size={14} aria-hidden="true" />
        </button>

        {injuryRisk && (
          <>
            <span
              data-testid={`poses-score-value-injury_risk-${pose.slug}`}
              className="px-2 py-0.5 rounded-full"
              style={{ background: 'var(--surface-raised)', color: 'var(--foreground)' }}
            >
              {injuryRisk.heading}
            </span>
            <button
              type="button"
              data-testid={`poses-score-trigger-injury_risk-${pose.slug}`}
              aria-expanded={open === 'injury_risk'}
              aria-label={`What the injury-risk score for ${name} reflects`}
              onClick={() => toggle('injury_risk')}
              className="p-1 rounded-full transition-colors"
              style={{ color: 'var(--muted)', transitionDuration: '150ms' }}
            >
              <Info size={14} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {open && openCopy && (
        <div
          data-testid={`poses-score-explanation-${open}-${pose.slug}`}
          className="text-xs rounded-lg p-2.5 space-y-1.5"
          style={{ background: 'var(--surface-raised)' }}
        >
          <p style={{ color: 'var(--foreground)' }}>{openCopy.body}</p>
          <p style={{ color: 'var(--muted)' }}>{openCopy.lineage}</p>
          <p style={{ color: 'var(--muted)' }}>{SCORE_EXPLANATION_FOOTER}</p>
        </div>
      )}
    </div>
  )
}

export default function PoseCard({ pose, onOpen }: Props) {
  const yinMode = pose.modes.find(m => m.type === 'yin') ?? pose.modes[0]
  const topTypeTag = pose.type_tags?.[0]

  return (
    <article className="kk-card overflow-hidden" data-testid={`poses-card-${pose.slug}`}>
      <button
        onClick={onOpen}
        className="w-full text-left px-4 pt-4 pb-3 focus:outline-none"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {pose.element && (
              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${ELEMENT_DOT_COLORS[pose.element]}`} />
            )}
            <h2 className="font-serif font-semibold truncate">{resolveDisplayName(pose)}</h2>
          </div>
          <p className="text-xs italic truncate mt-0.5" style={{ color: 'var(--muted)' }}>{pose.sanskrit}</p>
          <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--muted)' }}>{pose.body_position} · {pose.difficulty}</p>

          {/* Lightweight preview */}
          <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
            {yinMode && (
              <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-raised)', color: 'var(--foreground)' }}>
                {yinMode.hold_range.min}–{yinMode.hold_range.max} min
              </span>
            )}
            {topTypeTag && (
              <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-raised)', color: 'var(--foreground)' }}>
                {topTypeTag}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Outside the open-detail button — a nested <button> would be invalid HTML, and
          the explanation trigger must not also open the pose overlay (FR-022). */}
      <ScoreExplanationGroup pose={pose} />
    </article>
  )
}
