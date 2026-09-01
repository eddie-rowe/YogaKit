import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import SettingsClient, { type Membership } from './SettingsClient'

// Force dynamic: same reasoning as org/new — no params to prerender, and calling
// createClient() -> getEnv() at build time would run before any real env vars
// exist. src/proxy.ts only refreshes the session cookie; every protected page
// does its own check.
export const dynamic = 'force-dynamic'

/** Which roles make the studio section relevant. Read off the memberships we
 *  already fetched rather than a second query — the roles array is right there. */
const STUDIO_ROLES = ['owner', 'admin']

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    redirect('/auth/sign-in?next=/settings')
  }

  // Both reads run as the signed-in user, so RLS is what scopes them:
  // profiles_select_own returns at most this one row, and
  // memberships_select_co_member is further narrowed by user_id to just theirs.
  const [{ data: profile }, { data: membershipRows }] = await Promise.all([
    supabase.from('profiles').select('display_name, timezone').eq('id', userData.user.id).maybeSingle(),
    supabase
      .from('memberships')
      .select('id, roles, status, organizations (id, name, org_types)')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: true }),
  ])

  const memberships = (membershipRows ?? []) as unknown as Membership[]

  return (
    <SettingsClient
      email={userData.user.email ?? ''}
      provider={userData.user.app_metadata?.provider ?? 'email'}
      displayName={profile?.display_name ?? ''}
      timezone={profile?.timezone ?? ''}
      memberships={memberships}
      isStudioLead={memberships.some(m => m.roles?.some(role => STUDIO_ROLES.includes(role)))}
    />
  )
}
