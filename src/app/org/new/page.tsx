import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import OrgNewClient from './OrgNewClient'

// src/proxy.ts only refreshes the session cookie, it does not gate routes
// (src/proxy.ts's own comment) — every protected page does its own check.
export default async function OrgNewPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    redirect('/auth/sign-in?next=/org/new')
  }

  return <OrgNewClient />
}
