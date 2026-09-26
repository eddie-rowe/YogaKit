import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe/client'

// POST /billing/portal — the "manage/cancel" link contracts/billing-webhooks.md's
// `GET /billing` section calls for, split into its own route so the page stays
// a server component. `stripe_customers_select_own` lets the signed-in user
// read their own row directly (RLS-respecting client), so this never needs
// the service-role client.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: customer } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!customer?.stripe_customer_id) {
    return NextResponse.json({ error: 'no_stripe_customer' }, { status: 404 })
  }

  const stripe = getStripeClient()
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id,
    return_url: new URL('/billing', request.url).toString(),
  })

  return NextResponse.json({ url: session.url })
}
