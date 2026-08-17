'use client'

import { useEffect, useState } from 'react'
import type { Pose } from '@/lib/pipeline/types'
import type { Flow } from '@/lib/flow/types'
import { getFlow } from '@/lib/storage/flow-store'
import ReadView from './ReadView'

export default function ReadViewClient({ id, poses }: { id: string; poses: Pose[] }) {
  const [flow, setFlow] = useState<Flow | null | undefined>(undefined)

  useEffect(() => {
    getFlow(id).then(f => setFlow(f ?? null))
  }, [id])

  if (flow === undefined) {
    return <div className="kk-page py-24 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
  }
  if (flow === null) {
    return <div className="kk-page py-24 text-center text-sm" style={{ color: 'var(--muted)' }}>Flow not found.</div>
  }
  return <ReadView flow={flow} poses={poses} />
}
