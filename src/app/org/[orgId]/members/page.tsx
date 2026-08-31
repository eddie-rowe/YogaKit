import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import OrgMembersClient from './OrgMembersClient'

interface PageProps {
  params: Promise<{ orgId: string }>
}

export default async function OrgMembersPage({ params }: PageProps) {
  const { orgId } = await params
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    redirect(`/auth/sign-in?next=/org/${orgId}/members`)
  }

  return <OrgMembersClient orgId={orgId} />
}
