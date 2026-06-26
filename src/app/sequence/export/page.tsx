'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ValidatedSequence, SequenceItem, PoseMode } from '@/lib/pipeline/types'
import './print.css'

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr`
  return `${h} hr ${m} min`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function getCueNotes(item: SequenceItem): string {
  const mode: PoseMode | undefined = item.pose.modes.find(
    (m) => m.type === item.modeType
  ) ?? item.pose.modes[0]
  return mode?.cue_notes ?? ''
}

function formatHold(item: SequenceItem): string {
  const mode: PoseMode | undefined = item.pose.modes.find(
    (m) => m.type === item.modeType
  ) ?? item.pose.modes[0]
  if (!mode) return `${item.holdMinutes} min`
  const { min, max } = mode.hold_range
  if (min === max) return `${min} min`
  return `${min}–${max} min`
}

export default function ExportPage() {
  const [sequence, setSequence] = useState<ValidatedSequence | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('krama_sequence')
    if (raw) {
      try {
        setSequence(JSON.parse(raw) as ValidatedSequence)
      } catch {
        setSequence(null)
      }
    }
    setLoaded(true)
  }, [])

  if (!loaded) {
    return null
  }

  if (!sequence) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-lg text-gray-600">Nothing to export.</p>
        <Link href="/sequence" className="text-[#3d3530] underline underline-offset-2 hover:text-stone-900">
          ← Back to sequence builder
        </Link>
      </main>
    )
  }

  const ctx = sequence.sessionContext
  const hasSafetyNotes = sequence.safetyNotes && sequence.safetyNotes.length > 0

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 font-serif text-gray-900 print-page">

      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href="/sequence"
          className="text-[#3d3530] underline underline-offset-2 hover:text-stone-900 text-sm"
        >
          ← Back to sequence
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-[#3d3530] hover:bg-[#2e2822] text-white text-sm font-sans font-medium px-4 py-2 rounded-md transition-colors"
        >
          Print cue sheet
        </button>
      </div>

      <header className="mb-8 border-b border-gray-300 pb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-1">{sequence.themeStatement}</h1>
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-700">
          <div className="flex gap-2">
            <span className="font-semibold w-20 shrink-0">Date:</span>
            <span className="border-b border-gray-400 flex-1 print-blank-line">&nbsp;</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold w-20 shrink-0">Duration:</span>
            <span>{ctx.durationMinutes ? formatDuration(ctx.durationMinutes) : '—'}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold w-20 shrink-0">Style:</span>
            <span>{ctx.style ? capitalize(ctx.style) : '—'}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold w-20 shrink-0">Element:</span>
            <span>{ctx.elementFocus ? capitalize(ctx.elementFocus) : '—'}</span>
          </div>
          {ctx.experienceLevel && (
            <div className="flex gap-2">
              <span className="font-semibold w-20 shrink-0">Level:</span>
              <span>{capitalize(ctx.experienceLevel)}</span>
            </div>
          )}
          {ctx.theme && (
            <div className="flex gap-2 col-span-2">
              <span className="font-semibold w-20 shrink-0">Theme:</span>
              <span>{ctx.theme}</span>
            </div>
          )}
        </div>
      </header>

      {sequence.philosophicalFraming && (
        <section className="mb-6">
          <p className="italic text-gray-700 leading-relaxed">{sequence.philosophicalFraming}</p>
        </section>
      )}

      {sequence.quote?.text && (
        <blockquote className="mb-8 border-l-4 border-gray-300 pl-4">
          <p className="italic text-gray-800">&ldquo;{sequence.quote.text}&rdquo;</p>
          {sequence.quote.attribution && (
            <footer className="mt-1 text-sm text-gray-600">— {sequence.quote.attribution}</footer>
          )}
        </blockquote>
      )}

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3 uppercase tracking-wide text-gray-800">Sequence</h2>
        <div className="overflow-x-auto">
          <table className="pose-table w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="pose-table-cell font-semibold w-8">#</th>
                <th className="pose-table-cell font-semibold">Pose</th>
                <th className="pose-table-cell font-semibold w-16">Mode</th>
                <th className="pose-table-cell font-semibold w-20">Hold</th>
                <th className="pose-table-cell font-semibold w-16">Side</th>
                <th className="pose-table-cell font-semibold">Cue notes</th>
                <th className="pose-table-cell font-semibold">Transition to next</th>
              </tr>
            </thead>
            <tbody>
              {sequence.items.map((item, idx) => (
                <tr key={`${item.pose.slug}-${idx}`} className="align-top pose-row">
                  <td className="pose-table-cell text-gray-500">{idx + 1}</td>
                  <td className="pose-table-cell">
                    <span className="font-medium">{item.pose.english}</span>
                    {item.pose.sanskrit && (
                      <span className="block text-xs text-gray-500 italic">{item.pose.sanskrit}</span>
                    )}
                  </td>
                  <td className="pose-table-cell capitalize">{item.modeType}</td>
                  <td className="pose-table-cell">{formatHold(item)}</td>
                  <td className="pose-table-cell capitalize">
                    {item.pose.bilateral ? (item.side ?? 'both') : '—'}
                  </td>
                  <td className="pose-table-cell text-gray-700">{getCueNotes(item)}</td>
                  <td className="pose-table-cell text-gray-700">{item.transitionToNext}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {hasSafetyNotes && (
        <section className="mb-8 safety-notes">
          <h2 className="text-lg font-bold mb-3 uppercase tracking-wide text-gray-800">Safety notes</h2>
          <ul className="space-y-2">
            {sequence.safetyNotes.map((note, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex gap-2">
                <span className="font-semibold shrink-0 text-amber-700">
                  {note.action === 'replaced' ? 'Replaced' : 'Gap inserted'}:
                </span>
                <span>
                  <span className="font-medium">{note.poseSlug}</span> — {note.issue}
                  {note.replacedWith && (
                    <span className="text-gray-600"> (substituted: {note.replacedWith})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sequence.timingSumWarning && (
        <p className="mb-6 text-sm text-amber-700 italic no-print">{sequence.timingSumWarning}</p>
      )}

      <footer className="mt-12 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center print-footer">
        Generated by Krama — free yoga sequencing tool
      </footer>
    </main>
  )
}
