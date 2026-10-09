/** Pure migration of the stranded per-device preference keys into one model
 *  (006 US6, FR-035/FR-036). Takes a storage-like reader — no global access — and
 *  never throws: absent, corrupt, or unreadable values fall back to defaults. */
export type ComposeLayer = 'simple' | 'advanced' | 'expert'
export type PoseDetailLayer = ComposeLayer | 'custom'

export const CUSTOM_FIELD_KEYS = [
  'breathing',
  'chakras',
  'dosha',
  'emotional',
  'modifications',
  'muscles-joints',
  'contraindications-props',
] as const
export type CustomFieldKey = (typeof CUSTOM_FIELD_KEYS)[number]

export interface Preferences {
  composeLayer: ComposeLayer
  poseDetailLayer: PoseDetailLayer
  poseDetailCustomFields: Record<CustomFieldKey, boolean>
  claimFlowsDecided: boolean
}

export interface PreferenceReader {
  getItem(key: string): string | null
}

export const PREFERENCE_KEYS = {
  composeLayer: 'krama-compose-layer',
  poseDetailLayer: 'krama-pose-detail-layer',
  poseDetailCustomFields: 'krama-pose-detail-custom-fields',
  claimFlowsDecided: 'krama-claim-flows-decided',
} as const

export const DEFAULT_PREFERENCES: Preferences = {
  composeLayer: 'simple',
  poseDetailLayer: 'simple',
  poseDetailCustomFields: Object.fromEntries(CUSTOM_FIELD_KEYS.map((k) => [k, true])) as Record<
    CustomFieldKey,
    boolean
  >,
  claimFlowsDecided: false,
}

const COMPOSE_LAYERS: readonly string[] = ['simple', 'advanced', 'expert']
const DETAIL_LAYERS: readonly string[] = [...COMPOSE_LAYERS, 'custom']

function read(reader: PreferenceReader | null, key: string): string | null {
  if (!reader) return null
  try {
    return reader.getItem(key)
  } catch {
    return null
  }
}

function parseCustomFields(raw: string | null): Record<CustomFieldKey, boolean> {
  const out = { ...DEFAULT_PREFERENCES.poseDetailCustomFields }
  if (raw === null) return out
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return out
    for (const k of CUSTOM_FIELD_KEYS) {
      const v = (parsed as Record<string, unknown>)[k]
      if (typeof v === 'boolean') out[k] = v
    }
  } catch {
    /* corrupt JSON: defaults */
  }
  return out
}

export function migratePreferences(reader: PreferenceReader | null): Preferences {
  const compose = read(reader, PREFERENCE_KEYS.composeLayer)
  const detail = read(reader, PREFERENCE_KEYS.poseDetailLayer)
  return {
    composeLayer:
      compose !== null && COMPOSE_LAYERS.includes(compose)
        ? (compose as ComposeLayer)
        : DEFAULT_PREFERENCES.composeLayer,
    poseDetailLayer:
      detail !== null && DETAIL_LAYERS.includes(detail)
        ? (detail as PoseDetailLayer)
        : DEFAULT_PREFERENCES.poseDetailLayer,
    poseDetailCustomFields: parseCustomFields(read(reader, PREFERENCE_KEYS.poseDetailCustomFields)),
    claimFlowsDecided: read(reader, PREFERENCE_KEYS.claimFlowsDecided) !== null,
  }
}
