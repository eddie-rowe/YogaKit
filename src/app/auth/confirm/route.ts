import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

import { safeNextPath } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/server'

const KNOWN_TYPES: EmailOtpType[] = ['email', 'recovery', 'invite']

// Email OTP link confirmation (contracts/auth-flows.md). Deliberately calls
// verifyOtp, never exchangeCodeForSession — the wrong verifier fails silently
// here (research.md item 3).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNextPath(searchParams.get('next'))

  if (!tokenHash || !type || !KNOWN_TYPES.includes(type)) {
    return NextResponse.redirect(new URL('/auth/sign-in?error=link_expired', origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

  if (error) {
    return NextResponse.redirect(new URL('/auth/sign-in?error=link_expired', origin))
  }

  return NextResponse.redirect(new URL(next, origin))
}
