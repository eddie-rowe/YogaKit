import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'

import { createServiceClient } from '@/lib/supabase/service'
import { getStripeClient } from '@/lib/stripe/client'
import { getEnv } from '@/lib/env'
import { handleStripeEvent, type BillingStore } from '@/lib/stripe/handle-event'
import { logger } from '@/lib/utils/logger'

// Node runtime, not edge — Stripe's signature verification needs the raw
// request body and this route reaches Postgres via the service-role client.
export const runtime = 'nodejs'

function serviceBillingStore(service: ReturnType<typeof createServiceClient>): BillingStore {
  return {
    async getUserIdForStripeCustomer(stripeCustomerId) {
      const { data } = await service
        .from('stripe_customers')
        .select('user_id')
        .eq('stripe_customer_id', stripeCustomerId)
        .maybeSingle()
      return data?.user_id ?? null
    },
    async upsertSubscription(row) {
      const { error } = await service.from('subscriptions').upsert(row, { onConflict: 'stripe_subscription_id' })
      if (error) throw error
    },
  }
}

// POST /api/webhooks/stripe — contracts/billing-webhooks.md "POST
// /api/webhooks/stripe". Auth is Stripe's signature, not Supabase — this
// endpoint is intentionally unauthenticated in the app-session sense.
export async function POST(request: NextRequest) {
  // await req.text() must be first, never req.json() — Stripe's signature
  // covers the exact raw bytes, and any JSON round-trip can reorder or
  // reformat them enough to break verification.
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 })
  }

  const env = getEnv()
  const stripe = getStripeClient()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    logger.error('billing.webhook.signature_invalid', {}, err)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  const service = createServiceClient()

  // Claim-then-process idempotency (research.md item 8, FR-016, SC-005):
  // insert the claim first. A unique-violation (23505) means this
  // stripe_event_id was already processed — return 200 immediately, no
  // further action, so Stripe's at-least-once delivery is safe without a
  // separate lock.
  const { error: claimError } = await service
    .from('stripe_events')
    .insert({ stripe_event_id: event.id })
  if (claimError) {
    if (claimError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    logger.error('billing.webhook.claim_failed', { event_type: event.type }, claimError)
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 })
  }

  try {
    await handleStripeEvent(event, serviceBillingStore(service))
  } catch (err) {
    // Processing failed after the claim landed — delete the claim so the
    // retry Stripe sends next isn't a silent no-op against a row that
    // recorded a delivery this handler never actually completed.
    await service.from('stripe_events').delete().eq('stripe_event_id', event.id)
    logger.error('billing.webhook.handler_failed', { event_type: event.type }, err)
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
