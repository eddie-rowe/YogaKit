import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import NotificationsSection from '@/app/settings/sections/NotificationsSection'
import DataSection from '@/app/settings/sections/DataSection'
import OrgMembershipsSection from '@/app/settings/sections/OrgMembershipsSection'
import StudioSection from '@/app/settings/sections/StudioSection'

// 006 T018 — presentational shells only (FR-005, FR-006, FR-007).
describe('settings section shells', () => {
  it('Notifications renders its label and says why nothing is changeable', () => {
    render(<NotificationsSection />)
    expect(screen.getByTestId('settings-section-notifications')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeTruthy()
    expect(screen.getByTestId('settings-notifications-why').textContent!.length).toBeGreaterThan(20)
  })

  it('Data renders export and delete with a plain-language reason', () => {
    render(<DataSection />)
    expect(screen.getByTestId('settings-section-data')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your data' })).toBeTruthy()
    expect(screen.getByTestId('settings-data-why').textContent!.length).toBeGreaterThan(20)
  })

  it('Organizations renders each membership and why the role is locked', () => {
    render(<OrgMembershipsSection orgs={[{ id: 'o1', name: 'Lotus Studio', role: 'member' }]} />)
    expect(screen.getByTestId('settings-section-orgs')).toBeTruthy()
    expect(screen.getByText('Lotus Studio')).toBeTruthy()
    expect(screen.getByTestId('settings-orgs-why').textContent!.length).toBeGreaterThan(20)
  })

  it('Studio names the organization its controls govern', () => {
    render(<StudioSection orgName="Lotus Studio" />)
    expect(screen.getByTestId('settings-section-studio')).toBeTruthy()
    expect(screen.getByTestId('settings-studio-org').textContent).toContain('Lotus Studio')
    expect(screen.getByTestId('settings-studio-why').textContent!.length).toBeGreaterThan(20)
  })
})
