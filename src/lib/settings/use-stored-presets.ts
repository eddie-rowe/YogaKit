'use client'

import { useCallback, useState } from 'react'

import { notifyClientValueChanged, useClientValue } from '@/lib/hooks/useClientValue'
import { browserStorage } from './browser-storage'
import { parsePresets, readPresets, writePresets, type Preset } from './presets'

/** Saved pose-detail presets (006 T055, FR-037), local only until T006 merges.
 *
 *  Reads hydrate through useClientValue (useSyncExternalStore), the same shape as
 *  useStoredPreference: server and hydration render the empty list, then the stored
 *  one. The snapshot is the list's JSON so it stays stable between reads.
 *
 *  Where storage is missing or throws, a change is held in memory so the control
 *  still responds for this visit (FR-036). */
export function useStoredPresets(): readonly [Preset[], (next: Preset[]) => void] {
  const json = useClientValue(() => JSON.stringify(readPresets(browserStorage())), '[]')
  const [override, setOverride] = useState<Preset[] | null>(null)

  const set = useCallback((next: Preset[]) => {
    setOverride(writePresets(browserStorage(), next) ? null : next)
    notifyClientValueChanged()
  }, [])

  return [override ?? parsePresets(json), set] as const
}
