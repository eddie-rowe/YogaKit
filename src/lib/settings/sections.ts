// 006 US1 (T014): which settings sections an account sees, in what order (FR-002..FR-005).
// Pure: no network, no DB, no globals. Absent sections are omitted, never disabled.

export type OrgRole = 'owner' | 'admin' | 'member'

export interface AccountOrg {
  id: string
  name: string
  role: OrgRole
}

export interface AccountState {
  orgs: readonly AccountOrg[]
}

export type SectionId =
  | 'profile'
  | 'appearance'
  | 'notifications'
  | 'privacy'
  | 'account-security'
  | 'data'
  | 'billing'
  | 'memberships'
  | 'studio'

export interface SettingsSection {
  id: SectionId
  label: string
  /** Studio only: the organizations whose controls this section governs (FR-005). */
  governedOrgs?: { id: string; name: string }[]
}

const ALWAYS: readonly SettingsSection[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'account-security', label: 'Account and security' },
  { id: 'data', label: 'Data export and delete' },
  { id: 'billing', label: 'Billing' },
]

export function visibleSections(state: AccountState): SettingsSection[] {
  const sections: SettingsSection[] = ALWAYS.map((s) => ({ ...s }))
  if (state.orgs.length > 0) {
    sections.push({ id: 'memberships', label: 'Organization memberships' })
  }
  const governed = state.orgs
    .filter((o) => o.role === 'owner' || o.role === 'admin')
    .map((o) => ({ id: o.id, name: o.name }))
  if (governed.length > 0) {
    sections.push({ id: 'studio', label: 'Studio', governedOrgs: governed })
  }
  return sections
}
