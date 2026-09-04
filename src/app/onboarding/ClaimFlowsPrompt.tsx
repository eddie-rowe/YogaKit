'use client'

import { useEffect, useState } from 'react'

import { exportKramaFile } from '@/lib/storage/krama-file'
import { getAllFlows } from '@/lib/storage/flow-store'
import { createClient } from '@/lib/supabase/client'
import { CLAIM_DECISION_KEY } from '@/lib/storage/claim-decision'
import type { Json } from '@/types/database'

// Shown once per device after sign-in when local flows exist and no claim
// decision has been recorded yet (T030, appendix §E "Migrating existing
// local data" — never silent adoption, never silent loss).
//
// The key moved to @/lib/storage/claim-decision so /settings can clear it: this
// prompt records a decision and never revisits it, which left anyone who
// dismissed it with no way back.

// `flows.id` is a uuid column. Local ids have been `crypto.randomUUID()` since v0.1, but
// an imported file could carry anything, and a flow we cannot key is not a flow we should
// drop — it stays in `claimed_flows` above, keyed by its text `source_flow_id`.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function ClaimFlowsPrompt() {
  const [visible, setVisible] = useState(false)
  const [flowCount, setFlowCount] = useState(0)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(CLAIM_DECISION_KEY)) return

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return

      getAllFlows().then(flows => {
        if (flows.length > 0) {
          setFlowCount(flows.length)
          setVisible(true)
        }
      })
    })
  }, [])

  function decide() {
    localStorage.setItem(CLAIM_DECISION_KEY, 'true')
    setVisible(false)
  }

  async function handleClaim() {
    setClaiming(true)
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if (!userId) {
      setClaiming(false)
      return
    }

    const flows = await getAllFlows()
    const exportedAt = new Date().toISOString()
    const rows = flows.map(flow => ({
      user_id: userId,
      source_flow_id: flow.id,
      payload: exportKramaFile(flow, exportedAt),
    }))

    // The whole document lands first, and it lands write-once. `claimed_flows` is the
    // audit trail (DECISIONS.md, 2026-09-03): if the shred below is wrong, or a later
    // schema change loses something, the teacher's original is still here and the fix is
    // a second backfill. A claimed flow has no other copy once the browser is cleared.
    await supabase.from('claimed_flows').insert(rows)

    // Then the same flows as normalized rows, one transaction each — the shape the app
    // actually reads. Ids are client-generated, so a claimed flow keeps the identity it
    // already had on this device and a re-claim converges instead of duplicating.
    for (const flow of flows) {
      if (!UUID.test(flow.id)) continue
      await supabase.rpc('app_save_flow', {
        payload: flow as unknown as Json,
      })
    }

    setClaiming(false)
    decide()
  }

  if (!visible) return null

  return (
    <div data-testid="onboarding-claim-flows" className="kk-card px-4 py-3 space-y-3">
      <div className="text-sm">
        You have {flowCount} flow{flowCount === 1 ? '' : 's'} saved on this device. Bring{' '}
        {flowCount === 1 ? 'it' : 'them'} into your account?
      </div>
      <div className="flex gap-2">
        <button
          data-testid="onboarding-claim-flows-claim"
          type="button"
          disabled={claiming}
          onClick={handleClaim}
          className="kk-btn px-4 py-2 text-sm font-medium"
        >
          {claiming ? 'Bringing them in…' : 'Yes, bring them in'}
        </button>
        <button
          data-testid="onboarding-claim-flows-decline"
          type="button"
          disabled={claiming}
          onClick={decide}
          className="px-4 py-2 text-sm"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
