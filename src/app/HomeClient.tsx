'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Flow } from '@/lib/flow/types'
import { getAllFlows } from '@/lib/storage/flow-store'
import { formatDuration, totalSeconds } from '@/lib/flow/duration'
import ClaimFlowsPrompt from '@/app/onboarding/ClaimFlowsPrompt'

interface Props {
  builtins: Flow[]
}

export default function HomeClient({ builtins }: Props) {
  const [todaysFlow, setTodaysFlow] = useState<Flow | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getAllFlows().then(flows => {
      const sorted = [...flows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      setTodaysFlow(sorted[0] ?? null)
      setLoaded(true)
    })
  }, [])

  return (
    <div className="kk-page">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Krama</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Compose a class by hand. Read it on the mat.
          </p>
        </div>

        <ClaimFlowsPrompt />

        {loaded && todaysFlow && (
          <Link data-testid="home-todays-flow" href={`/flows/${todaysFlow.id}`} className="kk-card block px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
              Today's flow
            </div>
            <div className="text-lg font-medium">{todaysFlow.title}</div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              {todaysFlow.items.length} poses · {formatDuration(totalSeconds(todaysFlow.items))}
            </div>
          </Link>
        )}

        <Link
          data-testid="home-new-flow"
          href="/compose"
          className="kk-btn block text-center px-4 py-3 font-medium"
        >
          New flow
        </Link>

        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Built-in flows
          </h2>
          {builtins.map(flow => (
            <Link
              key={flow.id}
              data-testid={`home-builtin-${flow.id}`}
              href={`/flows/${flow.id}`}
              className="kk-card block px-4 py-3"
            >
              <div className="text-sm font-medium">{flow.title}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>
                {flow.items.length} poses · {formatDuration(totalSeconds(flow.items))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
