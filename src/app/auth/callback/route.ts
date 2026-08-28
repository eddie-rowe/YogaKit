import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { safeNextPath } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/server'

// PKCE / OAuth callback (contracts/auth-flows.md). Never surface the raw
// Supabase error to the client — a generic error code only.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(new URL('/auth/sign-in?error=missing_code', origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/auth/sign-in?error=auth_failed', origin))
  }

  return NextResponse.redirect(new URL(next, origin))
}
