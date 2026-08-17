'use client'

import Link from 'next/link'
import type { Pose, FiveElement } from '@/lib/pipeline/types'
import BodyDiagram from '@/components/poses/BodyDiagram'
import { CHAKRA_DOTS } from '@/lib/pose-library/body-map'
import { resolveDisplayName } from '@/lib/pose-library/display-name'

interface Props {
  pose: Pose
}

const ELEMENT_COLORS: Record<FiveElement, string> = {
  wood:  'bg-green-100 text-green-800',
  fire:  'bg-red-100 text-red-800',
  earth: 'bg-yellow-100 text-yellow-800',
  metal: 'bg-gray-100 text-gray-800',
  water: 'bg-blue-100 text-blue-800',
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

export default function PoseDetailClient({ pose }: Props) {
  const yinMode = pose.modes.find(m => m.type === 'yin') ?? pose.modes[0]

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Back link */}
        <Link
          href="/poses"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-6"
        >
          ← Pose Library
        </Link>

        {/* Pose header */}
        <div className="mb-6">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-stone-900">{resolveDisplayName(pose)}</h1>
            {pose.element && (
              <span className={`text-sm px-2 py-0.5 rounded capitalize mt-1 ${ELEMENT_COLORS[pose.element]}`}>
                {pose.element}
              </span>
            )}
            <span className={`text-sm px-2 py-0.5 rounded capitalize mt-1 ${DIFFICULTY_COLORS[pose.difficulty]}`}>
              {pose.difficulty}
            </span>
          </div>
          <p className="text-stone-400 italic mt-0.5">{pose.sanskrit}</p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-8">

          {/* Left: body diagram */}
          <div className="md:sticky md:top-6 md:self-start">
            <BodyDiagram
              muscleGroups={pose.muscle_groups ?? []}
              meridians={pose.meridians ?? []}
              jointsInvolved={pose.primary_joints_involved ?? []}
              chakras={pose.chakras}
              element={pose.element ?? null}
              bilateral={pose.bilateral}
            />
          </div>

          {/* Right: prose detail */}
          <div className="space-y-6 text-sm">

            {/* Meta tags */}
            <div className="flex flex-wrap gap-1.5">
              <span className="capitalize bg-stone-50 text-stone-600 px-2.5 py-1 rounded-full text-xs">{pose.body_position}</span>
              {yinMode && (
                <span className="bg-stone-50 text-stone-600 px-2.5 py-1 rounded-full text-xs">
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
            {(pose.type_tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {pose.type_tags!.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">{tag}</span>
                ))}
              </div>
            )}

            {/* Chakras */}
            {pose.chakras && pose.chakras.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Chakras</h2>
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
            <div>
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Breathing</h2>
              <div className="space-y-2 text-stone-700">
                <p><span className="font-medium text-stone-500">Entering — </span>{pose.breathing_cues.entering}</p>
                <p><span className="font-medium text-stone-500">Holding — </span>{pose.breathing_cues.holding}</p>
                <p><span className="font-medium text-stone-500">Exiting — </span>{pose.breathing_cues.exiting}</p>
              </div>
            </div>

            {/* Teacher cues */}
            {yinMode?.cue_notes && (
              <div>
                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Teacher cues</h2>
                <p className="text-stone-600 leading-relaxed">{yinMode.cue_notes}</p>
              </div>
            )}

            {/* Emotional territory */}
            {(pose.emotional_release_potential?.length ?? 0) > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Emotional territory</h2>
                <div className="space-y-2">
                  {pose.emotional_release_potential!.map((e, i) => (
                    <div key={i} className="flex flex-wrap gap-2 items-start">
                      <span className="text-xs px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full capitalize whitespace-nowrap">{e.emotion}</span>
                      <span className="text-xs text-stone-400">({e.tcm_organ})</span>
                      {e.notes && <p className="text-xs text-stone-500 leading-relaxed w-full">{e.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dosha affinity */}
            {pose.dosha_affinity && (
              <div>
                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Dosha affinity</h2>
                <div className="flex gap-6">
                  {(['vata', 'pitta', 'kapha'] as const).map(d => (
                    <div key={d} className="flex flex-col items-center gap-0.5">
                      <span className="text-xs text-stone-400 capitalize">{d}</span>
                      <span className={`text-sm font-medium capitalize ${DOSHA_EFFECT_COLORS[pose.dosha_affinity![d]]}`}>
                        {pose.dosha_affinity![d]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modifications */}
            {(pose.modifications?.length ?? 0) > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Modifications</h2>
                <div className="space-y-2">
                  {pose.modifications!.map((mod, i) => (
                    <div key={i} className="border border-stone-100 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-stone-700">{mod.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${DIFFICULTY_COLORS[mod.accessibility_level]}`}>
                          {mod.accessibility_level}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed">{mod.description}</p>
                      {mod.props_used && mod.props_used.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {mod.props_used.map(p => (
                            <span key={p} className="text-xs px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded-full">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contraindications */}
            {pose.contraindications.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">Contraindications</h2>
                <div className="flex flex-wrap gap-1">
                  {pose.contraindications.map(c => (
                    <span key={c} className="text-xs px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Props */}
            {pose.props_required.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Props</h2>
                <div className="flex flex-wrap gap-1">
                  {pose.props_required.map(p => (
                    <span key={p} className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {pose.notes && (
              <div>
                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Notes</h2>
                <p className="text-stone-600 leading-relaxed">{pose.notes}</p>
              </div>
            )}

            {/* Source */}
            <p className="text-xs text-stone-400 border-t border-stone-100 pt-4">{pose.source}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
