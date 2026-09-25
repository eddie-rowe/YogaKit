import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getEntitlements } from '@/lib/entitlements'
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

  return <BillingClient entitlements={entitlements} />
}
