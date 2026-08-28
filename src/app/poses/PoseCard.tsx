'use client'

import type { Pose, FiveElement } from '@/lib/pose-types'
import { resolveDisplayName } from '@/lib/pose-library/display-name'

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
    </article>
  )
}
