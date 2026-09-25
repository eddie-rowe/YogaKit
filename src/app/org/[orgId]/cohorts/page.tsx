import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import CohortsListClient from './CohortsListClient'

interface PageProps {
  params: Promise<{ orgId: string }>
}

// Force dynamic: same reasoning as org/[orgId]/members/page.tsx — never
// prerendered against build-time env, orgId is always user data.
export const dynamic = 'force-dynamic'

export default async function CohortsPage({ params }: PageProps) {
  const { orgId } = await params
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    redirect(`/auth/sign-in?next=/org/${orgId}/cohorts`)
  }

  return <CohortsListClient orgId={orgId} />
}
