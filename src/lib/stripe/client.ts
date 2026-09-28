import 'server-only'

import Stripe from 'stripe'

import { getEnv } from '@/lib/env'

let cached: Stripe | undefined

// Single Stripe client, constructed lazily so a missing STRIPE_SECRET_KEY fails
// at first use with getEnv()'s loud error rather than at module-load time in
// every route that imports this file, including ones a given request doesn't
// exercise.
export function getStripeClient(): Stripe {
  if (cached) return cached
  const env = getEnv()
  cached = new Stripe(env.STRIPE_SECRET_KEY)
  return cached
}
