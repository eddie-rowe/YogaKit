import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import AccountClient from './AccountClient'

// Force dynamic: same reasoning as org/new — no params to prerender, and
// calling createClient() -> getEnv() at build time would run before any real
// env vars exist.
export const dynamic = 'force-dynamic'

interface MembershipRow {
  id: string
  roles: string[]
  status: string
  organizations: { id: string; name: string; org_types: string[] } | null
}

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    redirect('/auth/sign-in?next=/account')
  }

  // Both reads run as the signed-in user, so RLS is what scopes them:
  // profiles_select_own returns at most this one row, and
  // memberships_select_co_member is further narrowed by user_id to just theirs.
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('display_name, timezone').eq('id', userData.user.id).maybeSingle(),
    supabase
      .from('memberships')
      .select('id, roles, status, organizations (id, name, org_types)')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: true }),
  ])

  return (
    <AccountClient
      email={userData.user.email ?? ''}
      displayName={profile?.display_name ?? ''}
      timezone={profile?.timezone ?? ''}
      memberships={(memberships ?? []) as unknown as MembershipRow[]}
    />
  )
}
