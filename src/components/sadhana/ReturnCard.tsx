'use client'

// Return card (005 T039/T040, FR-028..031/033). Shown when someone comes back after time away.
// States the elapsed time plainly and quotes the intention that was active when the gap began.
// "Keep" and "update" are flat and carry identical weight; the third response is a way to say the
// pause is deliberate. Every response is a callback; saving, routing and lookup are the caller's.

import type { ReentryOffer } from '@/lib/sadhana/reentry-offer'

interface ReturnCardProps {
  elapsedDays: number
  /** The intention active when the gap began, or null when there was none. */
  intention: string | null
  /** Optional smallest-unit re-entry offer (T041), chosen by the caller via `reentryOffer`. */
  offer?: ReentryOffer | null
  /** Called when the person starts the offered unit. The caller owns routing. */
  onStartOffer?: () => void
  onKeep: () => void
  onUpdate: () => void
  onRest: () => void
}

const ACTION_CLASS = 'rounded-md px-3 py-2 text-sm'
const ACTION_STYLE = { background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--muted)' }

export default function ReturnCard({ elapsedDays, intention, offer = null, onStartOffer, onKeep, onUpdate, onRest }: ReturnCardProps) {
  return (
    <section
      data-testid="sadhana-return"
      aria-label="Welcome back"
      className="rounded-lg p-4 text-sm"
      style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
    >
      <p data-testid="sadhana-return-elapsed" className="font-medium">
        Welcome back. It has been {elapsedDays} {elapsedDays === 1 ? 'day' : 'days'} since your last practice.
      </p>
      {intention !== null && (
        <blockquote data-testid="sadhana-return-intention" className="mt-2" style={{ color: 'var(--muted)' }}>
          &ldquo;{intention}&rdquo;
        </blockquote>
      )}
      {offer !== null && (
        <p data-testid="sadhana-return-offer" className="mt-2">
          {offer.kind === 'phase' ? 'You can begin with the first phase of your flow.' : 'You can begin with the first pose of your flow.'}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" data-testid="sadhana-return-keep" onClick={onKeep} className={ACTION_CLASS} style={ACTION_STYLE}>
          Keep this intention
        </button>
        <button type="button" data-testid="sadhana-return-update" onClick={onUpdate} className={ACTION_CLASS} style={ACTION_STYLE}>
          Update it
        </button>
        {offer !== null && (
          <button type="button" data-testid="sadhana-return-offer-start" onClick={onStartOffer} className={ACTION_CLASS} style={ACTION_STYLE}>
            Begin there
          </button>
        )}
      </div>
      <button
        type="button"
        data-testid="sadhana-return-rest"
        onClick={onRest}
        className="mt-3 underline"
        style={{ color: 'var(--muted)' }}
      >
        I&apos;m resting, not stopping
      </button>
    </section>
  )
}
