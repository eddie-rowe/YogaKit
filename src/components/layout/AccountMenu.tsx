'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Dialog from '@radix-ui/react-dialog'
import type { SupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'
import { clearSyncedFlows } from '@/lib/storage/flow-store'
import { deriveInitials } from '@/lib/identity/initials'

// The signed-in indicator. Before this, the only evidence of a session was a
// truncated email marked `hidden sm:inline` — so at 390px, the width every
// Playwright walk runs at, a signed-in practitioner saw a lone "Sign out" button
// and no identity at all.
//
// A standalone header element rather than a sixth NAV_LINKS entry, on purpose:
// 005 collapses that array from five tabs to three (FR-062) and puts the avatar
// beside it (FR-063), so an account affordance living inside the array would be
// collapsed along with it.
//
// Initials, never an image. Google hands us an `avatar_url`, and using it would
// mean a googleusercontent.com request on every page load and a blank circle
// offline — for a tool whose whole premise is that it works at 6am with no
// network (RULE-L3/L4). 005 FR-064 wants the initials placeholder anyway.

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

type Identity = { email: string; name: string | null }

/** The same precedence as `app_handle_new_user()` in
 *  supabase/migrations/20260831190000_profile_bootstrap.sql, so the initials here
 *  match `profiles.display_name` without a database read on every page load.
 *  Editing the name in /settings writes back to `user_metadata` to keep the two
 *  in step. */
function readIdentity(user: { email?: string; user_metadata?: Record<string, unknown> } | null): Identity | null {
  if (!user?.email) return null
  const meta = user.user_metadata ?? {}
  const name = [meta.full_name, meta.name].find(v => typeof v === 'string' && v.trim() !== '')
  return { email: user.email, name: typeof name === 'string' ? name.trim() : null }
}

const AVATAR_PX = 36

export default function AccountMenu() {
  // Created once, lazily: with no client there is no session to wait for, so
  // `resolved` starts true rather than being flipped from inside the effect.
  const [supabase] = useState(tryCreateClient)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [resolved, setResolved] = useState(supabase === null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!supabase) return

    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      setIdentity(readIdentity(data.user))
      setResolved(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIdentity(readIdentity(session?.user ?? null))
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
      // Runs even when the network sign-out fails offline. Only account-derived
      // flows go: work authored on this device has no other copy, and destroying
      // it would break RULE-L4 (see clearSyncedFlows).
      await clearSyncedFlows()
      window.location.assign('/')
    }
  }

  // A neutral circle rather than `null` while the session resolves. Rendering
  // nothing shifts the header the moment it arrives; rendering "Sign in" flashes
  // it at someone who is already signed in.
  if (!resolved) {
    return (
      <div className="p-1" data-testid="account-avatar-pending" aria-hidden="true">
        <div
          style={{
            width: AVATAR_PX,
            height: AVATAR_PX,
            borderRadius: 999,
            background: 'var(--border)',
          }}
        />
      </div>
    )
  }

  if (!identity) {
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

  const initials = deriveInitials(identity.name, identity.email)

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          {/* p-1 around a 36px circle clears the 44px touch target the nav tabs
              meet (005 FR-063) without making the monogram itself look heavy. */}
          <button
            type="button"
            data-testid="account-avatar"
            aria-label={`Account — ${identity.email}`}
            className="p-1 rounded-full kk-nocallout transition-opacity duration-150 hover:opacity-80"
          >
            <span
              className="flex items-center justify-center text-xs font-medium"
              style={{
                width: AVATAR_PX,
                height: AVATAR_PX,
                borderRadius: 999,
                background: 'var(--accent)',
                color: 'var(--accent-foreground)',
              }}
            >
              {initials}
            </span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            data-testid="account-menu"
            align="end"
            sideOffset={6}
            className="kk-menu"
          >
            <DropdownMenu.Label className="px-3 py-2">
              {identity.name && (
                <span
                  data-testid="account-menu-name"
                  className="block text-sm font-medium truncate"
                  style={{ color: 'var(--foreground)' }}
                >
                  {identity.name}
                </span>
              )}
              <span
                data-testid="account-menu-email"
                className="block text-xs truncate"
                style={{ color: 'var(--muted)' }}
              >
                {identity.email}
              </span>
            </DropdownMenu.Label>

            <DropdownMenu.Separator className="kk-menu-separator" />

            <DropdownMenu.Item asChild>
              <Link href="/settings" data-testid="account-menu-settings" className="kk-menu-item">
                Settings
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="kk-menu-separator" />

            {/* preventDefault keeps the menu from unmounting before the confirm
                dialog mounts — without it Radix closes the menu and the dialog
                never gets a chance to take focus. */}
            <DropdownMenu.Item
              data-testid="account-menu-sign-out"
              className="kk-menu-item"
              onSelect={event => {
                event.preventDefault()
                setConfirmOpen(true)
              }}
            >
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="kk-overlay-backdrop fixed inset-0 z-40" style={{ background: 'rgb(0 0 0 / 0.4)' }} />
          <Dialog.Content
            data-testid="account-sign-out-dialog"
            className="kk-overlay-panel kk-card fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 p-5"
          >
            <Dialog.Title className="text-base font-medium" style={{ color: 'var(--foreground)' }}>
              Sign out?
            </Dialog.Title>
            {/* No red, no warning styling: guardrails §2 allows one accent, and
                006 SC-004 holds the count there. Weight and plain words instead. */}
            <Dialog.Description className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              Flows synced to your account will be removed from this device. Anything you wrote
              here and haven&rsquo;t synced stays where it is.
            </Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" data-testid="account-sign-out-cancel" className="kk-btn-outline px-3 py-1.5 text-sm">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                data-testid="account-sign-out-confirm"
                onClick={handleSignOut}
                disabled={signingOut}
                className="kk-btn px-3 py-1.5 text-sm"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
