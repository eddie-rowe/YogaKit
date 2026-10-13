import 'server-only'

import { getStripeClient } from '@/lib/stripe/client'
import { getPlanFeatures, type PlanFeature } from '@/lib/entitlements'
import { logger } from '@/lib/utils/logger'

export interface PurchasablePlan {
  plan_key: string
  /** Smallest currency unit, as Stripe reports it (e.g. 1200 = $12.00). */
  unit_amount: number
  currency: string
  /** `month` | `year` | whatever Stripe's recurring.interval says. */
  interval: string
  feature_keys: string[]
}

// Which plans a person can buy for themselves, and what each costs.
//
// Purchasability is NOT a column and NOT a constant in this file. A plan is
// self-serve exactly when `plan_features` names it AND Stripe has an active
// Price whose `lookup_key` matches that plan_key. That is already the test
// `src/app/billing/checkout/route.ts` applies (plan_features gate at :41,
// lookup_key gate at :46), so deriving the UI from the same two facts means a
// button can never offer something checkout would then reject with
// `unknown_plan`.
//
// It also keeps "features as data" honest (docs/design/002-schema.md:189-190):
// `org_seat` is in plan_features because a seat grants real features, but it has
// no self-serve Price because an organization provisions it, not the seat
// holder. Withholding the Price is how that is expressed — no code change, no
// extra column, and nothing here has to know *why* a plan is not self-serve.
export async function getPurchasablePlans(): Promise<PurchasablePlan[]> {
  let planFeatures: PlanFeature[]
  try {
    planFeatures = await getPlanFeatures()
  } catch (error) {
    // plan_features is readable by any authenticated user, so a failure here is
    // infrastructural. The billing page still renders its current-state cards;
    // it just cannot offer a purchase, which is the safe direction to fail.
    logger.error('billing.plans.features_read_failed', {}, error as Error)
    return []
  }

  const planKeys = [...new Set(planFeatures.map(row => row.plan_key))]
  if (planKeys.length === 0) return []

  const stripe = getStripeClient()
  const plans: PurchasablePlan[] = []

  for (const planKey of planKeys) {
    try {
      const prices = await stripe.prices.list({ lookup_keys: [planKey], active: true, limit: 1 })
      const price = prices.data[0]
      // No active Price for this lookup_key means not self-serve. Expected for
      // `org_seat`; not an error, and deliberately not logged as one.
      if (!price || price.unit_amount === null || !price.recurring) continue

      plans.push({
        plan_key: planKey,
        unit_amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring.interval,
        feature_keys: planFeatures
          .filter(row => row.plan_key === planKey)
          .map(row => row.feature_key)
          .sort(),
      })
    } catch (error) {
      logger.error('billing.plans.price_lookup_failed', { plan_key: planKey }, error as Error)
    }
  }

  return plans.sort((a, b) => a.unit_amount - b.unit_amount)
}
