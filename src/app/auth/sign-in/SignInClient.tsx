'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'That sign-in link was incomplete. Please try again.',
  auth_failed: 'That sign-in link no longer works. Please try again.',
  link_expired: 'That link has expired. Please request a new one.',
}

export default function SignInClient() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')
  const next = searchParams.get('next')

  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    const supabase = createClient()
    const redirectTo = new URL('/auth/callback', window.location.origin)
    if (next) redirectTo.searchParams.set('next', next)

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo.toString() },
    })
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)

    const supabase = createClient()
    const emailRedirectTo = new URL('/auth/confirm', window.location.origin)
    if (next) emailRedirectTo.searchParams.set('next', next)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: emailRedirectTo.toString() },
    })

    setSubmitting(false)
    if (error) {
      setFormError('Could not send that email. Please check the address and try again.')
      return
    }
    setOtpSent(true)
  }

  return (
    <div className="kk-page">
      <div className="max-w-sm mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Sign in</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Your practice stays yours — signing in just keeps it in sync.
          </p>
        </div>

        {errorCode && (
          <div data-testid="auth-error" className="kk-card px-4 py-3 text-sm">
            {ERROR_MESSAGES[errorCode] ?? 'Something went wrong. Please try again.'}
          </div>
        )}

        <button
          data-testid="auth-sign-in-google"
          type="button"
          onClick={handleGoogleSignIn}
          className="kk-btn block w-full text-center px-4 py-3 font-medium"
        >
          Continue with Google
        </button>

        <div className="text-xs font-semibold uppercase tracking-widest text-center" style={{ color: 'var(--muted)' }}>
          or
        </div>

        {otpSent ? (
          <p data-testid="auth-otp-sent" className="text-sm">
            Check your email for a sign-in link.
          </p>
        ) : (
          <form data-testid="auth-email-form" onSubmit={handleEmailSubmit} className="space-y-3">
            <input
              data-testid="auth-email-input"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="kk-card block w-full px-4 py-3 text-sm"
            />
            {formError && <p className="text-sm">{formError}</p>}
            <button
              data-testid="auth-sign-in-email"
              type="submit"
              disabled={submitting}
              className="kk-btn block w-full text-center px-4 py-3 font-medium"
            >
              {submitting ? 'Sending…' : 'Continue with email'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
