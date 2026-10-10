'use client'

import { Fragment, useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Pose } from '@/lib/pose-types'
import type { FlowItem, LayerName } from '@/lib/flow/types'
import { isStillnessNode } from '@/lib/flow/types'
import type { FrictionMatrix } from '@/lib/friction'
import { insertionGapIndex } from '@/lib/flow/seam-geometry'
import ComposeFlowItem from './ComposeFlowItem'

interface Props {
  items: FlowItem[]
  poseBySlug: Map<string, Pose>
  frictionMatrix: FrictionMatrix
  layer: LayerName
  sensors: SensorDescriptor<SensorOptions>[]
  onDragStart: () => void
  onDragEnd: (event: DragEndEvent) => void
  onMove: (index: number, direction: -1 | 1) => void
  onUpdate: (id: string, patch: Partial<FlowItem>) => void
  onRemove: (id: string) => void
}

/** The drag-and-drop flow-item list: `DndContext` + `SortableContext` wrapping the
 *  per-item rows, plus the empty-state message. Split out of `ComposeClient.tsx`
 *  (004 T043) — same DOM, same testids, same sibling drag-handle/reorder-button row
 *  inside each `ComposeFlowItem` (T044). */
export default function ComposeFlowList({
  items,
  poseBySlug,
  frictionMatrix,
  layer,
  sensors,
  onDragStart,
  onDragEnd,
  onMove,
  onUpdate,
  onRemove,
}: Props) {
  const [gapIndex, setGapIndex] = useState<number | null>(null)
  const indexOf = (id: unknown) => items.findIndex(i => i.id === id)
  const handleDragOver = (event: DragOverEvent) => {
    if (!event.over) return setGapIndex(null)
    setGapIndex(insertionGapIndex(indexOf(event.active.id), indexOf(event.over.id)))
  }
  return (
    <div className="space-y-1">
      {items.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
          Search above to add your first pose.
        </p>
      )}
      <DndContext sensors={sensors} onDragStart={onDragStart}
        onDragOver={handleDragOver}
        onDragEnd={e => {
          setGapIndex(null)
          onDragEnd(e)
        }}
        onDragCancel={() => setGapIndex(null)}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => {
            const pose = poseBySlug.get(item.poseSlug)
            const stillness = isStillnessNode(item.poseSlug)
            const next = items[index + 1]
            const seam = next && pose
              ? frictionMatrix[pose.slug]?.[next.poseSlug]
              : undefined
            return (
              <Fragment key={item.id}>
                {gapIndex === index && <div data-testid="compose-insertion-gap" className="kk-insertion-gap" aria-hidden />}
              <ComposeFlowItem
                item={item}
                index={index}
                pose={pose}
                stillness={stillness}
                layer={layer}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                next={next}
                seam={seam}
                onMove={onMove}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
                {gapIndex === items.length && index === items.length - 1 && (
                  <div data-testid="compose-insertion-gap" className="kk-insertion-gap" aria-hidden />
                )}
              </Fragment>
            )
          })}
        </SortableContext>
      </DndContext>
    </div>
  )
}
