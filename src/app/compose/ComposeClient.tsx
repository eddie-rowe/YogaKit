'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import type { Pose } from '@/lib/pose-types'
import type { Flow, FlowItem, LayerName, Phase } from '@/lib/flow/types'
import { isStillnessNode } from '@/lib/flow/types'
import { resolveDisplayName, resolveItemName } from '@/lib/pose-library/display-name'
import { allSearchableNames } from '@/lib/pose-library/display-name'
import { buildFrictionMatrix } from '@/lib/friction'
import { validateLite } from '@/lib/validator/lite'
import { saveFlow, getFlow, getAllFlows } from '@/lib/storage/flow-store'
import { queueUpsert } from '@/lib/storage/sync'
import { CURRENT_SCHEMA_VERSION } from '@/lib/storage/krama-file'
import { formatDuration, totalSeconds } from '@/lib/flow/duration'
import ComposeFlowItem from './ComposeFlowItem'
import * as haptics from '@/lib/haptics'

interface Props {
  poses: Pose[]
  builtins: Flow[]
  flowId?: string
}

const LAYERS: LayerName[] = ['simple', 'advanced', 'expert']
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
  // Honest save state: 'dirty' as soon as anything changes, 'saving' while the
  // write is in flight, 'saved' only once that exact write has landed, 'error' if
  // it didn't. Replaces the old savedAt-forever "Saved" label (Phase 1).
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>(
    flowId ? 'saved' : 'dirty'
  )

  // Every mutation goes through updateFlow, so mark dirty there rather than at each
  // call site.
  const markDirty = () => setSaveState('dirty')

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(LAYER_STORAGE_KEY) : null
    if (!stored) return
    // 'custom' was removed as a Compose layer; fall back to 'advanced' for anyone
    // who had it saved from before rather than crashing on an unknown layer.
    if (stored === 'custom') setLayer('advanced')
    else if ((LAYERS as string[]).includes(stored)) setLayer(stored as LayerName)
  }, [])

  useEffect(() => {
    if (!flowId) return
    let cancelled = false

    async function load() {
      const builtin = builtins.find(f => f.id === flowId)
      if (builtin) {
        // Compose only ever edits an editable copy — duplicate a built-in on open,
        // never mutate the shipped template (guardrails: built-ins stay read-only).
        // Guard against re-duplicating on every visit to /compose/[builtin-id]: if
        // a copy already exists, reuse it instead of spawning another (Phase 1).
        const existingCopy = (await getAllFlows()).find(
          f => !f.isBuiltIn && f.title === `${builtin.title} (copy)`
        )
        if (existingCopy) {
          if (!cancelled) router.replace(`/compose/${existingCopy.id}`)
          return
        }
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
        setSaveState(existing ? 'saved' : 'dirty')
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
    haptics.tick()
    setLayer(next)
    if (typeof window !== 'undefined') window.localStorage.setItem(LAYER_STORAGE_KEY, next)
  }

  function updateFlow(fn: (f: Flow) => Flow) {
    setFlow(prev => (prev ? fn(prev) : prev))
    markDirty()
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

  // Builds from f.items (the render-scoped updater's own argument), not the
  // sortedItems memo — matches removeItem, and avoids the stale-closure bug where a
  // rapid second reorder would silently operate on an out-of-date order.
  function moveItem(index: number, direction: -1 | 1) {
    updateFlow(f => {
      const items = [...f.items].sort((a, b) => a.order - b.order)
      const target = index + direction
      if (target < 0 || target >= items.length) return f
      ;[items[index], items[target]] = [items[target], items[index]]
      const reordered = items.map((i, idx) => ({ ...i, order: idx }))
      return { ...f, items: reordered, updatedAt: nowIso() }
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragStart() {
    haptics.tick()
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    updateFlow(f => {
      const items = [...f.items].sort((a, b) => a.order - b.order)
      const oldIndex = items.findIndex(i => i.id === active.id)
      const newIndex = items.findIndex(i => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return f
      const reordered = arrayMove(items, oldIndex, newIndex).map((i, idx) => ({ ...i, order: idx }))
      return { ...f, items: reordered, updatedAt: nowIso() }
    })
    haptics.success()
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
    setSaveState('saving')
    try {
      await saveFlow(flow)
      setSaveState('saved')
      // Enqueued only after the local write resolves. Not awaited, and its failure
      // is not the save's failure: the flow is durable on this device either way,
      // and `saveState` speaks for the local write alone. Signed out, this is a
      // no-op — an anonymous teacher's work is claimed at sign-in instead.
      void queueUpsert(flow).catch(err => console.error('Failed to queue flow for sync', err))
    } catch (err) {
      // The only copy of the teacher's work — a silent failure here (e.g. quota
      // exceeded, private-mode IndexedDB) must surface, not vanish (Phase 1).
      console.error('Failed to save flow', err)
      setSaveState('error')
    }
  }

  // Debounced autosave — a teacher who steps away mid-edit should find the work
  // still there, not lost with the tab (Phase 1). Skip while a save is already
  // in flight or errored, so an autosave tick can't clobber a visible error state
  // before the teacher has seen it.
  useEffect(() => {
    if (saveState !== 'dirty') return
    const timer = setTimeout(() => {
      handleSave()
    }, 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, saveState])

  // Don't let a teacher navigate away while an autosave write is still pending.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (saveState === 'dirty' || saveState === 'saving') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saveState])

  if (loading || !flow) {
    return <div className="kk-page flex items-center justify-center py-24 text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
  }

  const total = totalSeconds(flow.items)

  return (
    <div className="kk-page">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <input
            data-testid="compose-title-input"
            value={flow.title}
            onChange={e => updateFlow(f => ({ ...f, title: e.target.value, updatedAt: nowIso() }))}
            className="kk-input px-3 py-2 text-lg font-serif font-medium flex-1"
            placeholder="Name this flow"
          />
          <button
            onClick={handleSave}
            disabled={saveState === 'saving'}
            data-testid="compose-save-button"
            className="kk-btn px-4 py-2 text-sm font-medium"
          >
            {saveState === 'saved' && 'Saved'}
            {saveState === 'dirty' && 'Save'}
            {saveState === 'saving' && 'Saving…'}
            {saveState === 'error' && 'Retry save'}
          </button>
        </div>
        {saveState === 'error' && (
          <div data-testid="compose-save-error" className="kk-warning px-3 py-2 text-sm">
            Couldn&apos;t save. Check available storage and try again. Your edits are still on
            this screen.
          </div>
        )}

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
            className="kk-input w-full px-3 py-2"
          />
          {searchResults.length > 0 && (
            <div className="kk-card absolute z-10 mt-1 w-full max-h-72 overflow-y-auto shadow-lg">
              {searchResults.map(p => (
                <button
                  key={p.slug}
                  data-testid={`compose-add-pose-${p.slug}`}
                  onClick={() => addPose(p)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:opacity-80 transition-opacity duration-150 flex items-center justify-between"
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
            key={`${w.code}-${w.itemId ?? 'flow'}`}
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
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {sortedItems.map((item, index) => {
                const pose = poseBySlug.get(item.poseSlug)
                const stillness = isStillnessNode(item.poseSlug)
                const next = sortedItems[index + 1]
                const seam = next && pose
                  ? frictionMatrix[pose.slug]?.[next.poseSlug]
                  : undefined
                return (
                  <ComposeFlowItem
                    key={item.id}
                    item={item}
                    index={index}
                    pose={pose}
                    stillness={stillness}
                    layer={layer}
                    isFirst={index === 0}
                    isLast={index === sortedItems.length - 1}
                    next={next}
                    seam={seam}
                    onMove={moveItem}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                  />
                )
              })}
            </SortableContext>
          </DndContext>
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
                  className="kk-input px-2 py-2 flex-1"
                />
                <select
                  value=""
                  onChange={e => {
                    const itemId = e.target.value
                    if (itemId) updateItem(itemId, { phaseId: phase.id })
                  }}
                  className="kk-input px-2 py-2 text-xs"
                >
                  <option value="">Assign item…</option>
                  {sortedItems.map((item, idx) => (
                    <option key={item.id} value={item.id}>
                      {idx + 1}. {resolveItemName(poseBySlug.get(item.poseSlug), item.poseSlug)}
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
