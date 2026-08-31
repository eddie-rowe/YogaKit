import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import OrgNewClient from './OrgNewClient'

// src/proxy.ts only refreshes the session cookie, it does not gate routes
// (src/proxy.ts's own comment) — every protected page does its own check.
//
// Force dynamic: this route has no params, so Next.js would otherwise try to
// statically prerender it at build time, calling createClient() -> getEnv()
// before any real env vars exist in the build environment.
export const dynamic = 'force-dynamic'

export default async function OrgNewPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    redirect('/auth/sign-in?next=/org/new')
  }

  return <OrgNewClient />
}
