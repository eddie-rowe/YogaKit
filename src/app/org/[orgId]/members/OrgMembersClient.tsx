'use client'

import { useCallback, useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

interface Member {
  membershipId: string
  userId: string
  roles: string[]
  status: string
  displayName: string
}

interface OrgMembersClientProps {
  orgId: string
}

export default function OrgMembersClient({ orgId }: OrgMembersClientProps) {
  const [orgName, setOrgName] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('student')
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    const supabase = createClient()

    const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).single()
    setOrgName(org?.name ?? null)

    // Two queries, never a join against `profiles` directly (docs/design/002-schema.md
    // §B) — profile_cards is the only identity data a co-member may read.
    const { data: memberships } = await supabase
      .from('memberships')
      .select('id, user_id, roles, status')
      .eq('org_id', orgId)

    const userIds = (memberships ?? []).map(m => m.user_id)
    const { data: cards } = userIds.length
      ? await supabase.from('profile_cards').select('user_id, display_name').in('user_id', userIds)
      : { data: [] }

    const nameByUserId = new Map((cards ?? []).map(c => [c.user_id, c.display_name]))

    setMembers(
      (memberships ?? []).map(m => ({
        membershipId: m.id,
        userId: m.user_id,
        roles: m.roles,
        status: m.status,
        displayName: nameByUserId.get(m.user_id) ?? 'Member',
      })),
    )
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault()
    setInviting(true)
    setInviteMessage(null)

    const response = await fetch('/api/org/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, email: inviteEmail, roles: [inviteRole] }),
    })

    setInviting(false)

    if (!response.ok) {
      setInviteMessage('Could not send that invitation. Please try again.')
      return
    }

    setInviteMessage(`Invitation sent to ${inviteEmail}.`)
    setInviteEmail('')
  }

  return (
    <div className="kk-page">
      <div className="max-w-sm mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold">{orgName ?? 'Organization'}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Members
          </p>
        </div>

        {loading ? (
          <p className="text-sm">Loading…</p>
        ) : (
          <ul data-testid="org-members-list" className="space-y-2">
            {members.map(member => (
              <li key={member.membershipId} data-testid="org-member-row" className="kk-card px-4 py-3 text-sm">
                <div className="font-medium">{member.displayName}</div>
                <div style={{ color: 'var(--muted)' }}>
                  {member.roles.join(', ')} · {member.status}
                </div>
              </li>
            ))}
          </ul>
        )}

        <form data-testid="org-invite-form" onSubmit={handleInvite} className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">Invite someone</h2>
          <input
            data-testid="org-invite-email-input"
            type="email"
            required
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            className="kk-card block w-full px-4 py-3 text-sm"
          />
          <select
            data-testid="org-invite-role-select"
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="kk-card block w-full px-4 py-3 text-sm"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
          {inviteMessage && (
            <p data-testid="org-invite-message" className="text-sm">
              {inviteMessage}
            </p>
          )}
          <button
            data-testid="org-invite-submit"
            type="submit"
            disabled={inviting}
            className="kk-btn block w-full text-center px-4 py-3 font-medium"
          >
            {inviting ? 'Sending…' : 'Send invitation'}
          </button>
        </form>
      </div>
    </div>
  )
}
