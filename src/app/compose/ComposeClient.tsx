'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Pose } from '@/lib/pipeline/types'
import type { Flow, FlowItem, LayerName, Phase } from '@/lib/flow/types'
import { isStillnessNode } from '@/lib/flow/types'
import { resolveDisplayName } from '@/lib/pose-library/display-name'
import { allSearchableNames } from '@/lib/pose-library/display-name'
import { buildFrictionMatrix } from '@/lib/friction'
import { validateLite } from '@/lib/validator/lite'
import { saveFlow, getFlow } from '@/lib/storage/flow-store'
import { CURRENT_SCHEMA_VERSION } from '@/lib/storage/krama-file'
import { formatDuration, totalSeconds } from '@/lib/flow/duration'

interface Props {
  poses: Pose[]
  builtins: Flow[]
  flowId?: string
}

const LAYERS: LayerName[] = ['simple', 'advanced', 'expert', 'custom']
const LAYER_STORAGE_KEY = 'krama-compose-layer'

function nowIso(): string {
  return new Date().toISOString()
}

function emptyFlow(): Flow {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled flow',
    items: [],
    phases: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    isBuiltIn: false,
    schema_version: CURRENT_SCHEMA_VERSION,
  }
}

export default function ComposeClient({ poses, builtins, flowId }: Props) {
  const router = useRouter()
  const poseBySlug = useMemo(() => new Map(poses.map(p => [p.slug, p])), [poses])

  const [flow, setFlow] = useState<Flow | null>(flowId ? null : emptyFlow())
  const [loading, setLoading] = useState(!!flowId)
  const [search, setSearch] = useState('')
  const [layer, setLayer] = useState<LayerName>('simple')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(LAYER_STORAGE_KEY) : null
    if (stored && (LAYERS as string[]).includes(stored)) setLayer(stored as LayerName)
  }, [])

  useEffect(() => {
    if (!flowId) return
    let cancelled = false

    async function load() {
      const builtin = builtins.find(f => f.id === flowId)
      if (builtin) {
        // Compose only ever edits an editable copy — duplicate a built-in on open,
        // never mutate the shipped template (guardrails: built-ins stay read-only).
        const copy: Flow = {
          ...builtin,
          id: crypto.randomUUID(),
          title: `${builtin.title} (copy)`,
          isBuiltIn: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        await saveFlow(copy)
        if (!cancelled) router.replace(`/compose/${copy.id}`)
        return
      }
      const existing = await getFlow(flowId!)
      if (!cancelled) {
        setFlow(existing ?? emptyFlow())
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [flowId, builtins, router])

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return poses
      .filter(p => allSearchableNames(p).some(n => n.toLowerCase().includes(q)))
      .slice(0, 12)
  }, [poses, search])

  const sortedItems = useMemo(
    () => flow ? [...flow.items].sort((a, b) => a.order - b.order) : [],
    [flow]
  )

  const frictionMatrix = useMemo(() => {
    const used = sortedItems
      .map(i => poseBySlug.get(i.poseSlug))
      .filter((p): p is Pose => !!p)
    return buildFrictionMatrix(used)
  }, [sortedItems, poseBySlug])

  const warnings = useMemo(
    () => flow ? validateLite(flow, poses) : [],
    [flow, poses]
  )

  function setLayerAndPersist(next: LayerName) {
    setLayer(next)
    if (typeof window !== 'undefined') window.localStorage.setItem(LAYER_STORAGE_KEY, next)
  }

  function updateFlow(fn: (f: Flow) => Flow) {
    setFlow(prev => (prev ? fn(prev) : prev))
  }

  function addPose(pose: Pose) {
    updateFlow(f => {
      const item: FlowItem = {
        id: crypto.randomUUID(),
        poseSlug: pose.slug,
        mode: pose.modes[0]?.type ?? 'both',
        measure: { ...pose.default_measure },
        phaseId: null,
        order: f.items.length,
      }
      return { ...f, items: [...f.items, item], updatedAt: nowIso() }
    })
    setSearch('')
  }

  function removeItem(id: string) {
    updateFlow(f => ({
      ...f,
      items: f.items.filter(i => i.id !== id).map((i, idx) => ({ ...i, order: idx })),
      updatedAt: nowIso(),
    }))
  }

  function moveItem(index: number, direction: -1 | 1) {
    updateFlow(f => {
      const items = [...sortedItems]
      const target = index + direction
      if (target < 0 || target >= items.length) return f
      ;[items[index], items[target]] = [items[target], items[index]]
      const reordered = items.map((i, idx) => ({ ...i, order: idx }))
      return { ...f, items: reordered, updatedAt: nowIso() }
    })
  }

  function reorderByDrag(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    updateFlow(f => {
      const items = [...sortedItems]
      const [moved] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, moved)
      const reordered = items.map((i, idx) => ({ ...i, order: idx }))
      return { ...f, items: reordered, updatedAt: nowIso() }
    })
  }

  function updateItem(id: string, patch: Partial<FlowItem>) {
    updateFlow(f => ({
      ...f,
      items: f.items.map(i => (i.id === id ? { ...i, ...patch } : i)),
      updatedAt: nowIso(),
    }))
  }

  function addStillness() {
    // Use the flow's default rebound/stillness node if any candidate is available.
    const stillnessSlug = poses.find(p => isStillnessNode(p.slug))?.slug ?? 'savasana'
    const pose = poseBySlug.get(stillnessSlug)
    if (pose) addPose(pose)
  }

  function addPhase() {
    updateFlow(f => {
      const phase: Phase = {
        id: crypto.randomUUID(),
        name: `Phase ${f.phases.length + 1}`,
        intentTag: 'samana',
        order: f.phases.length,
      }
      return { ...f, phases: [...f.phases, phase], updatedAt: nowIso() }
    })
  }

  async function handleSave() {
    if (!flow) return
    await saveFlow(flow)
    setSavedAt(nowIso())
  }

  if (loading || !flow) {
    return <div className="kk-page flex items-center justify-center py-24 text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
  }

  const total = totalSeconds(flow.items)

  return (
    <div className="kk-page">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <input
            value={flow.title}
            onChange={e => updateFlow(f => ({ ...f, title: e.target.value, updatedAt: nowIso() }))}
            className="kk-input px-3 py-2 text-lg font-serif font-medium flex-1"
            placeholder="Name this flow"
          />
          <button onClick={handleSave} className="kk-btn px-4 py-2 text-sm font-medium">
            {savedAt ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* Layer chips */}
        <div className="flex gap-1.5">
          {LAYERS.map(l => (
            <button
              key={l}
              data-testid={`compose-layer-${l}`}
              data-active={layer === l}
              onClick={() => setLayerAndPersist(l)}
              className="kk-chip px-3 py-1 text-xs capitalize"
            >
              {l}
            </button>
          ))}
        </div>

        {/* Search + add */}
        <div className="relative">
          <input
            data-testid="compose-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search poses to add…"
            className="kk-input w-full px-3 py-2 text-sm"
          />
          {searchResults.length > 0 && (
            <div className="kk-card absolute z-10 mt-1 w-full max-h-72 overflow-y-auto shadow-lg">
              {searchResults.map(p => (
                <button
                  key={p.slug}
                  data-testid={`compose-add-pose-${p.slug}`}
                  onClick={() => addPose(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-opacity duration-150 flex items-center justify-between"
                >
                  <span>{resolveDisplayName(p)}</span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{p.sanskrit}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={addStillness} className="kk-btn-outline px-3 py-1.5 text-sm">
              + Add stillness
            </button>
            <button onClick={addPhase} className="kk-btn-outline px-3 py-1.5 text-sm">
              + Add phase
            </button>
          </div>
          <div data-testid="compose-total-duration" className="text-sm font-medium">
            Total: {formatDuration(total)}
          </div>
        </div>

        {/* Validator warnings — never block save */}
        {warnings.map(w => (
          <div
            key={w.code}
            data-testid={`validator-warning-${w.code}`}
            className="kk-warning px-3 py-2 text-sm"
          >
            {w.message}
          </div>
        ))}

        {/* Flow items */}
        <div className="space-y-1">
          {sortedItems.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
              Search above to add your first pose.
            </p>
          )}
          {sortedItems.map((item, index) => {
            const pose = poseBySlug.get(item.poseSlug)
            const stillness = isStillnessNode(item.poseSlug)
            const next = sortedItems[index + 1]
            const seam = next && pose
              ? frictionMatrix[pose.slug]?.[next.poseSlug]
              : undefined
            return (
              <div key={item.id}>
                <div
                  data-testid={`compose-item-${index}`}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('text/plain', String(index))}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault()
                    const from = Number(e.dataTransfer.getData('text/plain'))
                    reorderByDrag(from, index)
                  }}
                  className={`kk-card px-3 py-2.5 flex flex-col gap-2 ${stillness ? 'kk-stillness' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium flex-1">
                      {pose ? resolveDisplayName(pose) : item.poseSlug}
                    </span>
                    <div data-testid={`compose-item-measure-${index}`} className="flex items-center gap-1 text-xs">
                      <select
                        value={item.measure.breaths != null ? 'breaths' : 'seconds'}
                        onChange={e => {
                          const kind = e.target.value
                          updateItem(item.id, {
                            measure: kind === 'breaths' ? { breaths: 5 } : { seconds: 60 },
                          })
                        }}
                        className="kk-input px-1 py-1"
                      >
                        <option value="breaths">breaths</option>
                        <option value="seconds">seconds</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={item.measure.breaths ?? item.measure.seconds ?? 0}
                        onChange={e => {
                          const value = Number(e.target.value)
                          updateItem(item.id, {
                            measure: item.measure.breaths != null ? { breaths: value } : { seconds: value },
                          })
                        }}
                        className="kk-input w-14 px-1 py-1"
                      />
                    </div>
                    <button
                      data-testid={`compose-item-reorder-up-${index}`}
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      className="kk-btn-outline px-2 py-1 text-xs"
                    >
                      ↑
                    </button>
                    <button
                      data-testid={`compose-item-reorder-down-${index}`}
                      onClick={() => moveItem(index, 1)}
                      disabled={index === sortedItems.length - 1}
                      className="kk-btn-outline px-2 py-1 text-xs"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs px-2 py-1"
                      style={{ color: 'var(--muted)' }}
                    >
                      Remove
                    </button>
                  </div>
                  {(layer !== 'simple') && (
                    <input
                      data-testid={`compose-item-notes-${index}`}
                      value={item.note ?? ''}
                      onChange={e => updateItem(item.id, { note: e.target.value })}
                      placeholder="Note for this pose…"
                      className="kk-input px-2 py-1 text-xs"
                    />
                  )}
                </div>
                {next && seam && (
                  <div
                    data-testid={`compose-seam-${index}-${index + 1}`}
                    data-tier={seam.tier}
                    className="kk-seam px-3 py-1"
                    title={seam.reasons.join('; ')}
                  >
                    <span className="kk-seam-line" />
                    <span>tier {seam.tier}{seam.reasons.length > 0 ? ` — ${seam.reasons[0]}` : ''}</span>
                    <span className="kk-seam-line" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Phases */}
        {flow.phases.length > 0 && (
          <div className="space-y-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Phases</h2>
            {flow.phases.map(phase => (
              <div key={phase.id} data-testid={`compose-phase-${phase.id}`} className="kk-card px-3 py-2 flex items-center gap-2">
                <input
                  value={phase.name}
                  onChange={e =>
                    updateFlow(f => ({
                      ...f,
                      phases: f.phases.map(p => (p.id === phase.id ? { ...p, name: e.target.value } : p)),
                    }))
                  }
                  className="kk-input px-2 py-1 text-sm flex-1"
                />
                <select
                  value=""
                  onChange={e => {
                    const itemId = e.target.value
                    if (itemId) updateItem(itemId, { phaseId: phase.id })
                  }}
                  className="kk-input px-1 py-1 text-xs"
                >
                  <option value="">Assign item…</option>
                  {sortedItems.map((item, idx) => (
                    <option key={item.id} value={item.id}>
                      {idx + 1}. {poseBySlug.get(item.poseSlug)?.english ?? item.poseSlug}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
