'use client'

import { useState, useMemo } from 'react'
import type { Pose, PoseTypeTag, MuscleGroup, FiveElement, NervousSystemEffect, SequencingPosition } from '@/lib/pipeline/types'
import PoseCard from './PoseCard'

interface Props {
  poses: Pose[]
}

const ELEMENTS: FiveElement[] = ['wood', 'fire', 'earth', 'metal', 'water']
const ELEMENT_COLORS: Record<FiveElement, string> = {
  wood:  'bg-green-100 text-green-800 border-green-300',
  fire:  'bg-red-100 text-red-800 border-red-300',
  earth: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  metal: 'bg-gray-100 text-gray-800 border-gray-300',
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
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    let list = poses

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.english.toLowerCase().includes(q) ||
        p.sanskrit.toLowerCase().includes(q) ||
        p.aliases.some(a => a.toLowerCase().includes(q))
      )
    }

    if (filterElement) {
      list = list.filter(p => p.element === filterElement)
    }

    if (filterPosition) {
      list = list.filter(p => p.body_position === filterPosition)
    }

    if (filterTypeTags.length > 0) {
      list = list.filter(p => filterTypeTags.every(t => p.type_tags.includes(t)))
    }

    if (filterMuscleGroups.length > 0) {
      list = list.filter(p => filterMuscleGroups.every(m => p.muscle_groups.includes(m)))
    }

    if (filterNS) {
      list = list.filter(p => p.nervous_system_effect === filterNS)
    }

    if (filterSeqPosition) {
      list = list.filter(p => p.sequencing_position?.includes(filterSeqPosition))
    }

    list = list.filter(p => p.complexity <= filterComplexityMax && p.injury_risk <= filterRiskMax)

    switch (sortBy) {
      case 'complexity-asc':  return [...list].sort((a, b) => a.complexity - b.complexity)
      case 'complexity-desc': return [...list].sort((a, b) => b.complexity - a.complexity)
      case 'risk-asc':        return [...list].sort((a, b) => a.injury_risk - b.injury_risk)
      case 'risk-desc':       return [...list].sort((a, b) => b.injury_risk - a.injury_risk)
      default:                return [...list].sort((a, b) => a.english.localeCompare(b.english))
    }
  }, [poses, search, filterElement, filterPosition, filterTypeTags, filterMuscleGroups, filterNS, filterSeqPosition, filterComplexityMax, filterRiskMax, sortBy])

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

  const hasActiveFilters =
    search || filterElement || filterPosition || filterNS || filterSeqPosition ||
    filterTypeTags.length || filterMuscleGroups.length ||
    filterComplexityMax < 10 || filterRiskMax < 10

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-semibold text-stone-900">Pose Library</h1>
              <p className="text-sm text-stone-500">{filtered.length} of {poses.length} poses</p>
            </div>
            <a href="/dimensions" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">
              ← New session
            </a>
          </div>

          {/* Search + sort row */}
          <div className="flex gap-2">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by English, Sanskrit, or alias..."
              className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
            />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              className="px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none"
            >
              <option value="alpha">A–Z</option>
              <option value="complexity-asc">Complexity ↑</option>
              <option value="complexity-desc">Complexity ↓</option>
              <option value="risk-asc">Risk ↑</option>
              <option value="risk-desc">Risk ↓</option>
            </select>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                hasActiveFilters
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'
              }`}
            >
              Filters {hasActiveFilters ? `(active)` : ''}
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-stone-100 space-y-4">
              {/* Element + position row */}
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-500 block mb-1">Element</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setFilterElement('')}
                      className={`px-2 py-1 text-xs rounded border ${!filterElement ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
                    >
                      All
                    </button>
                    {ELEMENTS.map(el => (
                      <button
                        key={el}
                        onClick={() => setFilterElement(prev => prev === el ? '' : el)}
                        className={`px-2 py-1 text-xs rounded border capitalize ${
                          filterElement === el
                            ? `border ${ELEMENT_COLORS[el]}`
                            : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        {el}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-500 block mb-1">Body position</label>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setFilterPosition('')}
                      className={`px-2 py-1 text-xs rounded border ${!filterPosition ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
                    >
                      All
                    </button>
                    {BODY_POSITIONS.map(pos => (
                      <button
                        key={pos}
                        onClick={() => setFilterPosition(prev => prev === pos ? '' : pos)}
                        className={`px-2 py-1 text-xs rounded border capitalize ${filterPosition === pos ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* NS effect + sequencing position row */}
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-500 block mb-1">Nervous system effect</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setFilterNS('')}
                      className={`px-2 py-1 text-xs rounded border ${!filterNS ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
                    >
                      All
                    </button>
                    {NS_OPTIONS.map(ns => (
                      <button
                        key={ns}
                        onClick={() => setFilterNS(prev => prev === ns ? '' : ns)}
                        className={`px-2 py-1 text-xs rounded border capitalize ${filterNS === ns ? NS_COLORS[ns] : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
                      >
                        {ns}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-500 block mb-1">Sequencing position</label>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setFilterSeqPosition('')}
                      className={`px-2 py-1 text-xs rounded border ${!filterSeqPosition ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
                    >
                      All
                    </button>
                    {SEQ_OPTIONS.map(pos => (
                      <button
                        key={pos}
                        onClick={() => setFilterSeqPosition(prev => prev === pos ? '' : pos)}
                        className={`px-2 py-1 text-xs rounded border capitalize ${filterSeqPosition === pos ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
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
                  <label className="text-xs font-medium text-stone-500">
                    Max complexity: <span className="text-stone-900 font-semibold">{filterComplexityMax}</span>
                  </label>
                  <input
                    type="range" min={1} max={10} value={filterComplexityMax}
                    onChange={e => setFilterComplexityMax(Number(e.target.value))}
                    className="block w-40 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500">
                    Max injury risk: <span className="text-stone-900 font-semibold">{filterRiskMax}</span>
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
                <label className="text-xs font-medium text-stone-500 block mb-1">Type tags (all selected must match)</label>
                <div className="flex flex-wrap gap-1">
                  {TYPE_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTypeTag(tag)}
                      className={`px-2 py-0.5 text-xs rounded border ${filterTypeTags.includes(tag) ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Muscle groups */}
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Muscle groups (all selected must match)</label>
                <div className="flex flex-wrap gap-1">
                  {MUSCLE_GROUPS.map(m => (
                    <button
                      key={m}
                      onClick={() => toggleMuscleGroup(m)}
                      className={`px-2 py-0.5 text-xs rounded border ${filterMuscleGroups.includes(m) ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <p className="text-lg">No poses match your filters.</p>
            <button onClick={clearFilters} className="mt-2 text-sm underline hover:text-stone-600">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(pose => (
              <PoseCard
                key={pose.slug}
                pose={pose}
                expanded={expandedSlug === pose.slug}
                onToggle={() => setExpandedSlug(prev => prev === pose.slug ? null : pose.slug)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
