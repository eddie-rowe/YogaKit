'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import type { ValidatedSequence, SequenceItem, Pose } from '@/lib/pipeline/types'
import SequenceAnalytics from '@/components/sequence/SequenceAnalytics'
import { effectiveMinutes } from '@/lib/pose-library/sequence-stats'
import { resolveDisplayName } from '@/lib/pose-library/display-name'

function slugToTitle(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function modeBadge(mode: SequenceItem['modeType']) {
  if (mode === 'yin') return 'bg-indigo-100 text-indigo-800'
  if (mode === 'yang') return 'bg-amber-100 text-amber-800'
  return 'bg-green-100 text-green-800'
}

function modeLabel(mode: SequenceItem['modeType']) {
  if (mode === 'yin') return 'Yin'
  if (mode === 'yang') return 'Yang'
  return 'Both'
}

function sideLabel(side: SequenceItem['side']) {
  if (side === 'right') return '(Right side)'
  if (side === 'left') return '(Left side)'
  return null
}

function AlternatesDisclosure({
  alternates,
  onSwap,
}: {
  alternates: SequenceItem['alternates']
  onSwap?: (alt: Pose) => void
}) {
  const [open, setOpen] = useState(false)
  const shown = alternates.slice(0, 3)

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1"
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>Alternates ({shown.length})</span>
      </button>
      {open && (
        <ul className="mt-1 pl-4 space-y-0.5">
          {shown.map(alt => (
            <li key={alt.slug} className="text-xs text-stone-600 flex items-center gap-2">
              <span>
                {alt.english}
                {alt.sanskrit ? (
                  <span className="italic text-stone-400 ml-1">· {alt.sanskrit}</span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => onSwap?.(alt)}
                className="ml-auto text-xs text-[#3d3530] hover:underline shrink-0"
              >
                Swap in
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NoSequenceFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-stone-500 text-lg">No sequence found.</p>
        <Link
          href="/dimensions"
          className="inline-block text-sm text-stone-700 underline underline-offset-2 hover:text-stone-900"
        >
          ← Back to dimensions
        </Link>
      </div>
    </div>
  )
}

export default function SequencePage() {
  const [sequence, setSequence] = useState<ValidatedSequence | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [items, setItems] = useState<SequenceItem[]>([])
  const [modified, setModified] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('krama_sequence')
      if (raw) {
        const parsed = JSON.parse(raw) as ValidatedSequence
        setSequence(parsed)
        setItems(parsed.items)
      }
    } catch {
      // sequence stays null
    }
    setLoaded(true)
  }, [])

  if (!loaded) return null
  if (!sequence) return <NoSequenceFound />

  const ctx = sequence.sessionContext
  const totalMinutes = sequence.totalHoldMinutes

  // Build a slug→name lookup from all items (and their alternates) for safety note display
  const poseNameBySlug: Record<string, string> = {}
  for (const item of sequence.items) {
    poseNameBySlug[item.pose.slug] = resolveDisplayName(item.pose, ctx.style)
    for (const alt of item.alternates) {
      poseNameBySlug[alt.slug] = resolveDisplayName(alt, ctx.style)
    }
  }
  function resolvePoseName(slug: string): string {
    return poseNameBySlug[slug] ?? slugToTitle(slug)
  }

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        <header className="flex items-center justify-between">
          <Link
            href="/dimensions"
            className="flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"
          >
            <span>←</span>
            <span className="hidden sm:inline">New sequence</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <h1 className="text-base sm:text-xl font-semibold text-stone-800 tracking-tight">
            Sequence Review
          </h1>
          <Link
            href="/sequence/export"
            className="text-sm text-stone-600 hover:text-stone-900 border border-stone-300 rounded-md px-3 py-1.5 hover:bg-stone-100 transition-colors"
          >
            Export
          </Link>
        </header>

        <div className="bg-white border border-stone-100 rounded-lg shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
              Session Summary
            </h2>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            {ctx.style && (
              <div>
                <dt className="text-stone-400 text-xs uppercase tracking-wide">Style</dt>
                <dd className="text-stone-800 capitalize">{ctx.style}</dd>
              </div>
            )}
            {ctx.durationMinutes && (
              <div>
                <dt className="text-stone-400 text-xs uppercase tracking-wide">Duration</dt>
                <dd className="text-stone-800">{ctx.durationMinutes} min</dd>
              </div>
            )}
            {ctx.elementFocus && (
              <div>
                <dt className="text-stone-400 text-xs uppercase tracking-wide">Element focus</dt>
                <dd className="text-stone-800 capitalize">{ctx.elementFocus}</dd>
              </div>
            )}
            {ctx.season && (
              <div>
                <dt className="text-stone-400 text-xs uppercase tracking-wide">Season</dt>
                <dd className="text-stone-800 capitalize">{ctx.season}</dd>
              </div>
            )}
            {ctx.experienceLevel && (
              <div>
                <dt className="text-stone-400 text-xs uppercase tracking-wide">Experience</dt>
                <dd className="text-stone-800 capitalize">{ctx.experienceLevel}</dd>
              </div>
            )}
            {sequence.themeStatement && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-stone-400 text-xs uppercase tracking-wide">Theme</dt>
                <dd className="text-stone-800">{sequence.themeStatement}</dd>
              </div>
            )}
            {sequence.transitionMinutes !== undefined && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-stone-400 text-xs uppercase tracking-wide">Timing</dt>
                <dd className="text-stone-800">
                  {sequence.totalHoldMinutes} min hold + {sequence.transitionMinutes} min transitions ≈ {sequence.totalSessionMinutes} min
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Session analytics */}
        {items.length > 0 && (
          <div className="bg-white border border-stone-100 rounded-lg shadow-sm p-5">
            <SequenceAnalytics
              poses={items.map(item => ({
                pose: item.pose,
                minutes: effectiveMinutes(item.holdMinutes, item.pose, item.side),
              }))}
            />
          </div>
        )}

        {sequence.philosophicalFraming && (
          <div className="bg-white border border-stone-100 rounded-lg shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
              Philosophical Framing
            </h2>
            <blockquote className="border-l-2 border-stone-300 pl-4 italic text-stone-600 text-sm leading-relaxed">
              {sequence.philosophicalFraming}
            </blockquote>
            {sequence.quote?.text && (
              <div className="pt-1">
                <p className="text-stone-600 text-sm italic">"{sequence.quote.text}"</p>
                {sequence.quote.attribution && (
                  <p className="text-stone-400 text-xs mt-1">— {sequence.quote.attribution}</p>
                )}
              </div>
            )}
            {sequence.sutra?.text && (
              <div className="pt-2 border-t border-stone-100 mt-2">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Yoga Sutra</p>
                <p className="text-stone-600 text-sm italic">"{sequence.sutra.text}"</p>
                <p className="text-stone-400 text-xs mt-1">— {sequence.sutra.attribution}</p>
              </div>
            )}
          </div>
        )}

        {sequence.safetyNotes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">
              Safety Notes
            </h2>
            <ul className="space-y-3">
              {sequence.safetyNotes.map((note, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <div className="space-y-0.5">
                      <p>
                        <span className="font-medium text-amber-900">
                          {resolvePoseName(note.poseSlug)}
                        </span>
                        <span className="text-amber-700 ml-2">{note.issue}</span>
                      </p>
                      <p className="text-amber-600 text-xs">
                        Action:{' '}
                        <span className="capitalize font-medium">
                          {note.action.replace('-', ' ')}
                        </span>
                        {note.replacedWith && (
                          <span> → <span className="font-medium">{resolvePoseName(note.replacedWith)}</span></span>
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide px-1">
            Sequence ({items.length} poses)
          </h2>
          <ol className="space-y-3">
            {items.map((item, index) => (
              <li
                key={`${item.pose.slug}-${index}`}
                className="bg-white border border-stone-100 hover:border-stone-300 rounded-lg shadow-sm p-4 flex gap-4 transition-colors"
              >
                <div className="shrink-0 w-7 h-7 rounded-full bg-stone-800 text-white text-xs font-semibold flex items-center justify-center">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <span className="font-semibold text-stone-800">{resolveDisplayName(item.pose, ctx.style)}</span>
                      {item.pose.sanskrit && (
                        <span className="italic text-stone-400 text-sm ml-2">
                          {item.pose.sanskrit}
                        </span>
                      )}
                      {sideLabel(item.side) && (
                        <span className="ml-2 text-stone-500 text-sm">{sideLabel(item.side)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${modeBadge(item.modeType)}`}
                      >
                        {modeLabel(item.modeType)}
                      </span>
                      <span className="text-xs text-stone-500 whitespace-nowrap">
                        {item.holdMinutes} min
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="inline-block text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded capitalize">
                      {item.pose.body_position}
                    </span>
                  </div>
                  {item.why && (
                    <p className="italic text-stone-500 text-xs leading-relaxed">{item.why}</p>
                  )}
                  {index > 0 && item.transitionFromPrev && (
                    <p className="text-stone-400 text-xs">
                      Transition: {item.transitionFromPrev}
                    </p>
                  )}
                  {item.alternates.length > 0 && (
                    <AlternatesDisclosure
                      alternates={item.alternates}
                      onSwap={(alt) => {
                        setItems(prev => prev.map((it, idx) =>
                          idx === index
                            ? { ...it, pose: alt, alternates: it.alternates.filter(a => a.slug !== alt.slug) }
                            : it
                        ))
                        setModified(true)
                      }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <footer className="bg-white border border-stone-100 rounded-lg shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-stone-600 flex-wrap">
            <span className="whitespace-nowrap">
              Total hold time:{' '}
              <span className="font-semibold text-stone-800">{totalMinutes} min</span>
            </span>
            <span className="flex items-center gap-1">
              {sequence.passedValidation ? (
                <>
                  <span className="text-green-500 text-base">✓</span>
                  <span className="text-green-700 text-xs font-medium">Validation passed</span>
                </>
              ) : (
                <>
                  <span className="text-red-500 text-base">⚠</span>
                  <span className="text-red-700 text-xs font-medium">Validation failed</span>
                </>
              )}
            </span>
            {modified && (
              <span className="text-xs text-amber-700 flex items-center gap-1">
                <AlertTriangle size={12} />
                Modified — re-validate before teaching
              </span>
            )}
          </div>
          <Link
            href="/sequence/export"
            className="text-sm text-stone-700 hover:text-stone-900 underline underline-offset-2"
          >
            Export →
          </Link>
        </footer>

      </div>
    </div>
  )
}
