import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import OrgMembersClient from './OrgMembersClient'

interface PageProps {
  params: Promise<{ orgId: string }>
}

// Force dynamic: same reasoning as org/new and org/invitations/accept — this
// page must never be prerendered against build-time env, and every orgId is
// user data anyway, so there is nothing worth statically generating.
export const dynamic = 'force-dynamic'

export default async function OrgMembersPage({ params }: PageProps) {
  const { orgId } = await params
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    redirect(`/auth/sign-in?next=/org/${orgId}/members`)
  }

  return <OrgMembersClient orgId={orgId} />
}
