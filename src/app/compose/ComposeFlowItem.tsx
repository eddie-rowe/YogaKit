'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X } from 'lucide-react'
import type { Pose } from '@/lib/pose-types'
import type { FlowItem, LayerName } from '@/lib/flow/types'
import { resolveDisplayName } from '@/lib/pose-library/display-name'
import { SECONDS_PER_BREATH } from '@/lib/flow/duration'

interface SeamInfo {
  tier: number
  reasons: string[]
}

interface Props {
  item: FlowItem
  index: number
  pose: Pose | undefined
  stillness: boolean
  layer: LayerName
  isFirst: boolean
  isLast: boolean
  next: FlowItem | undefined
  seam: SeamInfo | undefined
  onMove: (index: number, direction: -1 | 1) => void
  onUpdate: (id: string, patch: Partial<FlowItem>) => void
  onRemove: (id: string) => void
}

export default function ComposeFlowItem({
  item,
  index,
  pose,
  stillness,
  layer,
  isFirst,
  isLast,
  next,
  seam,
  onMove,
  onUpdate,
  onRemove,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div>
      <div
        ref={setNodeRef}
        style={style}
        data-testid={`compose-item-${index}`}
        data-dragging={isDragging}
        className={`kk-card kk-drag-item px-3 py-2.5 flex flex-col gap-2 ${stillness ? 'kk-stillness' : ''}`}
      >
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            data-testid={`compose-item-drag-handle-${index}`}
            className="kk-drag-handle kk-nocallout flex-shrink-0 px-1 py-2.5 text-sm"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>
          <span className="kk-nocallout text-sm font-medium flex-1 min-w-0">
            {pose ? resolveDisplayName(pose) : item.poseSlug}
          </span>
          <div data-testid={`compose-item-measure-${index}`} className="flex items-center gap-1 text-xs">
            <select
              value={item.measure.breaths != null ? 'breaths' : 'seconds'}
              onChange={e => {
                const kind = e.target.value
                // Convert the existing value instead of discarding it —
                // flipping breaths↔seconds used to silently reset to a
                // default (Phase 1).
                const measure =
                  kind === 'breaths'
                    ? { breaths: item.measure.seconds != null
                        ? Math.max(1, Math.round(item.measure.seconds / SECONDS_PER_BREATH))
                        : 5 }
                    : { seconds: item.measure.breaths != null
                        ? item.measure.breaths * SECONDS_PER_BREATH
                        : 60 }
                onUpdate(item.id, { measure })
              }}
              className="kk-input px-2 py-2"
            >
              <option value="breaths">breaths</option>
              <option value="seconds">seconds</option>
            </select>
            <input
              type="number"
              min={1}
              value={item.measure.breaths ?? item.measure.seconds ?? 0}
              onChange={e => {
                const value = e.target.value === '' ? 1 : Math.max(1, Number(e.target.value))
                onUpdate(item.id, {
                  measure: item.measure.breaths != null ? { breaths: value } : { seconds: value },
                })
              }}
              className="kk-input w-14 px-2 py-2"
            />
          </div>
          <button
            data-testid={`compose-item-reorder-up-${index}`}
            onClick={() => onMove(index, -1)}
            disabled={isFirst}
            className="kk-btn-outline px-2.5 py-2.5 text-xs"
          >
            ↑
          </button>
          <button
            data-testid={`compose-item-reorder-down-${index}`}
            onClick={() => onMove(index, 1)}
            disabled={isLast}
            className="kk-btn-outline px-2.5 py-2.5 text-xs"
          >
            ↓
          </button>
          <button
            onClick={() => onRemove(item.id)}
            aria-label="Remove"
            className="flex-shrink-0 p-2.5"
            style={{ color: 'var(--muted)' }}
          >
            <X size={16} />
          </button>
        </div>
        {(layer !== 'simple') && (
          <input
            data-testid={`compose-item-notes-${index}`}
            value={item.note ?? ''}
            onChange={e => onUpdate(item.id, { note: e.target.value })}
            placeholder="Note for this pose…"
            className="kk-input px-2 py-2"
          />
        )}
        {pose && (layer === 'advanced' || layer === 'expert') && (
          <div data-testid={`compose-item-geometry-${index}`} className="flex flex-wrap gap-1 text-xs">
            <span className="capitalize px-2 py-1 rounded" style={{ background: 'var(--surface-raised)', color: 'var(--foreground)' }}>
              {pose.body_position}
            </span>
            {pose.bilateral && (
              <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded">Bilateral</span>
            )}
            {pose.nervous_system_effect && (
              <span className="px-2 py-1 rounded capitalize" style={{ background: 'var(--surface-raised)', color: 'var(--foreground)' }}>
                {pose.nervous_system_effect}
              </span>
            )}
            {pose.tissue_depth && (
              <span className="bg-violet-50 text-violet-700 px-2 py-1 rounded capitalize">
                {pose.tissue_depth} tissue
              </span>
            )}
          </div>
        )}
        {pose && layer === 'expert' && (
          <div data-testid={`compose-item-energetics-${index}`} className="flex flex-wrap gap-1 text-xs">
            {pose.energetic_quality.map(eq => (
              <span key={eq} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded capitalize">{eq}</span>
            ))}
            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded capitalize">{pose.energetic_direction}</span>
          </div>
        )}
      </div>
      {next && seam && (
        <div
          data-testid={`compose-seam-${index}-${index + 1}`}
          data-tier={seam.tier}
          className="kk-seam px-3 py-1"
          title={seam.reasons.join('; ')}
        >
          <span className="kk-seam-line" />
          <span>
            tier {seam.tier}
            {seam.reasons.length > 0 && layer !== 'expert' && `: ${seam.reasons[0]}`}
            {seam.reasons.length > 0 && layer === 'expert' && `: ${seam.reasons.join(', ')}`}
          </span>
          <span className="kk-seam-line" />
        </div>
      )}
    </div>
  )
}
