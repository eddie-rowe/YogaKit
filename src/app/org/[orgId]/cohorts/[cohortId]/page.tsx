import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import CohortRosterClient from './CohortRosterClient'

interface PageProps {
  params: Promise<{ orgId: string; cohortId: string }>
}

export const dynamic = 'force-dynamic'

export default async function CohortRosterPage({ params }: PageProps) {
  const { orgId, cohortId } = await params
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    redirect(`/auth/sign-in?next=/org/${orgId}/cohorts/${cohortId}`)
  }

  return <CohortRosterClient orgId={orgId} cohortId={cohortId} />
}
