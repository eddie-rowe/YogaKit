'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

type Status = 'pending' | 'accepted' | 'failed'

export default function AcceptInvitationClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>('pending')
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('failed')
      return
    }

    const supabase = createClient()
    supabase
      .rpc('app_accept_invitation', { raw_token: token })
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setStatus('failed')
          return
        }
        const membership = data as { org_id: string }
        setOrgId(membership.org_id)
        setStatus('accepted')
      })
  }, [token])

  useEffect(() => {
    if (status === 'accepted' && orgId) {
      router.push(`/org/${orgId}/members`)
    }
  }, [status, orgId, router])

  return (
    <div className="kk-page">
      <div className="max-w-sm mx-auto px-4 py-10 space-y-6">
        {status === 'pending' && <p className="text-sm">Accepting your invitation…</p>}
        {status === 'failed' && (
          // Deliberately the single generic message for every rejection reason
          // (not found / revoked / accepted / expired / email mismatch) — FR-005's
          // existence-leak guard.
          <p data-testid="invitation-accept-error" className="text-sm">
            That invitation link is no longer valid. Please ask for a new one.
          </p>
        )}
        {status === 'accepted' && <p className="text-sm">Invitation accepted — taking you to the organization…</p>}
      </div>
    </div>
  )
}
