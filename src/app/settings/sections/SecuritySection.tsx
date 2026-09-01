'use client'

import { notifyClientValueChanged, useClientValue } from '@/lib/hooks/useClientValue'
import { CLAIM_DECISION_KEY } from '@/lib/storage/claim-decision'
import { Section, NotYet } from './Section'

/** Private-mode Safari throws on localStorage. Nothing to offer, then. */
function readClaimDismissed(): boolean {
  try {
    return localStorage.getItem(CLAIM_DECISION_KEY) !== null
  } catch {
    return false
  }
}

export default function SecuritySection({
  email,
  provider,
}: {
  email: string
  provider: string
}) {
  // ClaimFlowsPrompt writes this key once and never offers a way back, so a
  // practitioner who dismissed it has no route to their local flows again. This
  // is the re-entry point docs/design-research/19-settings-profile.md requires.
  // Rendering `false` on the server is the safe default: it hides an offer rather
  // than promising one that may not apply.
  const dismissed = useClientValue(readClaimDismissed, false)

  function reopenClaimPrompt() {
    try {
      localStorage.removeItem(CLAIM_DECISION_KEY)
    } catch {
      return
    }
    notifyClientValueChanged()
    // A full reload rather than router.refresh(): ClaimFlowsPrompt reads the key
    // once in a mount effect, so it only reconsiders on a fresh mount.
    window.location.assign('/')
  }

  return (
    <Section id="security" title="Account & security">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt style={{ color: 'var(--muted)' }}>Email</dt>
          <dd data-testid="settings-email" className="truncate">
            {email}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt style={{ color: 'var(--muted)' }}>Sign-in method</dt>
          <dd data-testid="settings-provider" className="capitalize">
            {provider}
          </dd>
        </div>
      </dl>

      <NotYet>
        Your email comes from whoever you sign in with, so it changes there rather than here.
        Signing out is in the menu behind your initials, top right.
      </NotYet>

      {dismissed && (
        <button
          type="button"
          data-testid="settings-claim-flows-reopen"
          onClick={reopenClaimPrompt}
          className="kk-btn-outline px-3 py-1.5 text-sm"
        >
          Ask again about flows saved on this device
        </button>
      )}
    </Section>
  )
}
