import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import AcceptInvitationClient from './AcceptInvitationClient'

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function AcceptInvitationPage({ searchParams }: PageProps) {
  const { token } = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    // Preserve the token across the sign-in round trip — losing it here would
    // strand the invitee with no way back to their invitation.
    const next = token
      ? `/org/invitations/accept?token=${encodeURIComponent(token)}`
      : '/org/invitations/accept'
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`)
  }

  return (
    <Suspense>
      <AcceptInvitationClient />
    </Suspense>
  )
}
