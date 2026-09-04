'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Pose } from '@/lib/pose-types'
import type { Flow } from '@/lib/flow/types'
import { isStillnessNode } from '@/lib/flow/types'
import { getFlow, deleteFlow } from '@/lib/storage/flow-store'
import { queueDelete } from '@/lib/storage/sync'
import { resolveDisplayName } from '@/lib/pose-library/display-name'
import { formatDuration, formatMeasure, totalSeconds } from '@/lib/flow/duration'

interface Props {
  id: string
  poses: Pose[]
  builtins: Flow[]
}

export default function FlowDetailClient({ id, poses, builtins }: Props) {
  const [flow, setFlow] = useState<Flow | null | undefined>(undefined)
  const poseBySlug = new Map(poses.map(p => [p.slug, p]))

  useEffect(() => {
    const builtin = builtins.find(f => f.id === id)
    if (builtin) {
      setFlow(builtin)
      return
    }
    getFlow(id).then(f => setFlow(f ?? null))
  }, [id, builtins])

  if (flow === undefined) {
    return <div className="kk-page py-24 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
  }
  if (flow === null) {
    return <div className="kk-page py-24 text-center text-sm" style={{ color: 'var(--muted)' }}>Flow not found.</div>
  }

  const items = [...flow.items].sort((a, b) => a.order - b.order)

  return (
    <div className="kk-page">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Link href="/flows" className="text-sm" style={{ color: 'var(--muted)' }}>← Flows</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold">{flow.title}</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {items.length} poses · {formatDuration(totalSeconds(items))}
              {flow.isBuiltIn && ' · read-only'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/read/${flow.id}`} className="kk-btn px-3 py-1.5 text-sm font-medium">
              Read view
            </Link>
            {flow.isBuiltIn ? (
              <Link data-testid={`flows-duplicate-${flow.id}`} href={`/compose/${flow.id}`} className="kk-btn-outline px-3 py-1.5 text-sm">
                Duplicate
              </Link>
            ) : (
              <Link href={`/compose/${flow.id}`} className="kk-btn-outline px-3 py-1.5 text-sm">
                Edit
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-1">
          {items.map((item, index) => {
            const pose = poseBySlug.get(item.poseSlug)
            const stillness = isStillnessNode(item.poseSlug)
            return (
              <div key={item.id} className={`kk-card px-3 py-2 flex items-center justify-between ${stillness ? 'kk-stillness' : ''}`}>
                <span className="text-sm">
                  {index + 1}. {pose ? resolveDisplayName(pose) : item.poseSlug}
                </span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {formatMeasure(item.measure)}
                </span>
              </div>
            )
          })}
        </div>

        {!flow.isBuiltIn && (
          <button
            data-testid={`flows-delete-${flow.id}`}
            onClick={async () => {
              await deleteFlow(flow.id)
              await queueDelete(flow.id)
              window.location.href = '/flows'
            }}
            className="text-xs px-2 py-1"
            style={{ color: 'var(--muted)' }}
          >
            Delete this flow
          </button>
        )}
      </div>
    </div>
  )
}
