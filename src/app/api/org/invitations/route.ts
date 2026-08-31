import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { logger } from '@/lib/utils/logger'

interface CreateInvitationBody {
  org_id?: string
  email?: string
  roles?: string[]
}

// POST /api/org/invitations — contracts/org-membership-api.md "POST
// (application-level) — create invitation". The RPC does the authorization
// check and token generation (SECURITY DEFINER, since `invitations` has zero
// RLS policies); this handler only sends the resulting email and maps errors
// to a generic response, never leaking raw Postgres error text.
export async function POST(request: NextRequest) {
  let body: CreateInvitationBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const { org_id, email, roles } = body
  if (!org_id || !email || !roles || roles.length === 0) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .rpc('app_create_invitation', {
      target_org_id: org_id,
      target_email: email,
      target_roles: roles,
    })
    .single()

  if (error || !data) {
    // Postgres SQLSTATE '42501' is the insufficient_privilege class, the
    // errcode raised by app_create_invitation's authorization check.
    const status = error?.code === '42501' ? 403 : 400
    return NextResponse.json({ error: 'invitation_failed' }, { status })
  }

  const { raw_token, invitation_id } = data as { raw_token: string; invitation_id: string }

  const { data: org } = await supabase.from('organizations').select('name').eq('id', org_id).single()
  const acceptUrl = new URL('/org/invitations/accept', request.url)
  acceptUrl.searchParams.set('token', raw_token)

  try {
    await sendEmail({
      to: email,
      subject: `You're invited to join ${org?.name ?? 'an organization'} on Krama`,
      html: `<p>You've been invited to join <strong>${org?.name ?? 'an organization'}</strong> on Krama.</p>
<p><a href="${acceptUrl.toString()}">Accept the invitation</a></p>
<p>This link expires in 7 days.</p>`,
    })
  } catch (err) {
    logger.error('org.invitation.email_failed', {
      invitation_id,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'email_delivery_failed' }, { status: 502 })
  }

  return NextResponse.json({ invitation_id })
}
