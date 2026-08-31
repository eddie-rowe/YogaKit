'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

const ORG_TYPES = [
  { value: 'certifying_body', label: 'Certifying body' },
  { value: 'school', label: 'School' },
  { value: 'studio', label: 'Studio' },
]

export default function OrgNewClient() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function toggleType(value: string) {
    setSelectedTypes(prev =>
      prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value],
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (selectedTypes.length === 0) {
      setFormError('Choose at least one organization type.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    const supabase = createClient()
    const { data, error } = await supabase
      .rpc('app_create_organization', { name, org_types: selectedTypes })
      .single()

    setSubmitting(false)

    if (error || !data) {
      setFormError('Could not create that organization. Please try again.')
      return
    }

    const org = data as { id: string }
    router.push(`/org/${org.id}/members`)
  }

  return (
    <div className="kk-page">
      <div className="max-w-sm mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold">New organization</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Schools, studios, and certifying bodies all start here.
          </p>
        </div>

        <form data-testid="org-new-form" onSubmit={handleSubmit} className="space-y-4">
          <input
            data-testid="org-new-name-input"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Organization name"
            className="kk-card block w-full px-4 py-3 text-sm"
          />

          <div className="space-y-2">
            {ORG_TYPES.map(type => (
              <label key={type.value} className="flex items-center gap-2 text-sm">
                <input
                  data-testid={`org-new-type-${type.value}`}
                  type="checkbox"
                  checked={selectedTypes.includes(type.value)}
                  onChange={() => toggleType(type.value)}
                />
                {type.label}
              </label>
            ))}
          </div>

          {formError && (
            <p data-testid="org-new-error" className="text-sm">
              {formError}
            </p>
          )}

          <button
            data-testid="org-new-submit"
            type="submit"
            disabled={submitting}
            className="kk-btn block w-full text-center px-4 py-3 font-medium"
          >
            {submitting ? 'Creating…' : 'Create organization'}
          </button>
        </form>
      </div>
    </div>
  )
}
