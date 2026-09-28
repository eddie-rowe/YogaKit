import 'server-only'
import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'

// The repo's first real caller of app_entitlements() (T014,
// contracts/entitlements-api.md, 20260826224205_entitlements_billing.sql:123-181).
// Nothing else in the codebase queries this RPC today — the plan that shipped
// this feature flagged that as the riskiest open assumption, so keep this
// module small enough that a reviewer can judge the shape in isolation.
//
// NOTE on drift from the contract's illustrative response shape: the
// contract sketches `{ user_id, active, sources, features }`. The function as
// shipped returns the raw union instead — `{ subscriptions, seat_assignments,
// entitlement_grants }`, one array per source table, nothing derived. This
// module types what the RPC actually returns rather than the aspirational
// shape; deriving `active`/`features` is left to callers via
// `hasActiveEntitlement`/`activeFeatureKeys` below rather than baked into the
// RPC, so fixing the shape later (if ever) doesn't require an app-layer
// rewrite.

export interface EntitlementSubscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  plan_key: string
  status: string
  current_period_end: string
  created_at: string
}

export interface EntitlementSeatAssignment {
  id: string
  org_id: string
  user_id: string
  plan_key: string
  created_at: string
}

export interface EntitlementGrant {
  id: string
  user_id: string
  source: string
  source_ref: string | null
  starts_at: string
  ends_at: string
  created_at: string
}

export interface Entitlements {
  subscriptions: EntitlementSubscription[]
  seat_assignments: EntitlementSeatAssignment[]
  entitlement_grants: EntitlementGrant[]
}

async function resolveEntitlements(userId: string): Promise<Entitlements> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('app_entitlements', { user_id: userId })

  // insufficient_privilege (the escalation trap, research.md item 6) is a caller
  // bug, not a state a UI should try to recover from — surface it rather than
  // swallowing it into an empty result, which would read as "no entitlement"
  // instead of "you asked for the wrong user".
  if (error) throw error

  return data as unknown as Entitlements
}

// Per-request memoization (contracts/entitlements-api.md: "a single request
// only pays for one round trip regardless of how many components ask"). This
// is deliberately the only place in the repo using React's `cache()` — see
// the module comment above. It never persists across requests, and it is
// never the enforcement layer: Postgres RLS and this RPC's own escalation
// guard are authoritative regardless of whether a caller reads through this
// cache or calls the RPC directly.
export const getEntitlements = cache(resolveEntitlements)

// Convenience read: "does this user have any live entitlement right now."
// Not itself an authorization check — see the open-data guarantee in
// contracts/entitlements-api.md: nothing in the pose library or a user's own
// flow is ever gated by this, ever.
export function hasActiveEntitlement(entitlements: Entitlements): boolean {
  return (
    entitlements.subscriptions.length > 0 ||
    entitlements.seat_assignments.length > 0 ||
    entitlements.entitlement_grants.length > 0
  )
}

// The set of plan_keys backing a user's current access, deduplicated. UI
// surfaces that need to render "which plan(s) grant this" read from here
// rather than re-deriving the union themselves.
export function activePlanKeys(entitlements: Entitlements): string[] {
  const keys = new Set<string>()
  for (const s of entitlements.subscriptions) keys.add(s.plan_key)
  for (const sa of entitlements.seat_assignments) keys.add(sa.plan_key)
  return [...keys]
}
