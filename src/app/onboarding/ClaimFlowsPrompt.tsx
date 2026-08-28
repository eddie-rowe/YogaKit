'use client'

import { useEffect, useState } from 'react'

import { exportKramaFile } from '@/lib/storage/krama-file'
import { getAllFlows } from '@/lib/storage/flow-store'
import { createClient } from '@/lib/supabase/client'

// Shown once per device after sign-in when local flows exist and no claim
// decision has been recorded yet (T030, appendix §E "Migrating existing
// local data" — never silent adoption, never silent loss).
const CLAIM_DECISION_KEY = 'krama-claim-flows-decided'

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

    await supabase.from('claimed_flows').insert(rows)

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
