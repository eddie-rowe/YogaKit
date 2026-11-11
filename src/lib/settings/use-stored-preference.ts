'use client'

import { useCallback, useMemo, useState } from 'react'

import { notifyClientValueChanged, useClientValue } from '@/lib/hooks/useClientValue'
import { browserStorage } from './browser-storage'
import {
  DEFAULT_PREFERENCES,
  migratePreferences,
  writePreference,
  type Preferences,
  type WritablePreference,
} from './preferences'

/** One read/write path for a stranded preference (006 T054, FR-035/FR-036), shared by
 *  settings, the composer, and pose detail so the keys and formats live in one place.
 *
 *  Reads go through migratePreferences via useClientValue: the server and hydration
 *  render the default, then the stored value — no useState initializer reading
 *  storage, which hydrates with the server's markup and never shows the stored value.
 *  The snapshot is the value's JSON so object preferences stay stable between reads.
 *
 *  A change is written, then read back. Where storage is missing or throws, it is
 *  held in memory so the control still responds for this visit instead of looking dead. */
export function useStoredPreference<K extends WritablePreference>(
  key: K,
): readonly [Preferences[K], (next: Preferences[K]) => void] {
  const json = useClientValue(
    () => JSON.stringify(migratePreferences(browserStorage())[key]),
    JSON.stringify(DEFAULT_PREFERENCES[key]),
  )
  const stored = useMemo(() => JSON.parse(json) as Preferences[K], [json])
  const [override, setOverride] = useState<Preferences[K] | null>(null)

  const set = useCallback(
    (next: Preferences[K]) => {
      // Hold the value in memory only when it couldn't be written; otherwise storage
      // stays the source, so another control writing the same key still shows here.
      setOverride(writePreference(browserStorage(), key, next) ? null : next)
      notifyClientValueChanged()
    },
    [key],
  )

  return [override ?? stored, set] as const
}
