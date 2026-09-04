'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Pose } from '@/lib/pose-types'
import { resolveItemName } from '@/lib/pose-library/display-name'
import { formatDuration, totalSeconds } from '@/lib/flow/duration'
import { adoptSharedFlow, listFlowsSharedWithMe, type SharedFlow } from '@/lib/storage/sharing'

interface Props {
  poses: Pose[]
}

/**
 * Flows other teachers have shared with an organization this teacher belongs to, and
 * the one-click duplicate that makes one of them theirs (FR-025, SC-010).
 *
 * What is on this page is the whole of what crosses the author boundary: a title, a
 * count, a duration, and the poses in order. There is no note on any item here, and no
 * request on this page could return one — the read path asks three tables and none of
 * them has a column that holds one (contracts/flow-sharing.md).
 */
export default function SharedFlowsClient({ poses }: Props) {
  const [shared, setShared] = useState<SharedFlow[] | null>(null)
  const [adopting, setAdopting] = useState<string | null>(null)
  const [adopted, setAdopted] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const poseBySlug = new Map(poses.map(p => [p.slug, p]))

  useEffect(() => {
    listFlowsSharedWithMe()
      .then(setShared)
      .catch(() => {
        setShared([])
        setError('This list could not be loaded just now.')
      })
  }, [])

  async function adopt(item: SharedFlow) {
    setAdopting(item.flow.id)
    setError(null)
    try {
      // Saves locally first, then queues, like every other write in the app: the copy
      // is on the device before any network call.
      const copy = await adoptSharedFlow(item)
      setAdopted(prev => ({ ...prev, [item.flow.id]: copy.id }))
    } catch {
      setError('That flow could not be copied just now.')
    } finally {
      setAdopting(null)
    }
  }

  return (
    <div className="kk-page">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/flows" className="text-sm" style={{ color: 'var(--muted)' }}>← Flows</Link>
          <h1 className="font-serif text-2xl font-semibold mt-2">Shared with you</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Flows other teachers in your organizations have shared. Making a copy gives you
            your own flow to change however you like.
          </p>
        </div>

        {error && <div className="kk-warning px-3 py-2 text-sm">{error}</div>}

        {shared !== null && shared.length === 0 && (
          <p data-testid="shared-empty" className="text-sm py-4" style={{ color: 'var(--muted)' }}>
            Nothing is shared with you yet.
          </p>
        )}

        <div data-testid="shared-list" className="space-y-2">
          {(shared ?? []).map(item => {
            const items = [...item.flow.items].sort((a, b) => a.order - b.order)
            const copyId = adopted[item.flow.id]
            return (
              <div key={item.flow.id} data-testid={`shared-row-${item.flow.id}`} className="kk-card px-3 py-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.flow.title}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
                      {item.authorName ? `${item.authorName} · ` : ''}
                      {item.orgName} · {items.length} poses ·{' '}
                      {formatDuration(totalSeconds(items))}
                    </div>
                  </div>
                  {copyId ? (
                    <Link
                      data-testid={`shared-open-${item.flow.id}`}
                      href={`/compose/${copyId}`}
                      className="kk-btn px-2.5 py-1 text-xs font-medium"
                    >
                      Open your copy
                    </Link>
                  ) : (
                    <button
                      data-testid={`shared-adopt-${item.flow.id}`}
                      onClick={() => adopt(item)}
                      disabled={adopting === item.flow.id}
                      className="kk-btn-outline px-2.5 py-1 text-xs"
                    >
                      {adopting === item.flow.id ? 'Copying' : 'Make a copy'}
                    </button>
                  )}
                </div>
                <ol className="text-xs space-y-0.5" style={{ color: 'var(--muted)' }}>
                  {items.map((flowItem, index) => (
                    <li key={flowItem.id}>
                      {index + 1}. {resolveItemName(poseBySlug.get(flowItem.poseSlug), flowItem.poseSlug)}
                    </li>
                  ))}
                </ol>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
