'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'
import { clearAllFlows } from '@/lib/storage/flow-store'

// 002 shipped sign-in but no way back out: there was no sign-out control anywhere
// in the app (docs/design-research/16-auth-onboarding.md,
// docs/design-research/20-navigation-information-architecture.md).
//
// This is a standalone header element rather than a sixth NAV_LINKS entry on
// purpose — 005 collapses the nav from five tabs to three, and an account
// affordance living in that array would be collapsed along with it.

/** Supabase throws when its env vars are absent. The read view must render with
 *  no account and no network (RULE-L3/L4), so a missing client degrades to "no
 *  account UI" rather than taking the page down. */
function tryCreateClient(): SupabaseClient | null {
  try {
    return createClient()
  } catch {
    return null
  }
}

export default function AccountMenu() {
  // Created once, lazily: with no client there is no session to wait for, so
  // `resolved` starts true rather than being flipped from inside the effect.
  const [supabase] = useState(tryCreateClient)
  const [email, setEmail] = useState<string | null>(null)
  const [resolved, setResolved] = useState(supabase === null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!supabase) return

    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      setEmail(data.user?.email ?? null)
      setResolved(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
      setResolved(true)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase?.auth.signOut()
    } finally {
      // Always drop the local cache, even if the sign-out request itself failed
      // offline. The IndexedDB flows outlive the session, so leaving them behind
      // hands the next person on a shared device the previous user's practice
      // (specs/004-sequencing-composer UX-011, docs/design-research/18-*.md).
      await clearAllFlows()
      window.location.assign('/')
    }
  }

  // Render nothing until the session is known — flashing "Sign in" at an
  // already-signed-in user is worse than a beat of empty space.
  if (!resolved) return null

  if (!email) {
    return (
      <Link
        href="/auth/sign-in"
        data-testid="account-sign-in"
        className="text-sm px-3 py-1.5 rounded-md transition-colors duration-150"
        style={{ color: 'var(--muted)' }}
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* The only navigational path to /account, and through it to any /org/*
          route — those are otherwise reachable only by typing a URL. */}
      <Link
        href="/account"
        data-testid="account-email"
        className="hidden sm:inline text-xs max-w-[12rem] truncate transition-colors duration-150"
        style={{ color: 'var(--muted)' }}
        title={`${email} — account settings`}
      >
        {email}
      </Link>
      <button
        type="button"
        data-testid="account-sign-out"
        onClick={handleSignOut}
        disabled={signingOut}
        className="kk-btn-outline px-2.5 py-1 text-xs"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  )
}
