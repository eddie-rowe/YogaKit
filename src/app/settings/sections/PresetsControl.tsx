'use client'

import { useState } from 'react'

import { CUSTOM_FIELD_KEYS, type CustomFieldKey } from '@/lib/settings/preferences'
import {
  applyPreset,
  deletePreset,
  renamePreset,
  savePreset,
  type PresetFailure,
} from '@/lib/settings/presets'
import { useStoredPresets } from '@/lib/settings/use-stored-presets'

// 006 US6 T055 (FR-037): save the current custom-field checklist under a name,
// reapply it, rename it, delete it. Each action touches only its target preset.
// Local only until the T006 server table merges.

const FAILURE_COPY: Record<PresetFailure, string> = {
  blank: 'Give the preset a name to save it.',
  duplicate: 'A preset already has that name. Try another one.',
  missing: 'That preset is no longer here.',
}

export default function PresetsControl({
  fields,
  onApply,
}: {
  fields: Record<CustomFieldKey, boolean>
  onApply: (next: Record<CustomFieldKey, boolean>) => void
}) {
  const [presets, setPresets] = useStoredPresets()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameTo, setRenameTo] = useState('')

  function save() {
    const checkedKeys = CUSTOM_FIELD_KEYS.filter(k => fields[k])
    const result = savePreset(presets, name, checkedKeys)
    if (!result.ok) {
      setError(FAILURE_COPY[result.reason])
      return
    }
    setPresets(result.presets)
    setName('')
    setError(null)
  }

  function apply(presetName: string) {
    const picked = applyPreset(presets, presetName)
    if (!picked) return
    const on = new Set(picked)
    onApply(
      Object.fromEntries(CUSTOM_FIELD_KEYS.map(k => [k, on.has(k)])) as Record<CustomFieldKey, boolean>,
    )
    setError(null)
  }

  function startRename(presetName: string) {
    setRenaming(presetName)
    setRenameTo(presetName)
    setError(null)
  }

  function confirmRename() {
    if (renaming === null) return
    const result = renamePreset(presets, renaming, renameTo)
    if (!result.ok) {
      setError(FAILURE_COPY[result.reason])
      return
    }
    setPresets(result.presets)
    setRenaming(null)
    setError(null)
  }

  function remove(presetName: string) {
    setPresets(deletePreset(presets, presetName))
    if (renaming === presetName) setRenaming(null)
    setError(null)
  }

  return (
    <div className="space-y-2" data-testid="settings-presets">
      <p id="settings-presets-label" className="text-sm font-medium">
        Saved field sets
      </p>
      <form
        className="flex flex-wrap gap-2"
        aria-labelledby="settings-presets-label"
        onSubmit={e => {
          e.preventDefault()
          save()
        }}
      >
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          aria-label="Name for this field set"
          placeholder="Name this set"
          data-testid="settings-preset-name-input"
          className="kk-input min-w-0 flex-1 px-3 text-sm"
        />
        <button type="submit" data-testid="settings-preset-save" className="kk-chip px-3.5 text-sm">
          Save
        </button>
      </form>
      {error && (
        <p role="status" data-testid="settings-preset-error" className="text-sm">
          {error}
        </p>
      )}
      {presets.length === 0 ? (
        <p data-testid="settings-preset-empty" className="text-sm" style={{ color: 'var(--muted)' }}>
          No saved sets yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {presets.map(preset => (
            <li
              key={preset.name}
              data-testid={`settings-preset-item-${preset.name}`}
              className="flex flex-wrap items-center gap-2"
            >
              {renaming === preset.name ? (
                <>
                  <input
                    type="text"
                    value={renameTo}
                    onChange={e => setRenameTo(e.target.value)}
                    aria-label={`New name for ${preset.name}`}
                    data-testid="settings-preset-rename-input"
                    className="kk-input min-w-0 flex-1 px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={confirmRename}
                    data-testid="settings-preset-rename-confirm"
                    className="kk-chip px-3 text-sm"
                  >
                    Save name
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenaming(null)}
                    data-testid="settings-preset-rename-cancel"
                    className="kk-chip px-3 text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1">{preset.name}</span>
                  <button
                    type="button"
                    onClick={() => apply(preset.name)}
                    data-testid={`settings-preset-apply-${preset.name}`}
                    className="kk-chip px-3 text-sm"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => startRename(preset.name)}
                    data-testid={`settings-preset-rename-${preset.name}`}
                    className="kk-chip px-3 text-sm"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(preset.name)}
                    data-testid={`settings-preset-delete-${preset.name}`}
                    className="kk-chip px-3 text-sm"
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
