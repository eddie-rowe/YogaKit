#!/usr/bin/env node
// Seeds the Stripe *sandbox* with the Products and Prices that
// supabase/migrations/20261012120000_seed_plan_features.sql names (T060).
//
// Why a script and not a one-off dashboard click: `plan_features` lives in a
// migration, so the Stripe side has to be reproducible too, or the two drift and
// `checkout/route.ts` starts returning `unknown_plan` for a plan the database
// swears exists. Anyone rebuilding the sandbox runs this.
//
// REFUSES TO RUN against a live key. Test mode only, by assertion, not by
// convention — see assertTestMode below.
//
// Idempotent: matches an existing Price by `lookup_key` and leaves it alone.
// Stripe Prices are immutable, so changing an amount means creating a new Price
// and transferring the lookup_key, which this script does NOT do silently —
// it reports the mismatch and exits non-zero so the change is deliberate.
//
//   node scripts/stripe/seed-sandbox-plans.mjs            # apply
//   node scripts/stripe/seed-sandbox-plans.mjs --dry-run  # report only

import Stripe from 'stripe'

// `org_seat` is deliberately absent. It is in plan_features because a seat
// grants real features, but an organization provisions it — it is not something
// a person buys for themselves. Withholding a self-serve Price is exactly how
// src/lib/stripe/plans.ts learns that, so adding one here would put an
// unbuyable plan on the billing page.
//
// PLACEHOLDER AMOUNT. Nothing in the specs, the constitution or the issues
// states a price for `pro`; $12/month is a stand-in so checkout is exercisable
// end to end. Changing it is a product decision, and because Prices are
// immutable it needs the lookup_key moved to a new Price — see the header.
const PLANS = [
  {
    plan_key: 'pro',
    product_name: 'Krama Pro',
    product_description: 'Composing and cloud sync for an individual teacher.',
    unit_amount: 1200,
    currency: 'usd',
    interval: 'month',
  },
]

function assertTestMode(key) {
  if (!key) {
    console.error('STRIPE_SECRET_KEY is unset. Source .env.local first:')
    console.error('  set -a && . ./.env.local && set +a')
    process.exit(1)
  }
  if (!key.startsWith('sk_test_')) {
    console.error('REFUSING: STRIPE_SECRET_KEY is not a test key (expected sk_test_…).')
    console.error('This script creates Products and Prices and must never touch live mode.')
    process.exit(1)
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  assertTestMode(process.env.STRIPE_SECRET_KEY)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  let drift = 0

  for (const plan of PLANS) {
    const found = await stripe.prices.list({ lookup_keys: [plan.plan_key], active: true, limit: 1 })
    const existing = found.data[0]

    if (existing) {
      const same =
        existing.unit_amount === plan.unit_amount &&
        existing.currency === plan.currency &&
        existing.recurring?.interval === plan.interval
      if (same) {
        console.log(`OK    ${plan.plan_key}: price ${existing.id} already matches`)
      } else {
        drift += 1
        console.error(
          `DRIFT ${plan.plan_key}: price ${existing.id} is ` +
            `${existing.unit_amount} ${existing.currency}/${existing.recurring?.interval}, ` +
            `script wants ${plan.unit_amount} ${plan.currency}/${plan.interval}. ` +
            'Stripe Prices are immutable — create a new Price and move the lookup_key by hand.',
        )
      }
      continue
    }

    if (dryRun) {
      console.log(`WOULD CREATE ${plan.plan_key}: ${plan.unit_amount} ${plan.currency}/${plan.interval}`)
      continue
    }

    const product = await stripe.products.create({
      name: plan.product_name,
      description: plan.product_description,
      metadata: { plan_key: plan.plan_key },
    })
    const price = await stripe.prices.create({
      product: product.id,
      lookup_key: plan.plan_key,
      unit_amount: plan.unit_amount,
      currency: plan.currency,
      recurring: { interval: plan.interval },
      metadata: { plan_key: plan.plan_key },
    })
    console.log(
      `CREATED ${plan.plan_key}: product ${product.id}, price ${price.id} ` +
        `(${plan.unit_amount} ${plan.currency}/${plan.interval})`,
    )
  }

  if (drift > 0) {
    console.error(`\n${drift} price(s) drifted from this script. Nothing was changed for those.`)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('FAILED:', error.message)
  process.exit(1)
})
