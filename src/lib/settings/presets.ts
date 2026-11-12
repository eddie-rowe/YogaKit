/** Pure named-preset model for the pose-detail custom field checklist (006 US6,
 *  FR-037). Storage-agnostic: callers own persistence. Every operation returns a
 *  new array and touches only the targeted preset. */
export interface Preset {
  name: string
  fields: string[]
}

export type PresetFailure = 'blank' | 'duplicate' | 'missing'
export type PresetResult = { ok: true; presets: Preset[] } | { ok: false; reason: PresetFailure }

export function savePreset(presets: ReadonlyArray<Preset>, name: string, fields: ReadonlyArray<string>): PresetResult {
  const clean = name.trim()
  if (clean === '') return { ok: false, reason: 'blank' }
  if (presets.some((p) => p.name === clean)) return { ok: false, reason: 'duplicate' }
  return { ok: true, presets: [...presets, { name: clean, fields: [...fields] }] }
}

export function applyPreset(presets: ReadonlyArray<Preset>, name: string): string[] | null {
  const found = presets.find((p) => p.name === name)
  return found ? [...found.fields] : null
}

export function renamePreset(presets: ReadonlyArray<Preset>, from: string, to: string): PresetResult {
  const clean = to.trim()
  if (clean === '') return { ok: false, reason: 'blank' }
  if (!presets.some((p) => p.name === from)) return { ok: false, reason: 'missing' }
  if (clean !== from && presets.some((p) => p.name === clean)) return { ok: false, reason: 'duplicate' }
  return { ok: true, presets: presets.map((p) => (p.name === from ? { ...p, name: clean } : p)) }
}

export function deletePreset(presets: ReadonlyArray<Preset>, name: string): Preset[] {
  return presets.filter((p) => p.name !== name)
}

function isPreset(v: unknown): v is Preset {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return typeof r.name === 'string' && Array.isArray(r.fields) && r.fields.every((f) => typeof f === 'string')
}

/** Corrupt or absent serialized input yields an empty list, never a throw. */
export function parsePresets(raw: string | null | undefined): Preset[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Names are identities: keep the first of any repeat so rename/delete stay targeted.
    const seen = new Set<string>()
    return parsed
      .filter(isPreset)
      .filter((p) => (seen.has(p.name) ? false : (seen.add(p.name), true)))
      .map((p) => ({ name: p.name, fields: [...p.fields] }))
  } catch {
    return []
  }
}

// ── Storage adapter (006 T055) ────────────────────────────────────────────────
// Local only until the T006 server table merges: presets live in browser storage
// beside the preference they feed, as a JSON array of { name, fields }.

/** Storage key for the saved presets. */
export const PRESETS_KEY = 'krama-pose-detail-presets'

interface PresetReader {
  getItem(key: string): string | null
}
interface PresetWriter {
  setItem(key: string, value: string): void
}

/** Reads saved presets. Missing, throwing, or corrupt storage yields an empty list. */
export function readPresets(reader: PresetReader | null): Preset[] {
  if (!reader) return []
  try {
    return parsePresets(reader.getItem(PRESETS_KEY))
  } catch {
    return []
  }
}

/** Writes presets. Never throws; returns false where storage is missing or throws. */
export function writePresets(writer: PresetWriter | null, presets: ReadonlyArray<Preset>): boolean {
  if (!writer) return false
  try {
    writer.setItem(PRESETS_KEY, JSON.stringify(presets))
    return true
  } catch {
    return false
  }
}
