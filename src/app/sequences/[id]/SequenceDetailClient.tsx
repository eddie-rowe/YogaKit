'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Pose } from '@/lib/pose-types'
import type { ReferenceSequence, ReferenceSequencePose } from '@/lib/reference-sequences'
import SequenceArc from '@/components/sequence/SequenceArc'
import SequenceAnalytics from '@/components/sequence/SequenceAnalytics'
import { CHAKRA_DOTS } from '@/lib/pose-library/body-map'
import { effectiveMinutes } from '@/lib/pose-library/sequence-stats'
import { resolveDisplayName } from '@/lib/pose-library/display-name'

interface ResolvedPose extends ReferenceSequencePose {
  pose: Pose | null
}

interface Props {
  sequence: ReferenceSequence
  resolvedPoses: ResolvedPose[]
}

const DIFFICULTY_COLORS = {
  beginner:     'bg-emerald-100 text-emerald-800',
  intermediate: 'bg-amber-100 text-amber-800',
  advanced:     'bg-red-100 text-red-800',
}

const STYLE_COLORS: Record<string, string> = {
  yin:         'bg-violet-100 text-violet-800',
  restorative: 'bg-teal-100 text-teal-800',
  vinyasa:     'bg-amber-100 text-amber-800',
  ashtanga:    'bg-rose-100 text-rose-800',
}

const POSITION_LABELS: Record<string, string> = {
  opening:     'Opening',
  building:    'Building',
  peak:        'Peak',
  cooldown:    'Cooldown',
  integration: 'Integration',
}

export default function SequenceDetailClient({ sequence: seq, resolvedPoses }: Props) {
  const router = useRouter()

  const handleLoadIntoBuilder = () => {
    const params = new URLSearchParams({ style: seq.style, duration: String(seq.duration_minutes) })
    if (seq.element) params.set('element', seq.element)
    router.push(`/dimensions?${params.toString()}`)
  }

  // Collect all unique chakras across the sequence
  const allChakras = Array.from(
    new Set(resolvedPoses.flatMap(rp => rp.pose?.chakras ?? []))
  )

  // Calculate total mat time and build weighted poses for analytics
  const weightedPoses = resolvedPoses.map(rp => ({
    pose: rp.pose,
    minutes: effectiveMinutes(rp.hold_minutes, rp.pose, rp.side),
  }))
  const totalMinutes = weightedPoses.reduce((sum, wp) => sum + wp.minutes, 0)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Back link */}
        <Link
          href="/sequences"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-6"
        >
          ← Reference Sequences
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
            <h1 className="text-2xl font-semibold text-stone-900">{seq.title}</h1>
            {seq.available && (
              <button
                onClick={handleLoadIntoBuilder}
                className="flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-700 transition-colors"
              >
                Use as starting point →
              </button>
            )}
          </div>
          <p className="text-stone-400 text-sm italic">{seq.tradition}</p>
          {seq.source_url && (
            <a
              href={seq.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2"
            >
              {seq.source_url}
            </a>
          )}
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium ${STYLE_COLORS[seq.style]}`}>
            {seq.style}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${DIFFICULTY_COLORS[seq.difficulty]}`}>
            {seq.difficulty}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600">
            {seq.duration_minutes} min
          </span>
          {seq.element && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 capitalize">
              {seq.element} element
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-500 capitalize">
            {seq.intensity_curve.replace('-', ' ')} curve
          </span>
        </div>

        {/* Description */}
        <p className="text-stone-600 leading-relaxed text-sm mb-6 max-w-2xl">{seq.description}</p>

        {/* Intensity arc */}
        <div className="mb-8 border border-stone-100 rounded-xl p-4 max-w-sm">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">Intensity arc</p>
          <SequenceArc intensityCurve={seq.intensity_curve} accentColor={seq.accent_color} />
        </div>

        {/* Chakra summary */}
        {allChakras.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Chakras engaged</p>
            <div className="flex flex-wrap gap-2">
              {allChakras.map(chakraName => {
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

        {/* Unavailable notice */}
        {!seq.available && (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-6 py-10 text-center">
            <p className="text-stone-400 text-sm font-medium mb-1">Pose list coming soon</p>
            <p className="text-stone-400 text-sm max-w-sm mx-auto">
              This sequence will be populated once the yang-mode pose library is seeded.
            </p>
          </div>
        )}

        {/* Pose table */}
        {seq.available && resolvedPoses.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
                Sequence — {resolvedPoses.length} poses
              </p>
              <p className="text-xs text-stone-400">{totalMinutes} min mat time</p>
            </div>

            <div className="rounded-xl border border-stone-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="text-left text-xs font-medium text-stone-400 px-4 py-3 w-8">#</th>
                    <th className="text-left text-xs font-medium text-stone-400 px-4 py-3">Pose</th>
                    <th className="text-left text-xs font-medium text-stone-400 px-4 py-3 hidden sm:table-cell">Phase</th>
                    <th className="text-right text-xs font-medium text-stone-400 px-4 py-3">Hold</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedPoses.map((rp, i) => (
                    <tr key={i} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-stone-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {rp.pose ? (
                            <Link
                              href={`/poses/${rp.slug}`}
                              className="font-medium text-stone-800 hover:text-stone-600 hover:underline underline-offset-2"
                            >
                              {resolveDisplayName(rp.pose, seq.style)}
                            </Link>
                          ) : (
                            <span className="font-medium text-stone-400">{rp.slug}</span>
                          )}
                          {rp.pose && (
                            <span className="text-xs text-stone-400 italic hidden sm:inline">{rp.pose.sanskrit}</span>
                          )}
                          {rp.side === 'both' && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full">both sides</span>
                          )}
                        </div>
                        {rp.note && (
                          <p className="text-xs text-stone-400 mt-1 leading-relaxed max-w-prose">{rp.note}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-stone-500 capitalize">
                          {POSITION_LABELS[rp.sequencing_position]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-medium text-stone-600 whitespace-nowrap">
                          {rp.hold_minutes} min
                          {(rp.side === 'both' || (rp.pose?.bilateral && !rp.side)) && (
                            <span className="text-stone-400 font-normal"> × 2</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Session analytics */}
        {seq.available && (
          <div className="mt-8 pt-6 border-t border-stone-100">
            <SequenceAnalytics poses={weightedPoses} />
          </div>
        )}

        {/* Tags */}
        {seq.tags.length > 0 && (
          <div className="mt-8 pt-6 border-t border-stone-100">
            <div className="flex flex-wrap gap-1.5">
              {seq.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
