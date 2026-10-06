import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import SettingsClient, { type Membership } from '@/app/settings/SettingsClient'
import { visibleSections, type AccountState } from '@/lib/settings/sections'

vi.mock('@/app/settings/sections/ProfileSection', () => ({ default: () => <section id="profile" /> }))
vi.mock('@/app/settings/sections/AppearanceSection', () => ({ default: () => <section id="appearance" /> }))
vi.mock('@/app/settings/sections/SecuritySection', () => ({ default: () => <section id="security" /> }))

const membership = (roles: string[]): Membership => ({
  id: 'm1',
  roles,
  status: 'active',
  organizations: { id: 'o1', name: 'Org One', org_types: [] },
})

function renderSettings(memberships: Membership[], isStudioLead: boolean) {
  return render(
    <SettingsClient
      email="a@b.c"
      provider="email"
      displayName=""
      timezone=""
      memberships={memberships}
      isStudioLead={isStudioLead}
    />,
  )
}

const indexLabels = () =>
  within(screen.getByTestId('settings-index'))
    .getAllByRole('link')
    .map((a) => a.textContent)

const renderedSectionIds = () =>
  Array.from(document.querySelectorAll('section[data-testid^="settings-section-"]')).map((s) =>
    s.getAttribute('data-testid'),
  )

describe('SettingsClient renders from visibleSections', () => {
  it('zero orgs: no conditional sections on the page or in the index', () => {
    renderSettings([], false)
    const expected = visibleSections({ orgs: [] } as AccountState).map((s) => s.label)
    expect(indexLabels()).toEqual(expected)
    expect(screen.queryByTestId('settings-section-orgs')).toBeNull()
    expect(screen.queryByTestId('settings-section-studio')).toBeNull()
  })

  it('member: memberships only', () => {
    renderSettings([membership(['member'])], false)
    expect(indexLabels()).toContain('Organization memberships')
    expect(indexLabels()).not.toContain('Studio')
    expect(screen.getByTestId('settings-section-orgs')).toBeTruthy()
    expect(screen.queryByTestId('settings-section-studio')).toBeNull()
  })

  it('owner: memberships and studio, index matches rendered sections in order', () => {
    renderSettings([membership(['owner'])], true)
    const labels = indexLabels()
    expect(labels.slice(-2)).toEqual(['Organization memberships', 'Studio'])
    expect(renderedSectionIds()).toEqual([
      'settings-section-notifications',
      'settings-section-privacy',
      'settings-section-data',
      'settings-section-billing',
      'settings-section-orgs',
      'settings-section-studio',
    ])
  })

  it('every index link targets a rendered anchor (none reachable only by URL)', () => {
    renderSettings([membership(['admin'])], true)
    for (const a of within(screen.getByTestId('settings-index')).getAllByRole('link')) {
      const id = a.getAttribute('href')!.slice(1)
      expect(document.getElementById(id)).not.toBeNull()
    }
  })
})
