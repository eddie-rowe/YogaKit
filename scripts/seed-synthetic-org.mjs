#!/usr/bin/env node
// Seeds the synthetic test account with one organization it owns.
//
// WHY THIS EXISTS: production had zero rows in `organizations` and zero in
// `memberships`, so `syntheticstesting@gmail.com` could not exercise any
// owner/admin path at all. Every browser validation that touched one re-derived
// that as a fresh surprise and then gave up:
//
//   2026-10-12, PR #129: "Member/owner variants not browser-checkable
//                         (test account has no org)."
//   2026-10-17, PR #168: held auto/needs-human for "the owner-path studio block
//                         the synthetic account cannot perform".
//
// It also blocks 005/US3 entirely, since cohorts live under /org/[orgId]/.
//
// Goes through `app_create_organization` (20260826224201_identity_tenancy.sql:195)
// rather than inserting rows directly. That function is SECURITY DEFINER, derives
// both the org and the creator's owner membership from `auth.uid()`, and writes
// them in one transaction — so the fixture is exactly the shape the app produces.
// Direct inserts could drift from it, and a fixture that differs from real data
// is worse than no fixture.
//
// Because it reads `auth.uid()`, this MUST run as the signed-in user. The service
// key will not do: execute is revoked from public and granted only to
// `authenticated`, and a service-role call has no `auth.uid()`.
//
// WRITES TO PRODUCTION. Supabase branching is off, so there is no other project
// to write to. That is also why the org is named unmistakably, for the same
// reason the account is.
//
//   set -a && . ./.env.local && set +a
//   node scripts/seed-synthetic-org.mjs [--dry-run]

import { createClient } from '@supabase/supabase-js'

const ORG_NAME = 'Synthetics Testing Studio'
// `studio` is what PR #168's studio block keys off, and it is in the
// organizations_org_types_known CHECK (school | studio | certifying_body).
const ORG_TYPES = ['studio']

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`${name} is unset. Source .env.local first:`)
    console.error('  set -a && . ./.env.local && set +a')
    process.exit(1)
  }
  return value
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  const email = requireEnv('TESTING_EMAIL')
  const password = requireEnv('TESTING_PASSWORD')

  if (!email.startsWith('syntheticstesting')) {
    console.error(`REFUSING: TESTING_EMAIL is "${email}", not the synthetic account.`)
    console.error('This script creates production data and must only ever act as the test identity.')
    process.exit(1)
  }

  const supabase = createClient(url, anonKey)

  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) {
    console.error('Sign-in failed:', authError.message)
    process.exit(1)
  }
  const userId = auth.user.id
  console.log(`signed in as ${email} (${userId})`)

  // Idempotency: RLS scopes this to the caller's own memberships, so an existing
  // row here means this account already owns or belongs to an org. Creating a
  // second would leave the fixture ambiguous — which org should a test use? —
  // so stop rather than add one.
  const { data: existing, error: readError } = await supabase
    .from('memberships')
    .select('id, org_id, roles, status, organizations (name, org_types)')
  if (readError) {
    console.error('Could not read memberships:', readError.message)
    process.exit(1)
  }

  if (existing && existing.length > 0) {
    console.log(`already a member of ${existing.length} org(s) — nothing to do:`)
    for (const m of existing) {
      console.log(`   org_id=${m.org_id} roles=${JSON.stringify(m.roles)} status=${m.status} name=${m.organizations?.name ?? '?'}`)
    }
    return
  }

  if (dryRun) {
    console.log(`WOULD CREATE org "${ORG_NAME}" types=${JSON.stringify(ORG_TYPES)} with an owner membership`)
    return
  }

  const { data: org, error: rpcError } = await supabase.rpc('app_create_organization', {
    name: ORG_NAME,
    org_types: ORG_TYPES,
  })
  if (rpcError) {
    console.error('app_create_organization failed:', rpcError.message)
    process.exit(1)
  }

  console.log(`CREATED org ${org.id} "${org.name}" types=${JSON.stringify(org.org_types)}`)

  const { data: membership, error: verifyError } = await supabase
    .from('memberships')
    .select('org_id, roles, status')
    .eq('org_id', org.id)
    .single()
  if (verifyError) {
    console.error('Org created but membership read-back failed:', verifyError.message)
    process.exit(1)
  }
  if (!membership.roles?.includes('owner')) {
    console.error(`Org created but membership roles are ${JSON.stringify(membership.roles)}, expected to include "owner".`)
    process.exit(1)
  }
  console.log(`verified membership: roles=${JSON.stringify(membership.roles)} status=${membership.status}`)
}

main().catch(error => {
  console.error('FAILED:', error.message)
  process.exit(1)
})
