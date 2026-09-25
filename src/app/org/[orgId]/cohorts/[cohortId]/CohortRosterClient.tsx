'use client'

import { useCallback, useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

// Roster rows carry enrollment SIGNAL only — status, dates, who — never a
// journal, reflection, or note column. That split is enforced by RLS
// (Principle VIII), but this component reinforces it by construction: the
// `select()` below only ever names signal columns, so there is nothing to
// accidentally render even if a future column were added to
// cohort_enrollments.
interface RosterEntry {
  enrollmentId: string
  userId: string
  status: string
  createdAt: string
  graduatedAt: string | null
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

  const loadRoster = useCallback(() => {
    const supabase = createClient()

    return supabase
      .from('cohorts')
      .select('name')
      .eq('id', cohortId)
      .single()
      .then(({ data: cohort }) => {
        setCohortName(cohort?.name ?? null)
        return supabase
          .from('cohort_enrollments')
          .select('id, user_id, status, created_at, graduated_at')
          .eq('cohort_id', cohortId)
      })
      .then(({ data: enrollments }) => {
        const userIds = (enrollments ?? []).map(e => e.user_id)
        return (
          userIds.length
            ? supabase.from('profile_cards').select('user_id, display_name').in('user_id', userIds)
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
              displayName: nameByUserId.get(e.user_id) ?? 'Student',
            })),
          )
          setLoading(false)
        })
      })
  }, [cohortId])

  useEffect(() => {
    loadRoster()
  }, [loadRoster])

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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
