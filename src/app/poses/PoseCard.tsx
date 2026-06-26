'use client'

import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Pose, FiveElement } from '@/lib/pipeline/types'

interface Props {
  pose: Pose
  expanded: boolean
  onToggle: () => void
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

const SEQ_POSITION_COLORS: Record<string, string> = {
  opening:     'bg-sky-50 text-sky-700',
  building:    'bg-indigo-50 text-indigo-700',
  peak:        'bg-violet-100 text-violet-800',
  cooldown:    'bg-amber-50 text-amber-700',
  integration: 'bg-stone-100 text-stone-600',
}

function ComplexityBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-stone-500 mb-0.5">
        <span>{label}</span>
        <span className="font-medium text-stone-700">{value}/10</span>
      </div>
      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  )
}

export default function PoseCard({ pose, expanded, onToggle }: Props) {
  const yinMode = pose.modes.find(m => m.type === 'yin') ?? pose.modes[0]

  return (
    <article className="bg-white border border-[#e2dbd4] rounded-xl overflow-hidden hover:border-[#c9b9a8] hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.06)] transition-all duration-200">
      {/* Card header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 pt-4 pb-3 focus:outline-none"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-serif font-semibold text-stone-900 truncate">{pose.english}</h2>
            <p className="text-xs text-stone-400 italic truncate">{pose.sanskrit}</p>
          </div>
          <div className="flex-shrink-0 flex gap-1 items-center">
            {pose.element && (
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ELEMENT_COLORS[pose.element]}`}>
                {pose.element}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${DIFFICULTY_COLORS[pose.difficulty]}`}>
              {pose.difficulty}
            </span>
            <span className="text-stone-400 ml-1">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </div>
        </div>

        {/* Complexity/risk bars — always visible */}
        <div className="mt-3 space-y-1.5">
          <ComplexityBar value={pose.complexity} label="Complexity" color="bg-stone-400" />
          <ComplexityBar value={pose.injury_risk} label="Injury risk" color="bg-rose-400" />
        </div>

        {/* Type tags row */}
        <div className="flex flex-wrap gap-1 mt-2">
          {pose.type_tags.slice(0, expanded ? undefined : 4).map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
              {tag}
            </span>
          ))}
          {!expanded && pose.type_tags.length > 4 && (
            <span className="text-xs text-stone-400">+{pose.type_tags.length - 4} more</span>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      <div className={`expandable-content ${expanded ? 'open' : ''}`}>
        <div className="px-4 pb-4 border-t border-stone-100 mt-1 pt-3 space-y-4 text-sm">

          {/* Hold range + body position + NS effect + tissue depth + sequencing position */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="capitalize bg-stone-50 text-stone-600 px-2 py-1 rounded">{pose.body_position}</span>
            {yinMode && (
              <span className="bg-stone-50 text-stone-600 px-2 py-1 rounded">
                {yinMode.hold_range.min}–{yinMode.hold_range.max} min
              </span>
            )}
            {pose.bilateral && (
              <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded">Bilateral</span>
            )}
            {pose.nervous_system_effect && (
              <span className={`px-2 py-1 rounded capitalize ${NS_COLORS[pose.nervous_system_effect]}`}>
                {pose.nervous_system_effect}
              </span>
            )}
            {pose.tissue_depth && (
              <span className="bg-violet-50 text-violet-700 px-2 py-1 rounded capitalize">
                {pose.tissue_depth} tissue
              </span>
            )}
            {pose.sequencing_position?.map(p => (
              <span key={p} className={`px-2 py-1 rounded capitalize ${SEQ_POSITION_COLORS[p]}`}>{p}</span>
            ))}
          </div>

          {/* Meridians */}
          {pose.meridians.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Meridians</h3>
              <div className="flex flex-wrap gap-1">
                {pose.meridians.map(m => (
                  <span key={m} className="text-xs px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded capitalize">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Muscle groups */}
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Muscle groups</h3>
            <div className="flex flex-wrap gap-1">
              {pose.muscle_groups.map(m => (
                <span key={m} className="text-xs px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">{m}</span>
              ))}
            </div>
          </div>

          {/* Energetic qualities */}
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Energetic quality</h3>
            <div className="flex flex-wrap gap-1">
              {pose.energetic_quality.map(eq => (
                <span key={eq} className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded capitalize">{eq}</span>
              ))}
            </div>
          </div>

          {/* Breathing cues */}
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Breathing cues</h3>
            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-stone-600">Entering: </span>
                <span className="text-xs text-stone-700">{pose.breathing_cues.entering}</span>
              </div>
              <div>
                <span className="text-xs font-medium text-stone-600">Holding: </span>
                <span className="text-xs text-stone-700">{pose.breathing_cues.holding}</span>
              </div>
              <div>
                <span className="text-xs font-medium text-stone-600">Exiting: </span>
                <span className="text-xs text-stone-700">{pose.breathing_cues.exiting}</span>
              </div>
            </div>
          </div>

          {/* Cue notes */}
          {yinMode?.cue_notes && (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Teacher cues</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{yinMode.cue_notes}</p>
            </div>
          )}

          {/* Joint actions + joints involved */}
          {pose.joint_action?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Joint actions</h3>
              <div className="flex flex-wrap gap-1">
                {pose.joint_action.map(j => (
                  <span key={j} className="text-xs px-1.5 py-0.5 bg-slate-50 text-slate-600 rounded">{j.replace(/_/g, ' ')}</span>
                ))}
              </div>
              {pose.primary_joints_involved?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {pose.primary_joints_involved.map(j => (
                    <span key={j} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">{j}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dosha affinity */}
          {pose.dosha_affinity && (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Dosha affinity</h3>
              <div className="flex gap-4 text-xs">
                {(['vata', 'pitta', 'kapha'] as const).map(d => (
                  <div key={d} className="flex flex-col items-center">
                    <span className="text-stone-400 capitalize mb-0.5">{d}</span>
                    <span className={`font-medium capitalize ${DOSHA_EFFECT_COLORS[pose.dosha_affinity[d]]}`}>
                      {pose.dosha_affinity[d]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emotional release potential */}
          {pose.emotional_release_potential?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Emotional territory</h3>
              <div className="space-y-1.5">
                {pose.emotional_release_potential.map((e, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-xs px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded capitalize whitespace-nowrap">{e.emotion}</span>
                    <span className="text-xs text-stone-400">({e.tcm_organ})</span>
                    {e.notes && <span className="text-xs text-stone-500 leading-relaxed">{e.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modifications */}
          {pose.modifications?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Modifications</h3>
              <div className="space-y-2">
                {pose.modifications.map((mod, i) => (
                  <div key={i} className="border border-stone-100 rounded-lg px-2.5 py-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-stone-700">{mod.name}</span>
                      <span className={`text-xs px-1 py-0.5 rounded capitalize ${DIFFICULTY_COLORS[mod.accessibility_level]}`}>
                        {mod.accessibility_level}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed">{mod.description}</p>
                    {mod.props_used && mod.props_used.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {mod.props_used.map(p => (
                          <span key={p} className="text-xs px-1 py-0.5 bg-stone-100 text-stone-500 rounded">{p}</span>
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
              <h3 className="text-xs font-semibold text-rose-500 uppercase tracking-wide mb-1">Contraindications</h3>
              <div className="flex flex-wrap gap-1">
                {pose.contraindications.map(c => (
                  <span key={c} className="text-xs px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded">{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Props */}
          {pose.props_required.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Props required</h3>
              <div className="flex flex-wrap gap-1">
                {pose.props_required.map(p => (
                  <span key={p} className="text-xs px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {pose.notes && (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Notes</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{pose.notes}</p>
            </div>
          )}

          {/* Source */}
          <p className="text-xs text-stone-400 pt-1 border-t border-stone-50">{pose.source}</p>

          {/* Detail link */}
          <Link
            href={`/poses/${pose.slug}`}
            className="inline-flex items-center gap-1 text-xs text-[#3d3530] hover:text-[#1c1714] font-medium transition-colors"
            onClick={e => e.stopPropagation()}
          >
            View anatomy diagram →
          </Link>
        </div>
      </div>
    </article>
  )
}
