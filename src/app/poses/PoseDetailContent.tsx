'use client'

import { useEffect, useState } from 'react'
import type { Pose } from '@/lib/pipeline/types'
import BodyDiagram from '@/components/poses/BodyDiagram'
import { CHAKRA_DOTS } from '@/lib/pose-library/body-map'

interface Props {
  pose: Pose
}

export type DetailLayer = 'simple' | 'advanced' | 'expert' | 'custom'
export const DETAIL_LAYERS: DetailLayer[] = ['simple', 'advanced', 'expert', 'custom']
export const DETAIL_LAYER_STORAGE_KEY = 'krama-pose-detail-layer'
// Field-group visibility for the custom layer, stored alongside DETAIL_LAYER_STORAGE_KEY.
export const CUSTOM_FIELDS_STORAGE_KEY = 'krama-pose-detail-custom-fields'
const LAYER_RANK: Record<DetailLayer, number> = { simple: 0, advanced: 1, expert: 2, custom: 3 }

export type CustomFieldGroup =
  | 'breathing'
  | 'chakras'
  | 'dosha'
  | 'emotional'
  | 'modifications'
  | 'muscles-joints'
  | 'contraindications-props'

export const CUSTOM_FIELD_GROUPS: { key: CustomFieldGroup; label: string }[] = [
  { key: 'breathing', label: 'Breathing cues' },
  { key: 'chakras', label: 'Chakras' },
  { key: 'dosha', label: 'Dosha affinity' },
  { key: 'emotional', label: 'Emotional release' },
  { key: 'modifications', label: 'Modifications' },
  { key: 'muscles-joints', label: 'Muscle groups & joints' },
  { key: 'contraindications-props', label: 'Contraindications & props' },
]

const DEFAULT_CUSTOM_FIELDS: Record<CustomFieldGroup, boolean> = {
  breathing: true,
  chakras: true,
  dosha: true,
  emotional: true,
  modifications: true,
  'muscles-joints': true,
  'contraindications-props': true,
}

const DIFFICULTY_COLORS: Record<string, string> = {
  accessible:   'bg-emerald-100 text-emerald-800',
  intermediate: 'bg-amber-100 text-amber-800',
  advanced:     'bg-red-100 text-red-800',
}

const NS_COLORS: Record<string, string> = {
  parasympathetic: 'bg-teal-100 text-teal-800',
  sympathetic:     'bg-orange-100 text-orange-800',
  neutral:         'bg-stone-100 text-stone-600',
}

const DOSHA_EFFECT_COLORS: Record<string, string> = {
  balancing:   'text-emerald-700',
  neutral:     'text-stone-500',
  aggravating: 'text-rose-600',
}

export function useDetailLayer() {
  const [layer, setLayer] = useState<DetailLayer>('simple')
  const [customFields, setCustomFields] = useState<Record<CustomFieldGroup, boolean>>(DEFAULT_CUSTOM_FIELDS)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(DETAIL_LAYER_STORAGE_KEY)
    if (stored && (DETAIL_LAYERS as string[]).includes(stored)) setLayer(stored as DetailLayer)
    const storedFields = window.localStorage.getItem(CUSTOM_FIELDS_STORAGE_KEY)
    if (storedFields) {
      try {
        const parsed = JSON.parse(storedFields)
        setCustomFields(prev => ({ ...prev, ...parsed }))
      } catch {
        // ignore malformed stored value
      }
    }
  }, [])

  function selectLayer(next: DetailLayer) {
    setLayer(next)
    if (typeof window !== 'undefined') window.localStorage.setItem(DETAIL_LAYER_STORAGE_KEY, next)
  }

  function toggleCustomField(key: CustomFieldGroup) {
    setCustomFields(prev => {
      const next = { ...prev, [key]: !prev[key] }
      if (typeof window !== 'undefined') window.localStorage.setItem(CUSTOM_FIELDS_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return { layer, selectLayer, customFields, toggleCustomField }
}

interface LayerChipsProps {
  layer: DetailLayer
  onSelect: (l: DetailLayer) => void
}

export function DetailLayerChips({ layer, onSelect }: LayerChipsProps) {
  return (
    <div className="flex gap-1.5 mb-4">
      {DETAIL_LAYERS.map(l => (
        <button
          key={l}
          data-testid={`poses-detail-layer-${l}`}
          data-active={layer === l}
          onClick={() => onSelect(l)}
          className="kk-chip px-3 py-1 text-xs capitalize"
        >
          {l}
        </button>
      ))}
    </div>
  )
}

interface CustomFieldChecklistProps {
  customFields: Record<CustomFieldGroup, boolean>
  onToggle: (key: CustomFieldGroup) => void
}

export function CustomFieldChecklist({ customFields, onToggle }: CustomFieldChecklistProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-xl" style={{ background: 'var(--surface-raised)' }}>
      {CUSTOM_FIELD_GROUPS.map(g => (
        <label key={g.key} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--foreground)' }}>
          <input
            type="checkbox"
            data-testid={`poses-detail-custom-field-${g.key}`}
            checked={customFields[g.key]}
            onChange={() => onToggle(g.key)}
          />
          {g.label}
        </label>
      ))}
    </div>
  )
}

interface ContentProps extends Props {
  layer: DetailLayer
  customFields: Record<CustomFieldGroup, boolean>
}

export default function PoseDetailContent({ pose, layer, customFields }: ContentProps) {
  const yinMode = pose.modes.find(m => m.type === 'yin') ?? pose.modes[0]
  const rank = LAYER_RANK[layer]
  const showAdvanced = layer === 'custom' || rank >= LAYER_RANK.advanced
  const showExpert = layer === 'custom' || rank >= LAYER_RANK.expert

  const showBreathing = layer !== 'custom' || customFields.breathing
  const showChakras = layer === 'custom' ? customFields.chakras : showExpert
  const showDosha = layer === 'custom' ? customFields.dosha : showAdvanced
  const showEmotional = layer === 'custom' ? customFields.emotional : showExpert
  const showModifications = layer === 'custom' ? customFields.modifications : showAdvanced
  const showMusclesJoints = layer !== 'custom' || customFields['muscles-joints']
  const showContraindicationsProps = layer !== 'custom' || customFields['contraindications-props']
  const showTypeTags = layer === 'custom' ? customFields['muscles-joints'] : showAdvanced

  return (
    <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-8">

      {/* Left: body diagram */}
      {showMusclesJoints && (
        <div className="md:sticky md:top-6 md:self-start">
          <BodyDiagram
            muscleGroups={pose.muscle_groups ?? []}
            meridians={pose.meridians ?? []}
            jointsInvolved={pose.primary_joints_involved ?? []}
            chakras={showChakras ? pose.chakras : undefined}
            element={pose.element ?? null}
            bilateral={pose.bilateral}
          />
        </div>
      )}

      {/* Right: prose detail */}
      <div className="space-y-6 text-sm">

        {/* Meta tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="capitalize px-2.5 py-1 rounded-full text-xs" style={{ background: 'var(--surface-raised)', color: 'var(--foreground)' }}>{pose.body_position}</span>
          {yinMode && (
            <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: 'var(--surface-raised)', color: 'var(--foreground)' }}>
              {yinMode.hold_range.min}–{yinMode.hold_range.max} min
            </span>
          )}
          {pose.bilateral && (
            <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs">Bilateral</span>
          )}
          {pose.nervous_system_effect && (
            <span className={`px-2.5 py-1 rounded-full text-xs capitalize ${NS_COLORS[pose.nervous_system_effect]}`}>
              {pose.nervous_system_effect}
            </span>
          )}
          {pose.tissue_depth && (
            <span className="bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full text-xs capitalize">
              {pose.tissue_depth} tissue
            </span>
          )}
        </div>

        {/* Type tags */}
        {showTypeTags && (pose.type_tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {pose.type_tags!.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-raised)', color: 'var(--foreground)' }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Chakras */}
        {showChakras && pose.chakras && pose.chakras.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Chakras</h2>
            <div className="flex flex-wrap gap-2">
              {pose.chakras.map(chakraName => {
                const dot = CHAKRA_DOTS.find(d => d.name === chakraName)
                if (!dot) return null
                return (
                  <span
                    key={chakraName}
                    className="text-xs px-2.5 py-1 rounded-full font-medium text-white"
                    style={{ backgroundColor: dot.color }}
                  >
                    {dot.english}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Breathing cues */}
        {showBreathing && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Breathing</h2>
            <div className="space-y-2" style={{ color: 'var(--foreground)' }}>
              <p><span className="font-medium" style={{ color: 'var(--muted)' }}>Entering: </span>{pose.breathing_cues.entering}</p>
              <p><span className="font-medium" style={{ color: 'var(--muted)' }}>Holding: </span>{pose.breathing_cues.holding}</p>
              <p><span className="font-medium" style={{ color: 'var(--muted)' }}>Exiting: </span>{pose.breathing_cues.exiting}</p>
            </div>
          </div>
        )}

        {/* Teacher cues */}
        {showBreathing && yinMode?.cue_notes && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Teacher cues</h2>
            <p className="leading-relaxed" style={{ color: 'var(--foreground)' }}>{yinMode.cue_notes}</p>
          </div>
        )}

        {/* Emotional territory */}
        {showEmotional && (pose.emotional_release_potential?.length ?? 0) > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Emotional territory</h2>
            <div className="space-y-2">
              {pose.emotional_release_potential!.map((e, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-start">
                  <span className="text-xs px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full capitalize whitespace-nowrap">{e.emotion}</span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>({e.tcm_organ})</span>
                  {e.notes && <p className="text-xs leading-relaxed w-full" style={{ color: 'var(--muted)' }}>{e.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dosha affinity */}
        {showDosha && pose.dosha_affinity && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Dosha affinity</h2>
            <div className="flex gap-6">
              {(['vata', 'pitta', 'kapha'] as const).map(d => (
                <div key={d} className="flex flex-col items-center gap-0.5">
                  <span className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{d}</span>
                  <span className={`text-sm font-medium capitalize ${DOSHA_EFFECT_COLORS[pose.dosha_affinity![d]]}`}>
                    {pose.dosha_affinity![d]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modifications */}
        {showModifications && (pose.modifications?.length ?? 0) > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Modifications</h2>
            <div className="space-y-2">
              {pose.modifications!.map((mod, i) => (
                <div key={i} className="border rounded-xl px-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>{mod.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${DIFFICULTY_COLORS[mod.accessibility_level]}`}>
                      {mod.accessibility_level}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{mod.description}</p>
                  {mod.props_used && mod.props_used.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {mod.props_used.map(p => (
                        <span key={p} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-raised)', color: 'var(--muted)' }}>{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contraindications */}
        {showContraindicationsProps && pose.contraindications.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--warning)' }}>Contraindications</h2>
            <div className="flex flex-wrap gap-1">
              {pose.contraindications.map(c => (
                <span key={c} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)' }}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Props */}
        {showContraindicationsProps && pose.props_required.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Props</h2>
            <div className="flex flex-wrap gap-1">
              {pose.props_required.map(p => (
                <span key={p} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-raised)', color: 'var(--foreground)' }}>{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {pose.notes && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Notes</h2>
            <p className="leading-relaxed" style={{ color: 'var(--foreground)' }}>{pose.notes}</p>
          </div>
        )}

        {/* Source */}
        <p className="text-xs pt-4 border-t" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>{pose.source}</p>
      </div>
    </div>
  )
}
