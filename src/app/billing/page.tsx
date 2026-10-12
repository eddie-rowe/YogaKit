import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getEntitlements, activePlanKeys } from '@/lib/entitlements'
import { getPurchasablePlans } from '@/lib/stripe/plans'
import BillingClient from './BillingClient'

// Force dynamic: entitlements are per-user and change on webhook delivery,
// same reasoning as org/new and org/invitations/accept.
export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    redirect('/auth/sign-in?next=/billing')
  }

  // contracts/billing-webhooks.md: "Renders current subscriptions state from
  // app_entitlements(), not a direct table read, so the UI and the
  // enforcement path never disagree." Read through the 7a resolver, never
  // `subscriptions` directly.
  const entitlements = await getEntitlements(data.user.id)

  // T060: before plan_features was seeded this list was always empty, so the
  // page could only ever say "nothing to subscribe to yet". Plans a person
  // already holds are filtered out here rather than in the client, so the
  // client never has to decide what counts as "already subscribed".
  const held = new Set(activePlanKeys(entitlements))
  const plans = (await getPurchasablePlans()).filter(plan => !held.has(plan.plan_key))

  return <BillingClient entitlements={entitlements} plans={plans} />
}
