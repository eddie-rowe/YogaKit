import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import SettingsClient, { type Membership } from '@/app/settings/SettingsClient'
import * as sectionsModule from '@/lib/settings/sections'
import { visibleSections, type AccountState } from '@/lib/settings/sections'

vi.mock('@/lib/settings/sections', async (orig) => {
  const actual = await orig<typeof import('@/lib/settings/sections')>()
  return { ...actual, visibleSections: vi.fn(actual.visibleSections) }
})

// 006 T016 — SettingsClient renders from visibleSections (FR-001, FR-003, FR-004, SC-001, SC-002).
const org = (id: string, roles: string[]): Membership => ({
  id: `m-${id}`,
  roles,
  status: 'active',
  organizations: { id, name: `Org ${id}`, org_types: [] },
})

function mount(memberships: Membership[]) {
  return render(
    <SettingsClient
      email="a@example.com"
      provider="email"
      displayName=""
      timezone=""
      memberships={memberships}
    />,
  )
}

const renderedSectionIds = () =>
  Array.from(document.querySelectorAll('[data-testid^="settings-section-"]')).map(
    (el) => el.id,
  )
const indexHrefs = () =>
  within(screen.getByTestId('settings-index'))
    .getAllByRole('link')
    .map((a) => a.getAttribute('href'))

// visibleSections ids -> the anchor ids the page already uses (testids stay put).
const ANCHOR: Record<string, string> = { 'account-security': 'security', memberships: 'orgs' }
const expected = (state: AccountState) =>
  visibleSections(state).map((s) => ANCHOR[s.id] ?? s.id)

describe('SettingsClient sections (T016)', () => {
  it('zero-org account renders no conditional sections or index entries', () => {
    mount([])
    const ids = renderedSectionIds()
    expect(ids).toEqual(expected({ orgs: [] }))
    expect(indexHrefs()).toEqual(ids.map((i) => `#${i}`))
    expect(ids).not.toContain('orgs')
    expect(ids).not.toContain('studio')
  })

  it('member renders memberships only', () => {
    mount([org('a', ['member'])])
    const ids = renderedSectionIds()
    expect(ids).toEqual(expected({ orgs: [{ id: 'a', name: 'Org a', role: 'member' }] }))
    expect(ids).toContain('orgs')
    expect(ids).not.toContain('studio')
    expect(indexHrefs()).toEqual(ids.map((i) => `#${i}`))
  })

  it('owner/admin renders memberships and studio, each indexed', () => {
    mount([org('a', ['admin'])])
    const ids = renderedSectionIds()
    expect(ids).toEqual(expected({ orgs: [{ id: 'a', name: 'Org a', role: 'admin' }] }))
    expect(ids.slice(-2)).toEqual(['orgs', 'studio'])
    expect(indexHrefs()).toEqual(ids.map((i) => `#${i}`))
  })

  it('keeps existing testids', () => {
    mount([org('a', ['owner'])])
    expect(screen.getByTestId('settings-orgs-list')).toBeTruthy()
    expect(screen.getByTestId('settings-org-a')).toBeTruthy()
    expect(screen.getByTestId('settings-org-new')).toBeTruthy()
    expect(screen.getByTestId('settings-data-export')).toBeTruthy()
  })

  it('derives the list from visibleSections, with roles read off the memberships', () => {
    vi.mocked(sectionsModule.visibleSections).mockClear()
    // roles say admin, isStudioLead prop says no: the section list is the authority.
    mount([org('a', ['admin'])])
    expect(sectionsModule.visibleSections).toHaveBeenCalledWith({
      orgs: [{ id: 'a', name: 'Org a', role: 'admin' }],
    })
    expect(renderedSectionIds()).toContain('studio')
  })
})
