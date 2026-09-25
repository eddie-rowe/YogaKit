'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

interface Cohort {
  id: string
  name: string
  kind: string
  enrolledCount: number
}

interface CohortsListClientProps {
  orgId: string
}

export default function CohortsListClient({ orgId }: CohortsListClientProps) {
  const [orgName, setOrgName] = useState<string | null>(null)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState('')
  const [creating, setCreating] = useState(false)
  const [createMessage, setCreateMessage] = useState<string | null>(null)

  const loadCohorts = useCallback(() => {
    const supabase = createClient()

    return supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()
      .then(({ data: org }) => {
        setOrgName(org?.name ?? null)
        return supabase.from('cohorts').select('id, name, kind').eq('org_id', orgId)
      })
      .then(({ data: rows }) => {
        const cohortIds = (rows ?? []).map(c => c.id)
        return (
          cohortIds.length
            ? supabase.from('cohort_enrollments').select('cohort_id').in('cohort_id', cohortIds)
            : Promise.resolve({ data: [] })
        ).then(({ data: enrollments }) => {
          const countByCohort = new Map<string, number>()
          for (const e of enrollments ?? []) {
            countByCohort.set(e.cohort_id, (countByCohort.get(e.cohort_id) ?? 0) + 1)
          }
          setCohorts(
            (rows ?? []).map(c => ({
              id: c.id,
              name: c.name,
              kind: c.kind,
              enrolledCount: countByCohort.get(c.id) ?? 0,
            })),
          )
          setLoading(false)
        })
      })
  }, [orgId])

  useEffect(() => {
    loadCohorts()
  }, [loadCohorts])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setCreating(true)
    setCreateMessage(null)

    const supabase = createClient()
    // No API route needed: cohorts_insert_authorized_role enforces the role
    // check at the RLS layer, and creating a cohort has no side effect (no
    // email, no external call) the way sending an invitation does.
    const { error } = await supabase.from('cohorts').insert({ org_id: orgId, name: newName, kind: newKind })

    setCreating(false)

    if (error) {
      setCreateMessage(
        error.code === '42501'
          ? "Your role in this organization doesn't include creating cohorts."
          : 'Could not create that cohort. Please try again.',
      )
      return
    }

    setCreateMessage(`${newName} created.`)
    setNewName('')
    setNewKind('')
    loadCohorts()
  }

  return (
    <div className="kk-page">
      <div className="max-w-sm mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold">{orgName ?? 'Organization'}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Cohorts
          </p>
        </div>

        {loading ? (
          <p className="text-sm">Loading…</p>
        ) : (
          <ul data-testid="cohort-list" className="space-y-2">
            {cohorts.map(cohort => (
              <li key={cohort.id} data-testid="cohort-row" className="kk-card px-4 py-3 text-sm">
                <Link href={`/org/${orgId}/cohorts/${cohort.id}`} className="font-medium block">
                  {cohort.name}
                </Link>
                <div style={{ color: 'var(--muted)' }}>
                  {cohort.kind} · {cohort.enrolledCount} enrolled
                </div>
              </li>
            ))}
          </ul>
        )}

        <form data-testid="cohort-create-form" onSubmit={handleCreate} className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">New cohort</h2>
          <input
            data-testid="cohort-name-input"
            type="text"
            required
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="YTT 200 Cohort"
            className="kk-card block w-full px-4 py-3 text-sm"
          />
          <input
            data-testid="cohort-kind-input"
            type="text"
            required
            value={newKind}
            onChange={e => setNewKind(e.target.value)}
            placeholder="ytt_200"
            className="kk-card block w-full px-4 py-3 text-sm"
          />
          {createMessage && (
            <p data-testid="cohort-create-message" className="text-sm">
              {createMessage}
            </p>
          )}
          <button
            data-testid="cohort-create-submit"
            type="submit"
            disabled={creating}
            className="kk-btn block w-full text-center px-4 py-3 font-medium"
          >
            {creating ? 'Creating…' : 'Create cohort'}
          </button>
        </form>
      </div>
    </div>
  )
}
