'use client'

import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { Section } from './Section'

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

export default function ProfileSection({
  displayName,
  timezone,
}: {
  displayName: string
  timezone: string
}) {
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

    // Mirror the name into user_metadata. The header avatar derives its initials
    // from there rather than reading `profiles` on every page load, so without
    // this write an edited name would leave the monogram showing whatever Google
    // supplied at signup. Non-fatal: the profile row is the record of truth, and
    // stale initials are not worth failing a successful save over.
    if (!error) {
      await supabase.auth.updateUser({ data: { full_name: name.trim() } })
    }

    setSaving(false)
    setStatus(error ? 'error' : 'saved')
  }

  return (
    <Section id="profile" title="Profile">
      <form data-testid="settings-profile-form" onSubmit={handleSave} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm">Display name</span>
          <input
            data-testid="settings-display-name-input"
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
            data-testid="settings-timezone-input"
            type="text"
            required
            value={zone}
            onChange={e => setZone(e.target.value)}
            className="kk-card block w-full px-4 py-3 text-sm"
          />
        </label>

        {detected && detected !== zone && (
          <button
            data-testid="settings-timezone-detect"
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
            data-testid="settings-profile-save"
            type="submit"
            disabled={saving || !dirty}
            className="kk-btn px-4 py-2 text-sm font-medium"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {status === 'saved' && (
            <span data-testid="settings-profile-saved" className="text-xs" style={{ color: 'var(--muted)' }}>
              Saved.
            </span>
          )}
          {status === 'error' && (
            <span data-testid="settings-profile-error" className="text-xs">
              That didn’t save. Try again.
            </span>
          )}
        </div>
      </form>
    </Section>
  )
}
