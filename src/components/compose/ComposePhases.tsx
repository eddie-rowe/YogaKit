'use client'

import type { Pose } from '@/lib/pose-types'
import type { FlowItem, Phase } from '@/lib/flow/types'
import { resolveItemName } from '@/lib/pose-library/display-name'

interface Props {
  phases: Phase[]
  items: FlowItem[]
  poseBySlug: Map<string, Pose>
  onRenamePhase: (phaseId: string, name: string) => void
  onAssignItem: (itemId: string, phaseId: string) => void
}

/** The phases section: name + item-assignment per phase. Split out of
 *  `ComposeClient.tsx` (004 T043). */
export default function ComposePhases({ phases, items, poseBySlug, onRenamePhase, onAssignItem }: Props) {
  if (phases.length === 0) return null

  return (
    <div className="space-y-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
      <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Phases</h2>
      {phases.map(phase => (
        <div key={phase.id} data-testid={`compose-phase-${phase.id}`} className="kk-card px-3 py-2 flex items-center gap-2">
          <input
            data-dd-privacy="mask-user-input"
            value={phase.name}
            onChange={e => onRenamePhase(phase.id, e.target.value)}
            className="kk-input px-2 py-2 flex-1"
          />
          <select
            value=""
            onChange={e => {
              const itemId = e.target.value
              if (itemId) onAssignItem(itemId, phase.id)
            }}
            className="kk-input px-2 py-2 text-xs"
          >
            <option value="">Assign item…</option>
            {items.map((item, idx) => (
              <option key={item.id} value={item.id}>
                {idx + 1}. {resolveItemName(poseBySlug.get(item.poseSlug), item.poseSlug)}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
