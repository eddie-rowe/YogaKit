'use client'

import { useStoredPreference } from '@/lib/settings/use-stored-preference'
import {
  CUSTOM_FIELD_KEYS,
  type ComposeLayer,
  type CustomFieldKey,
  type PoseDetailLayer,
} from '@/lib/settings/preferences'
import { Section } from './Section'

// 006 US6 (T054, FR-034/FR-035/FR-036, SC-013): every preference that used to live
// only on its own surface gets a visible control here. Values are written back under
// the same keys and formats compose and pose detail already read, so a change here
// shows up there with no code change on their side.
//
// `krama-claim-flows-decided` has no control on purpose: it is a one-shot flag the
// claim-flows prompt sets for itself, not a choice a person makes.

const COMPOSE_OPTIONS: { value: ComposeLayer; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
]

const DETAIL_OPTIONS: { value: PoseDetailLayer; label: string }[] = [
  ...COMPOSE_OPTIONS,
  { value: 'custom', label: 'Custom' },
]

const FIELD_LABELS: Record<CustomFieldKey, string> = {
  breathing: 'Breathing cues',
  chakras: 'Chakras',
  dosha: 'Dosha affinity',
  emotional: 'Emotional release',
  modifications: 'Modifications',
  'muscles-joints': 'Muscle groups & joints',
  'contraindications-props': 'Contraindications & props',
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  testidPrefix,
  onPick,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  testidPrefix: string
  onPick: (next: T) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            data-testid={`${testidPrefix}-${option.value}`}
            data-active={value === option.value}
            onClick={() => onPick(option.value)}
            className="kk-chip px-3.5 text-sm"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PreferencesSection() {
  // Server render shows the defaults; the stored values replace them straight after
  // hydration. Where storage can't be written, a choice still applies for this visit.
  const [composeLayer, pickCompose] = useStoredPreference('composeLayer')
  const [detailLayer, pickDetail] = useStoredPreference('poseDetailLayer')
  const [fields, setFields] = useStoredPreference('poseDetailCustomFields')

  function toggleField(key: CustomFieldKey) {
    setFields({ ...fields, [key]: !fields[key] })
  }

  return (
    <Section id="preferences" title="Preferences">
      <ChipGroup
        label="Composer detail"
        options={COMPOSE_OPTIONS}
        value={composeLayer}
        testidPrefix="settings-pref-compose"
        onPick={pickCompose}
      />
      <ChipGroup
        label="Pose detail"
        options={DETAIL_OPTIONS}
        value={detailLayer}
        testidPrefix="settings-pref-detail"
        onPick={pickDetail}
      />
      <div className="space-y-1.5">
        <p id="settings-pref-fields-label" className="text-sm font-medium">
          Fields shown on the Custom pose detail
        </p>
        <div role="group" aria-labelledby="settings-pref-fields-label" className="flex flex-wrap gap-2">
          {CUSTOM_FIELD_KEYS.map(key => (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={fields[key]}
              data-testid={`settings-pref-field-${key}`}
              data-active={fields[key]}
              onClick={() => toggleField(key)}
              className="kk-chip px-3.5 text-sm"
            >
              {FIELD_LABELS[key]}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        These stay on this device, and the composer and pose pages open the way you set them here.
      </p>
    </Section>
  )
}
