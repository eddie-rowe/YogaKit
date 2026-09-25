'use client'

import { useCallback, useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

type SupabaseClient = ReturnType<typeof createClient>

async function loadEnrollableMembers(
  supabase: SupabaseClient,
  orgId: string,
  enrolledUserIds: Set<string>,
): Promise<{ userId: string; displayName: string }[]> {
  const { data: memberships } = await supabase.from('memberships').select('user_id').eq('org_id', orgId)
  const candidateIds = (memberships ?? []).map(m => m.user_id).filter(id => !enrolledUserIds.has(id))
  if (candidateIds.length === 0) return []

  const { data: cards } = await supabase
    .from('profile_cards')
    .select('user_id, display_name')
    .in('user_id', candidateIds)
  return (cards ?? []).map(c => ({ userId: c.user_id, displayName: c.display_name }))
}

// Roster rows carry enrollment SIGNAL only — status, dates, who, and the
// share_signals flag itself — never a journal, reflection, or note column.
// That split is enforced by RLS (Principle VIII), but this component
// reinforces it by construction: the `select()` below only ever names
// signal columns, so there is nothing to accidentally render even if a
// future column were added to cohort_enrollments.
interface RosterEntry {
  enrollmentId: string
  userId: string
  status: string
  createdAt: string
  graduatedAt: string | null
  shareSignals: boolean
  displayName: string
}

interface OrgMemberOption {
  userId: string
  displayName: string
}

interface CohortRosterClientProps {
  orgId: string
  cohortId: string
}

export default function CohortRosterClient({ orgId, cohortId }: CohortRosterClientProps) {
  const [cohortName, setCohortName] = useState<string | null>(null)
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [rowMessages, setRowMessages] = useState<Record<string, string>>({})
  const [busyRows, setBusyRows] = useState<Record<string, boolean>>({})

  const [enrollableMembers, setEnrollableMembers] = useState<OrgMemberOption[]>([])
  const [enrollUserId, setEnrollUserId] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollMessage, setEnrollMessage] = useState<string | null>(null)

  const loadRoster = useCallback(() => {
    const supabase = createClient()

    return supabase.auth
      .getUser()
      .then(({ data }) => {
        setCurrentUserId(data.user?.id ?? null)
        return supabase.from('cohorts').select('name').eq('id', cohortId).single()
      })
      .then(({ data: cohort }) => {
        setCohortName(cohort?.name ?? null)
        return supabase
          .from('cohort_enrollments')
          .select('id, user_id, status, created_at, graduated_at, share_signals')
          .eq('cohort_id', cohortId)
      })
      .then(({ data: enrollments }) => {
        const enrolledUserIds = new Set((enrollments ?? []).map(e => e.user_id))
        return (
          enrolledUserIds.size
            ? supabase.from('profile_cards').select('user_id, display_name').in('user_id', [...enrolledUserIds])
            : Promise.resolve({ data: [] })
        ).then(({ data: cards }) => {
          const nameByUserId = new Map((cards ?? []).map(c => [c.user_id, c.display_name]))
          setRoster(
            (enrollments ?? []).map(e => ({
              enrollmentId: e.id,
              userId: e.user_id,
              status: e.status,
              createdAt: e.created_at,
              graduatedAt: e.graduated_at,
              shareSignals: e.share_signals,
              displayName: nameByUserId.get(e.user_id) ?? 'Student',
            })),
          )
          setLoading(false)

          // Every org member not already enrolled here is a candidate — no
          // separate invite step. cohort_enrollments_insert_authorized_role
          // is the actual gate; this list is just convenience. Kept out of
          // the roster promise chain above (rather than another .then())
          // to sidestep a Supabase type-inference clash between the two
          // shapes of `{ data }` fallback that chain was producing.
          return loadEnrollableMembers(supabase, orgId, enrolledUserIds).then(setEnrollableMembers)
        })
      })
  }, [cohortId, orgId])

  useEffect(() => {
    loadRoster()
  }, [loadRoster])

  async function handleEnroll(event: React.FormEvent) {
    event.preventDefault()
    setEnrolling(true)
    setEnrollMessage(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('cohort_enrollments')
      .insert({ cohort_id: cohortId, user_id: enrollUserId })

    setEnrolling(false)

    if (error) {
      setEnrollMessage(
        error.code === '42501'
          ? "Your role in this organization doesn't include enrolling students."
          : 'Could not enroll that member. Please try again.',
      )
      return
    }

    setEnrollMessage('Enrolled.')
    setEnrollUserId('')
    loadRoster()
  }

  async function handleGraduate(entry: RosterEntry) {
    setBusyRows(prev => ({ ...prev, [entry.enrollmentId]: true }))
    setRowMessages(prev => ({ ...prev, [entry.enrollmentId]: '' }))

    const supabase = createClient()
    // RLS-respecting client, never createServiceClient(): app_grant_ytt_completion
    // is granted to `authenticated` only, so this is the only path that can work.
    const { error } = await supabase.rpc('app_grant_ytt_completion', {
      cohort_id: cohortId,
      user_id: entry.userId,
    })

    setBusyRows(prev => ({ ...prev, [entry.enrollmentId]: false }))

    if (error) {
      setRowMessages(prev => ({
        ...prev,
        [entry.enrollmentId]:
          error.code === '42501'
            ? "Your role in this organization doesn't include marking a student graduated."
            : 'Could not mark that graduated. Please try again.',
      }))
      return
    }

    loadRoster()
  }

  // One interaction, no confirm dialog (Principle VII) — a student's own
  // enrollment row carries the control that flips share_signals. This
  // toggles cohort_enrollments.share_signals, which app_visible_student_ids()
  // reads: turning it off removes the student from a teacher's check-in
  // signal view immediately.
  async function handleToggleSharing(entry: RosterEntry) {
    setBusyRows(prev => ({ ...prev, [entry.enrollmentId]: true }))
    setRowMessages(prev => ({ ...prev, [entry.enrollmentId]: '' }))

    const supabase = createClient()
    const { error } = await supabase.rpc('app_revoke_signal_sharing', {
      enrollment_id: entry.enrollmentId,
    })

    setBusyRows(prev => ({ ...prev, [entry.enrollmentId]: false }))

    if (error) {
      setRowMessages(prev => ({
        ...prev,
        [entry.enrollmentId]: 'Could not update sharing. Please try again.',
      }))
      return
    }

    loadRoster()
  }

  return (
    <div className="kk-page">
      <div className="max-w-sm mx-auto px-4 py-10 space-y-8">
        <div>
          <a href={`/org/${orgId}/cohorts`} className="text-sm" style={{ color: 'var(--muted)' }}>
            ← Cohorts
          </a>
          <h1 className="font-serif text-3xl font-semibold mt-1">{cohortName ?? 'Cohort'}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Roster
          </p>
        </div>

        {loading ? (
          <p className="text-sm">Loading…</p>
        ) : roster.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Nobody is enrolled yet.
          </p>
        ) : (
          <ul data-testid="cohort-roster-list" className="space-y-2">
            {roster.map(entry => (
              <li key={entry.enrollmentId} data-testid="cohort-roster-row" className="kk-card px-4 py-3 text-sm">
                <div className="font-medium">{entry.displayName}</div>
                <div style={{ color: 'var(--muted)' }}>
                  {entry.status === 'graduated' ? `Graduated ${entry.graduatedAt ?? ''}` : 'Enrolled'}
                </div>

                {entry.status !== 'graduated' && (
                  <button
                    data-testid="cohort-roster-graduate"
                    type="button"
                    disabled={!!busyRows[entry.enrollmentId]}
                    onClick={() => handleGraduate(entry)}
                    className="kk-btn-outline mt-2 px-3 py-1.5 text-xs"
                  >
                    Mark graduated
                  </button>
                )}

                {entry.userId === currentUserId && (
                  <button
                    data-testid="cohort-roster-share-toggle"
                    type="button"
                    disabled={!!busyRows[entry.enrollmentId]}
                    onClick={() => handleToggleSharing(entry)}
                    className="kk-btn-outline mt-2 px-3 py-1.5 text-xs"
                  >
                    {entry.shareSignals ? 'Stop sharing with your teacher' : 'Share with your teacher'}
                  </button>
                )}

                {rowMessages[entry.enrollmentId] && (
                  <p data-testid="cohort-roster-message" className="mt-1 text-xs">
                    {rowMessages[entry.enrollmentId]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {enrollableMembers.length > 0 && (
          <form data-testid="cohort-enroll-form" onSubmit={handleEnroll} className="space-y-3">
            <h2 className="font-serif text-xl font-semibold">Enroll a member</h2>
            <select
              data-testid="cohort-enroll-select"
              required
              value={enrollUserId}
              onChange={e => setEnrollUserId(e.target.value)}
              className="kk-card block w-full px-4 py-3 text-sm"
            >
              <option value="" disabled>
                Choose a member
              </option>
              {enrollableMembers.map(member => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
            {enrollMessage && (
              <p data-testid="cohort-enroll-message" className="text-sm">
                {enrollMessage}
              </p>
            )}
            <button
              data-testid="cohort-enroll-submit"
              type="submit"
              disabled={enrolling}
              className="kk-btn block w-full text-center px-4 py-3 font-medium"
            >
              {enrolling ? 'Enrolling…' : 'Enroll'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
