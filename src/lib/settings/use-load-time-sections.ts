// 006 US1 (T019, FR-039): the section list is derived once per mount from the account
// state the page loaded with. A role change while settings is open does not re-derive it;
// the next load (a fresh mount) picks the new role up.
import { useState } from 'react'

import { visibleSections, type AccountState, type SettingsSection } from './sections'

export function useLoadTimeSections(state: AccountState): SettingsSection[] {
  const [sections] = useState(() => visibleSections(state))
  return sections
}
