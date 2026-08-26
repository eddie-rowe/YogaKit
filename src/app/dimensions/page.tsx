'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CONTRAINDICATION_OPTIONS, ALL_PROPS } from '@/lib/contraindications'
import type { SessionContext } from '@/lib/pipeline/types'
import type {
  Style,
  Season,
  FiveElement,
  ExperienceLevel,
  IntensityCurve,
} from '@/lib/pose-types'

type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'

interface FormState {
  style: Style
  durationMinutes: number
  elementFocus: FiveElement | ''
  season: Season
  experienceLevel: ExperienceLevel
  timeOfDay: TimeOfDay | ''
  intensityCurve: IntensityCurve
  theme: string
  goal: string
  contraindications: Set<string>
  propsAvailable: Set<string>
}

const INITIAL_FORM: FormState = {
  style: 'yin',
  durationMinutes: 75,
  elementFocus: '',
  season: 'spring',
  experienceLevel: 'mixed',
  timeOfDay: '',
  intensityCurve: 'bell',
  theme: '',
  goal: '',
  contraindications: new Set(),
  propsAvailable: new Set(),
}

function toggleSetItem(prev: Set<string>, value: string): Set<string> {
  const next = new Set(prev)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return next
}

export default function DimensionsPage() {
  return (
    <Suspense>
      <DimensionsForm />
    </Suspense>
  )
}

function DimensionsForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)
  const bufferRef = useRef('')

  // Pre-fill from ?style=yin&duration=60&element=water (e.g. from reference sequences)
  useEffect(() => {
    const style = searchParams.get('style') as Style | null
    const duration = searchParams.get('duration')
    const element = searchParams.get('element') as FiveElement | null
    if (style || duration || element) {
      setForm(prev => ({
        ...prev,
        ...(style ? { style } : {}),
        ...(duration ? { durationMinutes: parseInt(duration, 10) } : {}),
        ...(element ? { elementFocus: element } : {}),
      }))
    }
  }, [searchParams])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setStage('Preparing session…')
    bufferRef.current = ''

    const context: SessionContext = {
      style: form.style,
      durationMinutes: form.durationMinutes,
      season: form.season,
      experienceLevel: form.experienceLevel,
      intensityCurve: form.intensityCurve,
      ...(form.elementFocus ? { elementFocus: form.elementFocus } : {}),
      ...(form.timeOfDay ? { timeOfDay: form.timeOfDay } : {}),
      ...(form.theme ? { theme: form.theme } : {}),
      ...(form.goal ? { goal: form.goal } : {}),
      hardConstraints: {
        contraindications: Array.from(form.contraindications),
        propsAvailable: Array.from(form.propsAvailable),
      },
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify(context),
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok || !res.body) {
        throw new Error(`Server error: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        bufferRef.current += decoder.decode(value, { stream: true })

        // SSE blocks are separated by double newlines; keep any incomplete block
        const blocks = bufferRef.current.split('\n\n')
        bufferRef.current = blocks.pop() ?? ''

        for (const block of blocks) {
          if (!block.trim()) continue

          let eventType = 'message'
          let dataLine = ''

          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) {
              eventType = line.slice('event:'.length).trim()
            } else if (line.startsWith('data:')) {
              dataLine = line.slice('data:'.length).trim()
            }
          }

          if (!dataLine) continue

          if (eventType === 'progress') {
            try {
              const parsed = JSON.parse(dataLine)
              setStage(parsed.stage ?? dataLine)
            } catch {
              setStage(dataLine)
            }
          } else if (eventType === 'sequence') {
            const parsed = JSON.parse(dataLine)
            sessionStorage.setItem('krama_sequence', JSON.stringify(parsed))
            router.push('/sequence')
            return
          } else if (eventType === 'error') {
            let msg = dataLine
            try {
              const parsed = JSON.parse(dataLine)
              msg = parsed.message ?? dataLine
            } catch {
              // raw string error is fine
            }
            setError(msg)
            setLoading(false)
            setStage('')
            return
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setLoading(false)
      setStage('')
    }
  }

  const inputBase =
    'w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent disabled:opacity-50'

  const sectionLabel = 'block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5'

  return (
    <main className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-stone-100 p-8">
          <h1 className="text-2xl font-semibold text-stone-800 mb-1">New Session</h1>
          <p className="text-sm text-stone-500 mb-8">Set the dimensions for your sequence.</p>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200">
              <p className="flex-1 text-sm text-red-800">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 text-lg leading-none mt-0.5"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Zone 1 — Primary (always visible) */}

            {/* Row: Style + Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="style" className={sectionLabel}>
                  Style
                </label>
                <select
                  id="style"
                  value={form.style}
                  onChange={(e) => setField('style', e.target.value as Style)}
                  disabled={loading}
                  className={inputBase}
                >
                  <option value="yin">Yin</option>
                  <option value="vinyasa">Vinyasa</option>
                  <option value="ashtanga">Ashtanga</option>
                  <option value="restorative">Restorative</option>
                </select>
              </div>
              <div>
                <label htmlFor="duration" className={sectionLabel}>
                  Duration
                </label>
                <select
                  id="duration"
                  value={form.durationMinutes}
                  onChange={(e) => setField('durationMinutes', Number(e.target.value))}
                  disabled={loading}
                  className={inputBase}
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={75}>75 min</option>
                  <option value={90}>90 min</option>
                </select>
              </div>
            </div>

            {/* Row: Experience Level + Intensity Curve */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="experienceLevel" className={sectionLabel}>
                  Experience Level
                </label>
                <select
                  id="experienceLevel"
                  value={form.experienceLevel}
                  onChange={(e) =>
                    setField('experienceLevel', e.target.value as ExperienceLevel)
                  }
                  disabled={loading}
                  className={inputBase}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label htmlFor="intensityCurve" className={sectionLabel}>
                  Intensity Curve
                </label>
                <select
                  id="intensityCurve"
                  value={form.intensityCurve}
                  onChange={(e) =>
                    setField('intensityCurve', e.target.value as IntensityCurve)
                  }
                  disabled={loading}
                  className={inputBase}
                >
                  <option value="bell">Bell (warm up → peak → cool down)</option>
                  <option value="plateau">Plateau (steady state throughout)</option>
                  <option value="gradual-ramp">Gradual Ramp (slowly builds)</option>
                  <option value="front-loaded">Front-Loaded (peak early)</option>
                  <option value="back-loaded">Back-Loaded (peak late)</option>
                </select>
              </div>
            </div>

            {/* Submit — Zone 1 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-stone-800 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-700 active:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden="true"
                  />
                  Generating…
                </>
              ) : (
                'Generate Sequence'
              )}
            </button>

            {/* More options toggle */}
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="w-full text-sm text-stone-500 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300 rounded-md py-1 transition-colors"
            >
              {showMore ? 'Fewer options ▴' : 'More options ▾'}
            </button>

            {/* Zone 2 — More options (collapsible) */}
            {showMore && (
              <>
                {/* Row: Element Focus + Season */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="elementFocus" className={sectionLabel}>
                      Element Focus
                    </label>
                    <select
                      id="elementFocus"
                      value={form.elementFocus}
                      onChange={(e) => setField('elementFocus', e.target.value as FiveElement | '')}
                      disabled={loading}
                      className={inputBase}
                    >
                      <option value="">None</option>
                      <option value="wood">Wood</option>
                      <option value="fire">Fire</option>
                      <option value="earth">Earth</option>
                      <option value="metal">Metal</option>
                      <option value="water">Water</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="season" className={sectionLabel}>
                      Season
                    </label>
                    <select
                      id="season"
                      value={form.season}
                      onChange={(e) => setField('season', e.target.value as Season)}
                      disabled={loading}
                      className={inputBase}
                    >
                      <option value="spring">Spring</option>
                      <option value="summer">Summer</option>
                      <option value="late-summer">Late Summer</option>
                      <option value="autumn">Autumn</option>
                      <option value="winter">Winter</option>
                    </select>
                  </div>
                </div>

                {/* Row: Time of Day */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="timeOfDay" className={sectionLabel}>
                      Time of Day{' '}
                      <span className="normal-case font-normal text-stone-400">(optional)</span>
                    </label>
                    <select
                      id="timeOfDay"
                      value={form.timeOfDay}
                      onChange={(e) => setField('timeOfDay', e.target.value as TimeOfDay | '')}
                      disabled={loading}
                      className={inputBase}
                    >
                      <option value="">—</option>
                      <option value="morning">Morning</option>
                      <option value="midday">Midday</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                      <option value="night">Night</option>
                    </select>
                  </div>
                </div>

                {/* Theme + Goal */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="theme" className={sectionLabel}>
                      Theme{' '}
                      <span className="normal-case font-normal text-stone-400">(optional)</span>
                    </label>
                    <input
                      id="theme"
                      type="text"
                      value={form.theme}
                      onChange={(e) => setField('theme', e.target.value)}
                      disabled={loading}
                      placeholder="e.g. 'Letting go' or 'Rooting into earth'"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label htmlFor="goal" className={sectionLabel}>
                      Goal{' '}
                      <span className="normal-case font-normal text-stone-400">(optional)</span>
                    </label>
                    <input
                      id="goal"
                      type="text"
                      value={form.goal}
                      onChange={(e) => setField('goal', e.target.value)}
                      disabled={loading}
                      placeholder="e.g. 'Hip opening', 'Stress relief'"
                      className={inputBase}
                    />
                  </div>
                </div>

                {/* Contraindications */}
                <div>
                  <span className={sectionLabel}>Contraindications</span>
                  <div className="h-48 overflow-y-auto rounded-md border border-stone-200 p-3 space-y-1">
                    {CONTRAINDICATION_OPTIONS.map(({ slug, label }) => (
                      <label
                        key={slug}
                        className="flex items-center gap-2.5 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={form.contraindications.has(slug)}
                          onChange={() =>
                            setField(
                              'contraindications',
                              toggleSetItem(form.contraindications, slug),
                            )
                          }
                          disabled={loading}
                          className="h-4 w-4 rounded border-stone-300 text-stone-700 focus:ring-stone-400 disabled:opacity-50"
                        />
                        <span className="text-sm text-stone-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Props available */}
                <div>
                  <span className={sectionLabel}>Props Available</span>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 pt-0.5">
                    {ALL_PROPS.map((prop) => (
                      <label
                        key={prop}
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={form.propsAvailable.has(prop)}
                          onChange={() =>
                            setField('propsAvailable', toggleSetItem(form.propsAvailable, prop))
                          }
                          disabled={loading}
                          className="h-4 w-4 rounded border-stone-300 text-stone-700 focus:ring-stone-400 disabled:opacity-50"
                        />
                        <span className="text-sm text-stone-700 capitalize">{prop}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {/* Progress overlay */}
      {loading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm"
          aria-live="polite"
          aria-label="Generating sequence"
        >
          <div className="rounded-xl bg-white shadow-xl px-8 py-7 max-w-xs w-full text-center">
            <div className="mb-4 flex justify-center">
              <span
                className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-stone-300 border-t-stone-700"
                aria-hidden="true"
              />
            </div>
            <p className="text-sm font-medium text-stone-700">{stage || 'Working…'}</p>
            <p className="mt-1 text-xs text-stone-400 tracking-wide">
              This may take a moment
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
