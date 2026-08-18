'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Style } from '@/lib/pipeline/types'
import type { ReferenceSequence } from '@/lib/reference-sequences'
import SequenceArc from '@/components/sequence/SequenceArc'

interface Props {
  sequences: ReferenceSequence[]
}

const STYLES: { id: Style; label: string }[] = [
  { id: 'yin',         label: 'Yin' },
  { id: 'restorative', label: 'Restorative' },
  { id: 'vinyasa',     label: 'Vinyasa' },
  { id: 'ashtanga',    label: 'Ashtanga' },
]

const DIFFICULTY_COLORS = {
  beginner:     'bg-emerald-100 text-emerald-800',
  intermediate: 'bg-amber-100 text-amber-800',
  advanced:     'bg-red-100 text-red-800',
}

export default function SequencesClient({ sequences }: Props) {
  const [activeStyle, setActiveStyle] = useState<Style>('yin')

  const filtered = sequences.filter(s => s.style === activeStyle)
  const hasAvailable = filtered.some(s => s.available)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-stone-900 mb-1">Reference Sequences</h1>
          <p className="text-stone-500 text-sm max-w-xl">
            Community and research-backed sequences for each yoga style. Use these as a benchmark
            for what a well-paced class looks like, and as a starting point for your own.
          </p>
        </div>

        {/* Style tabs */}
        <div className="flex gap-1 mb-8 border-b border-stone-100 pb-0">
          {STYLES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveStyle(id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors -mb-px border-b-2 ${
                activeStyle === id
                  ? 'text-stone-900 border-stone-900'
                  : 'text-stone-400 border-transparent hover:text-stone-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Coming soon notice for unavailable styles */}
        {!hasAvailable && (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-6 py-10 text-center">
            <p className="text-stone-400 text-sm font-medium mb-1">Coming soon</p>
            <p className="text-stone-400 text-sm max-w-sm mx-auto">
              {activeStyle === 'vinyasa'
                ? 'Vinyasa reference sequences are planned once the yang-mode pose library is seeded.'
                : 'Ashtanga reference sequences are planned once the yang-mode pose library is seeded.'}
            </p>
          </div>
        )}

        {/* Sequence cards */}
        {hasAvailable && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map(seq => (
              <Link
                key={seq.id}
                href={`/sequences/${seq.id}`}
                className="group block rounded-2xl border border-stone-100 bg-white hover:border-stone-200 hover:shadow-sm transition-all p-5"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors mb-0.5">
                      {seq.title}
                    </h2>
                    <p className="text-xs text-stone-400">{seq.tradition}</p>
                  </div>
                  {/* Duration */}
                  <span className="text-xs font-medium bg-stone-50 text-stone-500 px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                    {seq.duration_minutes} min
                  </span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${DIFFICULTY_COLORS[seq.difficulty]}`}>
                    {seq.difficulty}
                  </span>
                  {seq.element && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 capitalize">
                      {seq.element} element
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 capitalize">
                    {seq.intensity_curve.replace('-', ' ')} curve
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                    {seq.poses.length} poses
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-stone-500 leading-relaxed mb-4 line-clamp-2">
                  {seq.description}
                </p>

                {/* Intensity arc */}
                <SequenceArc intensityCurve={seq.intensity_curve} accentColor={seq.accent_color} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
