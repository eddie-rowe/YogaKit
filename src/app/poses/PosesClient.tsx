'use client'

import { useState, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { Pose, PoseTypeTag, MuscleGroup, FiveElement, NervousSystemEffect, SequencingPosition } from '@/lib/pipeline/types'
import { allSearchableNames, resolveDisplayName } from '@/lib/pose-library/display-name'
import PoseCard from './PoseCard'
import PoseOverlay from './PoseOverlay'

interface Props {
  poses: Pose[]
}

const ELEMENTS: FiveElement[] = ['wood', 'fire', 'earth', 'metal', 'water']

// Active state classes for element chips (always-visible row)
const ELEMENT_CHIP_ACTIVE: Record<FiveElement, string> = {
  wood:  'bg-green-100 text-green-800 border-green-300',
  fire:  'bg-red-100 text-red-800 border-red-300',
  earth: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  metal: 'bg-gray-200 text-gray-800 border-gray-400',
  water: 'bg-blue-100 text-blue-800 border-blue-300',
}

const BODY_POSITIONS = ['supine', 'prone', 'seated', 'kneeling', 'standing', 'inverted'] as const

const TYPE_TAGS: PoseTypeTag[] = [
  'forward-fold', 'backbend', 'twist', 'inversion', 'lateral-stretch',
  'hip-opener', 'heart-opener', 'groin-opener', 'hamstring-stretch',
  'quad-stretch', 'ankle-opener', 'shoulder-opener', 'spinal-compression',
  'spinal-traction', 'hip-flexor-release', 'outer-hip', 'chest-opener',
  'neck-release', 'sacrum-release', 'restorative', 'integration',
]

const MUSCLE_GROUPS: MuscleGroup[] = [
  'psoas', 'iliacus', 'hip-flexors', 'hamstrings', 'quadriceps', 'glutes',
  'piriformis', 'hip-adductors', 'hip-abductors', 'IT-band', 'lumbar-spine',
  'thoracic-spine', 'cervical-spine', 'spinal-erectors', 'chest-pectorals',
  'anterior-shoulder', 'posterior-shoulder', 'lats', 'rhomboids', 'trapezius',
  'intercostals', 'diaphragm', 'calves', 'tibialis-anterior', 'plantar-fascia',
  'achilles', 'ankle-ligaments', 'wrist-extensors', 'obliques', 'sacroiliac-ligaments',
]

type SortKey = 'alpha' | 'complexity-asc' | 'complexity-desc' | 'risk-asc' | 'risk-desc'

const NS_OPTIONS: NervousSystemEffect[] = ['parasympathetic', 'neutral', 'sympathetic']
const NS_COLORS: Record<NervousSystemEffect, string> = {
  parasympathetic: 'border-teal-400 bg-teal-50 text-teal-800',
  neutral:         'border-stone-300 bg-stone-50 text-stone-700',
  sympathetic:     'border-orange-400 bg-orange-50 text-orange-800',
}
const SEQ_OPTIONS: SequencingPosition[] = ['opening', 'building', 'peak', 'cooldown', 'integration']

type ViewMode = 'filter' | 'theme'

function slugifyEmotion(emotion: string) {
  return emotion.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function PosesClient({ poses }: Props) {
  const [search, setSearch] = useState('')
  const [filterElement, setFilterElement] = useState<FiveElement | ''>('')
  const [filterPosition, setFilterPosition] = useState('')
  const [filterTypeTags, setFilterTypeTags] = useState<PoseTypeTag[]>([])
  const [filterMuscleGroups, setFilterMuscleGroups] = useState<MuscleGroup[]>([])
  const [filterNS, setFilterNS] = useState<NervousSystemEffect | ''>('')
  const [filterSeqPosition, setFilterSeqPosition] = useState<SequencingPosition | ''>('')
  const [filterComplexityMax, setFilterComplexityMax] = useState(10)
  const [filterRiskMax, setFilterRiskMax] = useState(10)
  const [sortBy, setSortBy] = useState<SortKey>('alpha')
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('filter')
  const [themeFilterChakra, setThemeFilterChakra] = useState('')
  const [themeFilterDosha, setThemeFilterDosha] = useState('')
  const [themeFilterElement, setThemeFilterElement] = useState<FiveElement | ''>('')

  const filtered = useMemo(() => {
    let list = poses

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        allSearchableNames(p).some(n => n.toLowerCase().includes(q))
      )
    }

    if (filterElement) {
      list = list.filter(p => p.element === filterElement)
    }

    if (filterPosition) {
      list = list.filter(p => p.body_position === filterPosition)
    }

    if (filterTypeTags.length > 0) {
      list = list.filter(p => filterTypeTags.every(t => (p.type_tags ?? []).includes(t)))
    }

    if (filterMuscleGroups.length > 0) {
      list = list.filter(p => filterMuscleGroups.every(m => (p.muscle_groups ?? []).includes(m)))
    }

    if (filterNS) {
      list = list.filter(p => p.nervous_system_effect === filterNS)
    }

    if (filterSeqPosition) {
      list = list.filter(p => p.sequencing_position?.includes(filterSeqPosition))
    }

    list = list.filter(p => p.complexity <= filterComplexityMax && (p.injury_risk ?? 0) <= filterRiskMax)

    switch (sortBy) {
      case 'complexity-asc':  return [...list].sort((a, b) => a.complexity - b.complexity)
      case 'complexity-desc': return [...list].sort((a, b) => b.complexity - a.complexity)
      case 'risk-asc':        return [...list].sort((a, b) => (a.injury_risk ?? 0) - (b.injury_risk ?? 0))
      case 'risk-desc':       return [...list].sort((a, b) => (b.injury_risk ?? 0) - (a.injury_risk ?? 0))
      default:                return [...list].sort((a, b) => a.english.localeCompare(b.english))
    }
  }, [poses, search, filterElement, filterPosition, filterTypeTags, filterMuscleGroups, filterNS, filterSeqPosition, filterComplexityMax, filterRiskMax, sortBy])

  const themeGroups = useMemo(() => {
    const groups = new Map<string, Pose[]>()
    for (const pose of poses) {
      if (themeFilterElement && pose.element !== themeFilterElement) continue
      if (themeFilterChakra && !(pose.chakras ?? []).includes(themeFilterChakra as never)) continue
      if (themeFilterDosha) {
        const [dosha, effect] = themeFilterDosha.split(':') as [keyof NonNullable<Pose['dosha_affinity']>, string]
        if (pose.dosha_affinity?.[dosha] !== effect) continue
      }
      for (const e of pose.emotional_release_potential ?? []) {
        const list = groups.get(e.emotion) ?? []
        list.push(pose)
        groups.set(e.emotion, list)
      }
    }
    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([emotion, list]) => ({
        emotion,
        slug: slugifyEmotion(emotion),
        poses: [...list].sort((a, b) => resolveDisplayName(a).localeCompare(resolveDisplayName(b))),
      }))
  }, [poses, themeFilterElement, themeFilterChakra, themeFilterDosha])

  const openPose = useMemo(() => poses.find(p => p.slug === openSlug) ?? null, [poses, openSlug])

  const allChakras = useMemo(() => {
    const set = new Set<string>()
    for (const p of poses) for (const c of p.chakras ?? []) set.add(c)
    return [...set].sort()
  }, [poses])

  function toggleTypeTag(tag: PoseTypeTag) {
    setFilterTypeTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  function toggleMuscleGroup(m: MuscleGroup) {
    setFilterMuscleGroups(prev =>
      prev.includes(m) ? prev.filter(g => g !== m) : [...prev, m]
    )
  }

  function clearFilters() {
    setSearch('')
    setFilterElement('')
    setFilterPosition('')
    setFilterTypeTags([])
    setFilterMuscleGroups([])
    setFilterNS('')
    setFilterSeqPosition('')
    setFilterComplexityMax(10)
    setFilterRiskMax(10)
    setSortBy('alpha')
  }

  // All filters (used by "Clear all" visibility)
  const hasActiveFilters =
    search || filterElement || filterPosition || filterNS || filterSeqPosition ||
    filterTypeTags.length || filterMuscleGroups.length ||
    filterComplexityMax < 10 || filterRiskMax < 10

  // Only the filters living inside the Advanced panel (for the Advanced button indicator)
  const hasAdvancedFilters =
    filterNS || filterSeqPosition ||
    filterTypeTags.length || filterMuscleGroups.length ||
    filterComplexityMax < 10 || filterRiskMax < 10

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header
        className="backdrop-blur-md border-b px-4 py-4 sticky top-14 z-10"
        style={{ background: 'color-mix(in srgb, var(--background) 90%, transparent)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>Pose Library</h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{filtered.length} of {poses.length} poses</p>
            </div>
            <a href="/" className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'var(--muted)', transitionDuration: '150ms' }}>
              <ArrowLeft size={14} />
              Home
            </a>
          </div>

          {/* View mode toggle */}
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              data-testid="poses-view-toggle-filter"
              onClick={() => setViewMode('filter')}
              data-active={viewMode === 'filter'}
              className="kk-chip px-3 py-1 text-xs"
            >
              By filter
            </button>
            <button
              data-testid="poses-view-toggle-theme"
              onClick={() => setViewMode('theme')}
              data-active={viewMode === 'theme'}
              className="kk-chip px-3 py-1 text-xs"
            >
              By theme
            </button>
          </div>

          {viewMode === 'filter' && (
          <>
          {/* Search bar */}
          <input
            type="search"
            data-testid="poses-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search poses by name, Sanskrit, or alias…"
            className="kk-input w-full"
          />

          {/* Body position chips */}
          <div className="flex flex-wrap gap-1 mt-2" data-testid="poses-category-filter">
            <button onClick={() => setFilterPosition('')} data-active={!filterPosition} className="kk-chip px-3 py-1 text-xs">
              All
            </button>
            {BODY_POSITIONS.map(pos => (
              <button
                key={pos}
                onClick={() => setFilterPosition(prev => prev === pos ? '' : pos)}
                data-active={filterPosition === pos}
                className="kk-chip px-3 py-1 text-xs capitalize"
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Element chips */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            <button onClick={() => setFilterElement('')} data-active={!filterElement} className="kk-chip px-3 py-1 text-xs">
              All
            </button>
            {ELEMENTS.map(el => (
              <button
                key={el}
                onClick={() => setFilterElement(prev => prev === el ? '' : el)}
                className={`px-3 py-1 text-xs rounded-full border capitalize transition-colors ${
                  filterElement === el
                    ? ELEMENT_CHIP_ACTIVE[el]
                    : 'kk-chip'
                }`}
                style={{ transitionDuration: '150ms' }}
              >
                {el}
              </button>
            ))}
          </div>

          {/* Sort + Advanced filters row */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              className="kk-input px-3 py-1.5 text-sm w-auto"
            >
              <option value="alpha">A–Z</option>
              <option value="complexity-asc">Complexity ↑</option>
              <option value="complexity-desc">Complexity ↓</option>
              <option value="risk-asc">Risk ↑</option>
              <option value="risk-desc">Risk ↓</option>
            </select>
            <button
              onClick={() => setShowFilters(f => !f)}
              data-active={hasAdvancedFilters}
              className="kk-chip px-3 py-1.5 text-sm"
            >
              Advanced filters{hasAdvancedFilters ? ' (active)' : ''}
            </button>
          </div>

          {/* Advanced filter panel */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t space-y-4" style={{ borderColor: 'var(--border)' }}>
              {/* NS effect + sequencing position row */}
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Nervous system effect</label>
                  <div className="flex gap-1">
                    <button onClick={() => setFilterNS('')} data-active={!filterNS} className="kk-chip px-2 py-1 text-xs">
                      All
                    </button>
                    {NS_OPTIONS.map(ns => (
                      <button
                        key={ns}
                        onClick={() => setFilterNS(prev => prev === ns ? '' : ns)}
                        className={`px-2 py-1 text-xs rounded border capitalize transition-colors ${filterNS === ns ? NS_COLORS[ns] : 'kk-chip'}`}
                        style={{ transitionDuration: '150ms' }}
                      >
                        {ns}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Sequencing position</label>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => setFilterSeqPosition('')} data-active={!filterSeqPosition} className="kk-chip px-2 py-1 text-xs">
                      All
                    </button>
                    {SEQ_OPTIONS.map(pos => (
                      <button
                        key={pos}
                        onClick={() => setFilterSeqPosition(prev => prev === pos ? '' : pos)}
                        data-active={filterSeqPosition === pos}
                        className="kk-chip px-2 py-1 text-xs capitalize"
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Complexity + risk sliders */}
              <div className="flex gap-6">
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Max complexity: <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{filterComplexityMax}</span>
                  </label>
                  <input
                    type="range" min={1} max={10} value={filterComplexityMax}
                    onChange={e => setFilterComplexityMax(Number(e.target.value))}
                    className="block w-40 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Max injury risk: <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{filterRiskMax}</span>
                  </label>
                  <input
                    type="range" min={1} max={10} value={filterRiskMax}
                    onChange={e => setFilterRiskMax(Number(e.target.value))}
                    className="block w-40 mt-1"
                  />
                </div>
              </div>

              {/* Type tags */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Type tags (all selected must match)</label>
                <div className="flex flex-wrap gap-1">
                  {TYPE_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTypeTag(tag)}
                      data-active={filterTypeTags.includes(tag)}
                      className="kk-chip px-2 py-0.5 text-xs"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Muscle groups */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Muscle groups (all selected must match)</label>
                <div className="flex flex-wrap gap-1">
                  {MUSCLE_GROUPS.map(m => (
                    <button
                      key={m}
                      onClick={() => toggleMuscleGroup(m)}
                      data-active={filterMuscleGroups.includes(m)}
                      className="kk-chip px-2 py-0.5 text-xs"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs underline transition-colors"
                  style={{ color: 'var(--warning)', transitionDuration: '150ms' }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
          </>
          )}

          {viewMode === 'theme' && (
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Element</label>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => setThemeFilterElement('')} data-active={!themeFilterElement} className="kk-chip px-2 py-1 text-xs">
                    All
                  </button>
                  {ELEMENTS.map(el => (
                    <button
                      key={el}
                      onClick={() => setThemeFilterElement(prev => prev === el ? '' : el)}
                      data-active={themeFilterElement === el}
                      className="kk-chip px-2 py-1 text-xs capitalize"
                    >
                      {el}
                    </button>
                  ))}
                </div>
              </div>

              {allChakras.length > 0 && (
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Chakra</label>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => setThemeFilterChakra('')} data-active={!themeFilterChakra} className="kk-chip px-2 py-1 text-xs">
                      All
                    </button>
                    {allChakras.map(c => (
                      <button
                        key={c}
                        onClick={() => setThemeFilterChakra(prev => prev === c ? '' : c)}
                        data-active={themeFilterChakra === c}
                        className="kk-chip px-2 py-1 text-xs capitalize"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Dosha affinity</label>
                <select
                  value={themeFilterDosha}
                  onChange={e => setThemeFilterDosha(e.target.value)}
                  className="kk-input px-2 py-1 text-xs w-auto"
                >
                  <option value="">All</option>
                  {(['vata', 'pitta', 'kapha'] as const).flatMap(d =>
                    (['balancing', 'neutral', 'aggravating'] as const).map(effect => (
                      <option key={`${d}:${effect}`} value={`${d}:${effect}`}>{d}: {effect}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}
        </div>
      </header>

      {viewMode === 'theme' ? (
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
          {themeGroups.length === 0 ? (
            <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
              <p className="text-lg">No poses tagged with an emotional theme yet.</p>
            </div>
          ) : (
            themeGroups.map(group => (
              <section key={group.slug} data-testid={`poses-theme-section-${group.slug}`}>
                <h2 className="font-serif text-lg font-semibold capitalize mb-2" style={{ color: 'var(--foreground)' }}>
                  {group.emotion}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {group.poses.map(pose => (
                    <button
                      key={pose.slug}
                      data-testid={`poses-card-${pose.slug}`}
                      onClick={() => setOpenSlug(pose.slug)}
                      className="kk-chip px-3 py-1.5 text-sm"
                    >
                      {resolveDisplayName(pose)}
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      ) : (
      <main className="max-w-7xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
            <p className="text-lg">No poses match your filters.</p>
            <button onClick={clearFilters} className="mt-2 text-sm underline transition-colors" style={{ transitionDuration: '150ms' }}>Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(pose => (
              <PoseCard
                key={pose.slug}
                pose={pose}
                onOpen={() => setOpenSlug(pose.slug)}
              />
            ))}
          </div>
        )}
      </main>
      )}

      {openPose && <PoseOverlay pose={openPose} onClose={() => setOpenSlug(null)} />}
    </div>
  )
}
