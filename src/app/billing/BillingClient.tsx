'use client'

import { useState } from 'react'

import type { Entitlements } from '@/lib/entitlements'
import type { PurchasablePlan } from '@/lib/stripe/plans'

interface BillingClientProps {
  entitlements: Entitlements
  plans: PurchasablePlan[]
}

// Human labels for the feature keys seeded by 20261012120000_seed_plan_features.
// Unmapped keys fall back to the key itself rather than being hidden: a plan
// quietly listing fewer features than it grants is worse than an ugly label.
const FEATURE_LABELS: Record<string, string> = {
  composing: 'Composing',
  cloud_sync: 'Cloud sync',
  teacher_dashboard: 'Teacher dashboard',
  org_seats: 'Organization seats',
}

function formatPrice(plan: PurchasablePlan): string {
  const amount = (plan.unit_amount / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: plan.currency.toUpperCase(),
  })
  return `${amount} / ${plan.interval}`
}

// Copy-lint risk lives entirely in this file (VOICE-URGENCY, VOICE-COUNTDOWN):
// access-through-a-date is a fact worth stating plainly, never a threshold to
// defend. No "expires", no "days left", no cancel confirmation framed as a
// loss — the Stripe customer portal itself owns the cancel confirmation UI,
// this page only ever states current state.
export default function BillingClient({ entitlements, plans }: BillingClientProps) {
  const [managing, setManaging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState<string | null>(null)

  const subscription = entitlements.subscriptions[0]
  const grant = entitlements.entitlement_grants[0]
  const hasStripeSubscription = !!subscription

  async function handleManage() {
    setManaging(true)
    setError(null)
    try {
      const res = await fetch('/billing/portal', { method: 'POST' })
      const body = await res.json()
      if (!res.ok || !body.url) {
        setError('Could not open billing management right now. Please try again.')
        return
      }
      window.location.assign(body.url)
    } catch {
      setError('Could not open billing management right now. Please try again.')
    } finally {
      setManaging(false)
    }
  }

  async function handleSubscribe(planKey: string) {
    setSubscribing(planKey)
    setError(null)
    try {
      const res = await fetch('/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_key: planKey }),
      })
      const body = await res.json()
      if (!res.ok || !body.url) {
        setError('Could not start checkout right now. Please try again.')
        return
      }
      window.location.assign(body.url)
    } catch {
      setError('Could not start checkout right now. Please try again.')
    } finally {
      setSubscribing(null)
    }
  }

  return (
    <div className="kk-page">
      <div className="max-w-sm mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Billing</h1>
        </div>

        {grant && (
          <div data-testid="billing-grant-card" className="kk-card px-4 py-3 text-sm space-y-1">
            <p className="font-medium">Included through a cohort</p>
            <p style={{ color: 'var(--muted)' }}>
              Access continues through {new Date(grant.ends_at).toLocaleDateString()}.
            </p>
          </div>
        )}

        {hasStripeSubscription ? (
          <div data-testid="billing-subscription-card" className="kk-card px-4 py-3 text-sm space-y-3">
            <p className="font-medium">{subscription.plan_key}</p>
            <p style={{ color: 'var(--muted)' }}>
              Access continues through {new Date(subscription.current_period_end).toLocaleDateString()}.
            </p>
            <button
              data-testid="billing-manage"
              type="button"
              disabled={managing}
              onClick={handleManage}
              className="kk-btn-outline px-3 py-1.5 text-xs"
            >
              {managing ? 'Opening…' : 'Manage billing'}
            </button>
            {error && (
              <p data-testid="billing-message" className="text-xs">
                {error}
              </p>
            )}
          </div>
        ) : null}

        {plans.length > 0 ? (
          <div className="space-y-3">
            {!hasStripeSubscription && !grant && (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                The pose library stays readable without an account or a subscription, whatever
                else changes here.
              </p>
            )}
            {plans.map(plan => (
              <div
                key={plan.plan_key}
                data-testid={`billing-plan-${plan.plan_key}`}
                className="kk-card px-4 py-3 text-sm space-y-3"
              >
                <p className="font-medium">{plan.plan_key}</p>
                <p style={{ color: 'var(--muted)' }}>{formatPrice(plan)}</p>
                <ul className="space-y-0.5" style={{ color: 'var(--muted)' }}>
                  {plan.feature_keys.map(key => (
                    <li key={key}>{FEATURE_LABELS[key] ?? key}</li>
                  ))}
                </ul>
                <button
                  data-testid={`billing-subscribe-${plan.plan_key}`}
                  type="button"
                  disabled={subscribing !== null}
                  onClick={() => handleSubscribe(plan.plan_key)}
                  className="kk-btn px-3 py-1.5 text-xs"
                >
                  {subscribing === plan.plan_key ? 'Opening…' : 'Subscribe'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          !hasStripeSubscription &&
          !grant && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              There is nothing to subscribe to yet. The pose library stays readable without an
              account or a subscription, whatever else changes here.
            </p>
          )
        )}

        {error && !hasStripeSubscription && (
          <p data-testid="billing-message" className="text-xs">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
