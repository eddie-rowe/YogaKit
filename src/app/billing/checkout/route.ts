import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripeClient } from '@/lib/stripe/client'
import { logger } from '@/lib/utils/logger'

interface CheckoutBody {
  plan_key?: string
}

// POST /billing/checkout — contracts/billing-webhooks.md "POST /billing/checkout".
// plan_key resolves to a Stripe Price through that Price's lookup_key, not
// through a locally-maintained price-id map — the same field
// src/lib/stripe/handle-event.ts reads back off the subscription later, so
// there is one source of truth for "what plan_key means" instead of two maps
// that can drift. plan_features is the gate: unknown_plan whenever no row
// names plan_key, which today is every plan_key — T060 (seeding the launch
// tier) is an explicit, separate owner decision, not something this route
// can invent a default for.
export async function POST(request: NextRequest) {
  let body: CheckoutBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const planKey = body.plan_key
  if (!planKey) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const user = userData.user

  const { data: planFeatureRows } = await supabase.from('plan_features').select('plan_key').eq('plan_key', planKey)
  if (!planFeatureRows || planFeatureRows.length === 0) {
    return NextResponse.json({ error: 'unknown_plan' }, { status: 400 })
  }

  const stripe = getStripeClient()
  const prices = await stripe.prices.list({ lookup_keys: [planKey], active: true, limit: 1 })
  const price = prices.data[0]
  if (!price) {
    // plan_features named it, Stripe doesn't have a matching Price yet —
    // still unknown_plan from the caller's point of view, not a 500: this is
    // a configuration gap, not an unexpected failure.
    logger.error('billing.checkout.price_not_found', { plan_key: planKey })
    return NextResponse.json({ error: 'unknown_plan' }, { status: 400 })
  }

  // stripe_customers has no insert policy for `authenticated` — written only
  // by trusted server code (this route, the webhook handler), never
  // directly by a client request.
  const service = createServiceClient()
  const { data: existingCustomer } = await service
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let stripeCustomerId = existingCustomer?.stripe_customer_id
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    })
    stripeCustomerId = customer.id

    const { error: insertError } = await service
      .from('stripe_customers')
      .insert({ user_id: user.id, stripe_customer_id: stripeCustomerId })
    if (insertError) {
      logger.error('billing.checkout.customer_persist_failed', { plan_key: planKey }, insertError)
      return NextResponse.json({ error: 'checkout_failed' }, { status: 500 })
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    client_reference_id: user.id,
    line_items: [{ price: price.id, quantity: 1 }],
    subscription_data: { metadata: { plan_key: planKey, user_id: user.id } },
    success_url: new URL('/billing?checkout=success', request.url).toString(),
    cancel_url: new URL('/billing?checkout=cancelled', request.url).toString(),
  })

  if (!session.url) {
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
