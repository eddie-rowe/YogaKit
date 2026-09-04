'use client'

import { useEffect, useState } from 'react'
import type { Flow } from '@/lib/flow/types'
import { createClient } from '@/lib/supabase/client'
import { exportKramaFileForSharing } from '@/lib/storage/krama-file'
import {
  getFlowShare,
  listMyOrgs,
  revokeFlowShare,
  shareFlowWithOrg,
  type OrgOption,
} from '@/lib/storage/sharing'

interface Props {
  flow: Flow
}

// What sharing can be in, from a teacher's point of view. `absent` is the case where
// the flow has not reached the account yet — a signed-in teacher who has just written
// a flow offline, most often — and it is why this is a state machine rather than a
// boolean: "not shared" and "not there to share" are different sentences.
type Status = 'loading' | 'unavailable' | 'absent' | 'private' | 'shared'

/**
 * The share surface for one flow (004 US3, FR-025 / FR-029 / FR-032).
 *
 * Absent entirely for a signed-out teacher and for a solo practitioner with no
 * organization — there is nobody to share with, and an empty control that explains
 * itself is worse than no control.
 */
export default function FlowShare({ flow }: Props) {
  const [status, setStatus] = useState<Status>('loading')
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const [sharedOrgId, setSharedOrgId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // getSession() reads the local cookie — no round trip, so a signed-out
        // teacher's flow detail page costs nothing extra to render.
        const { data } = await createClient().auth.getSession()
        if (!data.session) {
          if (!cancelled) setStatus('unavailable')
          return
        }
        const mine = await listMyOrgs()
        if (cancelled) return
        setOrgs(mine)
        if (mine.length === 0) {
          setStatus('unavailable')
          return
        }
        const shared = await getFlowShare(flow.id)
        if (cancelled) return
        setSharedOrgId(shared)
        setStatus(shared ? 'shared' : 'private')
      } catch {
        if (!cancelled) setStatus('unavailable')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [flow.id])

  async function share(orgId: string) {
    setBusy(true)
    setError(null)
    try {
      await shareFlowWithOrg(flow.id, orgId)
      // Read it back rather than assume: the update is filtered by policy, and a flow
      // that has not synced yet matches no row, which is the `absent` case.
      const shared = await getFlowShare(flow.id)
      setSharedOrgId(shared)
      setStatus(shared ? 'shared' : 'absent')
    } catch {
      setError('This flow could not be shared. Your copy on this device is unchanged.')
    } finally {
      setBusy(false)
    }
  }

  async function revoke() {
    setBusy(true)
    setError(null)
    try {
      await revokeFlowShare(flow.id)
      setSharedOrgId(null)
      setStatus('private')
    } catch {
      setError('Sharing could not be stopped just now. Your copy on this device is unchanged.')
    } finally {
      setBusy(false)
    }
  }

  function exportForSharing() {
    const file = exportKramaFileForSharing(flow, new Date().toISOString())
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flow.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-to-share.krama.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (status === 'loading' || status === 'unavailable') return null

  const sharedOrgName = orgs.find(o => o.id === sharedOrgId)?.name ?? ''

  return (
    <section
      data-testid="share-panel"
      className="kk-card px-3 py-3 space-y-2"
      aria-label="Sharing"
    >
      <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        Sharing
      </h2>

      <p data-testid="share-status" className="text-sm">
        {status === 'shared'
          ? `Shared with ${sharedOrgName}. Anyone there can read this flow and make their own copy.`
          : status === 'absent'
            ? 'This flow is on this device and not yet in your account. Sharing starts once it has saved.'
            : 'Only you can see this flow.'}
      </p>

      {status === 'shared' ? (
        <button
          data-testid="share-stop"
          onClick={revoke}
          disabled={busy}
          className="kk-btn-outline px-2.5 py-1 text-xs"
        >
          Stop sharing
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {orgs.map(org => (
            <button
              key={org.id}
              data-testid={`share-org-${org.id}`}
              onClick={() => share(org.id)}
              disabled={busy}
              className="kk-btn-outline px-2.5 py-1 text-xs"
            >
              Share with {org.name}
            </button>
          ))}
        </div>
      )}

      {/* FR-032, stated rather than implied, and stated next to the control it is
          about. The second sentence is the one a teacher actually wonders about: what
          happens to their notes. Both are facts about the schema, not reassurances —
          see contracts/flow-sharing.md. */}
      <p data-testid="share-caption" className="text-xs" style={{ color: 'var(--muted)' }}>
        Copies other people have already made are their own flows. Stopping sharing closes
        this flow to your organization and leaves those copies as they are. Your per-pose
        notes are yours alone and are never part of what you share.
      </p>

      <button
        data-testid="share-export"
        onClick={exportForSharing}
        className="kk-btn-outline px-2.5 py-1 text-xs"
      >
        Export a copy to share
      </button>

      {error && (
        <p data-testid="share-error" className="kk-warning px-3 py-2 text-sm">
          {error}
        </p>
      )}
    </section>
  )
}
