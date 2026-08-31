'use client'

import { useState } from 'react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'

interface Membership {
  id: string
  roles: string[]
  status: string
  organizations: { id: string; name: string; org_types: string[] } | null
}

interface Props {
  email: string
  displayName: string
  timezone: string
  memberships: Membership[]
}

// The signed-in surface 002 never got. Without it the only authenticated UI is
// the header email, every /org/* route has to be typed by hand, and the
// display_name the signup trigger derived from Google (or from an email local
// part) is unchangeable — which makes an approximation permanent.

/** The browser knows the zone the person is actually practising in; the signup
 *  trigger, running server-side before any page loads, does not — it writes
 *  'UTC'. Offering the real one as a one-click fix beats a free-text field the
 *  person has to spell an IANA name into. */
function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

export default function AccountClient({ email, displayName, timezone, memberships }: Props) {
  const [name, setName] = useState(displayName)
  const [zone, setZone] = useState(timezone)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const detected = browserTimezone()
  const dirty = name.trim() !== displayName || zone.trim() !== timezone

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setStatus('idle')

    const supabase = createClient()
    // profiles_update_own already scopes this to the caller's own row, so the
    // update needs no explicit id filter beyond what RLS enforces — but pass
    // one anyway: a policy is the guarantee, not the intent.
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name.trim(), timezone: zone.trim() })
      .eq('id', userData.user?.id ?? '')

    setSaving(false)
    setStatus(error ? 'error' : 'saved')
  }

  return (
    <div className="kk-page">
      <div className="max-w-lg mx-auto px-4 py-10 space-y-10">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Account</h1>
          <p data-testid="account-page-email" className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {email}
          </p>
        </div>

        <form data-testid="account-profile-form" onSubmit={handleSave} className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Profile
          </h2>

          <label className="block space-y-1">
            <span className="text-sm">Display name</span>
            <input
              data-testid="account-display-name-input"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="kk-card block w-full px-4 py-3 text-sm"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm">Time zone</span>
            <input
              data-testid="account-timezone-input"
              type="text"
              required
              value={zone}
              onChange={e => setZone(e.target.value)}
              className="kk-card block w-full px-4 py-3 text-sm"
            />
          </label>

          {detected && detected !== zone && (
            <button
              data-testid="account-timezone-detect"
              type="button"
              onClick={() => setZone(detected)}
              className="text-xs underline"
              style={{ color: 'var(--muted)' }}
            >
              Use {detected}, detected from this device
            </button>
          )}

          <div className="flex items-center gap-3">
            <button
              data-testid="account-profile-save"
              type="submit"
              disabled={saving || !dirty}
              className="kk-btn px-4 py-2 text-sm font-medium"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {status === 'saved' && (
              <span data-testid="account-profile-saved" className="text-xs" style={{ color: 'var(--muted)' }}>
                Saved.
              </span>
            )}
            {status === 'error' && (
              <span data-testid="account-profile-error" className="text-xs">
                That didn’t save. Try again.
              </span>
            )}
          </div>
        </form>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Organizations
          </h2>

          {memberships.length === 0 ? (
            <p data-testid="account-orgs-empty" className="text-sm" style={{ color: 'var(--muted)' }}>
              You aren’t part of an organization yet. Practising on your own needs no
              organization — one is for teaching a school, studio, or cohort.
            </p>
          ) : (
            <div data-testid="account-orgs-list" className="space-y-2">
              {memberships.map(m =>
                m.organizations ? (
                  <Link
                    key={m.id}
                    data-testid={`account-org-${m.organizations.id}`}
                    href={`/org/${m.organizations.id}/members`}
                    className="kk-card px-3 py-2.5 flex items-center justify-between gap-2"
                  >
                    <span className="text-sm font-medium">{m.organizations.name}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {m.roles.join(', ')}
                      {m.status !== 'active' && ` · ${m.status}`}
                    </span>
                  </Link>
                ) : null,
              )}
            </div>
          )}

          <Link
            data-testid="account-org-new"
            href="/org/new"
            className="kk-btn-outline inline-block px-3 py-1.5 text-sm"
          >
            Create an organization
          </Link>
        </div>
      </div>
    </div>
  )
}
