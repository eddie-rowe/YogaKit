'use client'

import { useState, useMemo } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import BodySvg from './BodySvg'
import {
  getActiveRegions,
  getDeepRegions,
  getActiveJointIds,
  getLegendEntries,
  resolveSelection,
} from '@/lib/pose-library/body-map'
import type { LegendCategory, Selection } from '@/lib/pose-library/body-map'
import type { MuscleGroup, JointName, FiveElement, ChakraName } from '@/lib/pose-types'

type TabId = LegendCategory
type ViewId = 'front' | 'back'

interface BodyDiagramProps {
  muscleGroups: MuscleGroup[]
  meridians: string[]
  jointsInvolved: JointName[]
  chakras?: ChakraName[]
  element: FiveElement | null
  bilateral: boolean
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'muscles',  label: 'Muscles'  },
  { id: 'meridians', label: 'Meridians' },
  { id: 'joints',   label: 'Joints'   },
  { id: 'chakras',  label: 'Chakras'  },
]

/** The data hue each legend chip carries. These four are guardrails §2's sanctioned
 *  exception to the single-accent rule, and the exception is scoped to pose *content* —
 *  so they stay on the chips and never move onto the tab bar, the view toggle, or a
 *  "selected" background. Selection is a ring and a heavier border instead. */
const CATEGORY_HUES: Record<TabId, { background: string; color: string }> = {
  muscles:   { background: '#eef2ff', color: '#4338ca' },
  meridians: { background: '#f0fdfa', color: '#0f766e' },
  joints:    { background: '#f1f5f9', color: '#475569' },
  chakras:   { background: '#faf5ff', color: '#7e22ce' },
}

export default function BodyDiagram({
  muscleGroups,
  meridians,
  jointsInvolved,
  chakras = [],
  element,
  bilateral,
}: BodyDiagramProps) {
  const valuesForTab: Record<TabId, string[]> = {
    muscles: muscleGroups,
    meridians,
    joints: jointsInvolved,
    chakras,
  }

  // FR-016: a tab with no data is a dead end, so it is never offered. The default tab is
  // the first one that survives — 'muscles' was hardcoded, which was wrong for the 25
  // poses carrying meridians but no muscle data.
  const visibleTabs = TABS.filter(tab => valuesForTab[tab.id].length > 0)

  const [activeTab, setActiveTab] = useState<TabId>(visibleTabs[0]?.id ?? 'muscles')
  const [view, setView] = useState<ViewId>('front')
  const [selected, setSelected] = useState<Selection | null>(null)

  const activeRegions = useMemo(
    () => getActiveRegions(muscleGroups, view),
    [muscleGroups, view]
  )
  const deepRegions = useMemo(
    () => getDeepRegions(muscleGroups, view),
    [muscleGroups, view]
  )
  const activeJoints = useMemo(
    () => getActiveJointIds(jointsInvolved, view, bilateral),
    [jointsInvolved, view, bilateral]
  )

  // Resolved before the hooks below, and before the early return, because a tab that was
  // valid on the last render can stop being so when the pose changes.
  const currentTab = visibleTabs.some(tab => tab.id === activeTab)
    ? activeTab
    : visibleTabs[0]?.id ?? 'muscles'
  const legendValues = valuesForTab[currentTab]

  // Not memoized, deliberately. Both are pure passes over at most a dozen strings, and
  // `legendValues` is read out of an object literal rebuilt each render — so a useMemo here
  // is one the React Compiler refuses to preserve, trading a real optimization of the whole
  // component for a fake one on two cheap calls.
  const legendEntries = getLegendEntries(currentTab, legendValues)
  const { regionIds: highlighted, keys: litKeys } = resolveSelection(selected, legendEntries)

  // FR-017: no frame around an absence. Two poses reach here — rebound-supine and
  // seated-stillness — and for them the diagram is not an empty state to explain, it is
  // a section that should not exist. The caller drops its heading on the same condition.
  if (visibleTabs.length === 0) return null

  const hue = CATEGORY_HUES[currentTab]

  function selectTab(next: TabId) {
    setActiveTab(next)
    // A selection is scoped to the layer it was made in; carrying a muscle key onto the
    // meridian tab would highlight nothing and read as a broken tap.
    setSelected(null)
  }

  function selectFromLegend(key: string) {
    if (selected?.source === 'legend' && selected.key === key) {
      setSelected(null)
      return
    }
    const entry = legendEntries.find(candidate => candidate.key === key)
    // The view-scoping trap: `hamstrings` is back-only, so tapping its chip from the front
    // view would highlight nothing at all. Both updates happen in one handler, so React
    // batches them into a single render and the flip reads as one motion.
    if (entry && entry.primaryView !== 'both' && entry.primaryView !== view) {
      setView(entry.primaryView)
    }
    setSelected({ source: 'legend', key })
  }

  function selectFromRegion(id: string) {
    setSelected(current =>
      current?.source === 'region' && current.key === id ? null : { source: 'region', key: id }
    )
  }

  const controlRow = (
    // FR-018: one row at 390px. The toggle used to sit `self-end` on a second row, which
    // cost a whole line of vertical space to two words.
    <div className="flex items-center gap-2">
      {visibleTabs.length > 1 ? (
        <Tabs.Root
          value={currentTab}
          onValueChange={v => selectTab(v as TabId)}
          className="min-w-0 flex-1"
        >
          <Tabs.List
            className="flex gap-1 p-1 rounded-xl overflow-x-auto"
            style={{ background: 'var(--surface)' }}
          >
            {visibleTabs.map(tab => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                data-testid={`body-diagram-tab-${tab.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap data-[state=active]:shadow-sm"
                style={{
                  color: tab.id === currentTab ? 'var(--foreground)' : 'var(--muted)',
                  background: tab.id === currentTab ? 'var(--surface-raised)' : 'transparent',
                  transition: 'color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard)',
                }}
              >
                {tab.label}
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--muted)' }}>
                  {valuesForTab[tab.id].length}
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      ) : (
        // One category is a view, not a degenerate one-tab tab set.
        <h4
          className="min-w-0 flex-1 text-xs font-medium"
          data-testid={`body-diagram-single-${currentTab}`}
          style={{ color: 'var(--foreground)' }}
        >
          {visibleTabs[0].label}
          <span className="ml-1.5 text-[10px] tabular-nums" style={{ color: 'var(--muted)' }}>
            {valuesForTab[currentTab].length}
          </span>
        </h4>
      )}

      <div className="flex shrink-0 gap-1">
        {(['front', 'back'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            data-testid={`body-diagram-view-${v}`}
            aria-pressed={view === v}
            className="px-3 py-1 text-xs font-medium rounded-lg capitalize"
            style={{
              background: view === v ? 'var(--accent)' : 'var(--surface)',
              color: view === v ? 'var(--accent-foreground)' : 'var(--muted)',
              border: '1px solid var(--border)',
              borderColor: view === v ? 'var(--accent)' : 'var(--border)',
              transition: 'background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)',
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {controlRow}

      <div className="rounded-2xl p-4" style={{ background: 'var(--surface-raised)' }}>
        <BodySvg
          view={view}
          activeTab={currentTab}
          activeRegions={activeRegions}
          deepRegions={deepRegions}
          activeJoints={activeJoints}
          activeMeridians={meridians}
          activeChakras={chakras}
          element={element}
          highlighted={highlighted}
          onSelectRegion={selectFromRegion}
        />
      </div>

      <div className="flex flex-col gap-1">
        {currentTab === 'muscles' && (
          /* The diagram encodes tissue depth as fill vs. dashed outline. That
             convention was previously left for the reader to infer
             (docs/design-research/04-pose-detail-anatomy.md). It explains a *muscle*
             encoding, which is why it is scoped to this tab rather than always shown. */
          <div
            className="flex items-center gap-3 text-[11px]"
            style={{ color: 'var(--muted)' }}
            data-testid="body-diagram-depth-legend"
          >
            <span className="flex items-center gap-1">
              <svg width="12" height="12" aria-hidden="true">
                <rect width="12" height="12" rx="3" fill="#818cf8" opacity={0.5} />
              </svg>
              superficial
            </span>
            <span className="flex items-center gap-1">
              <svg width="12" height="12" aria-hidden="true">
                <rect
                  x="0.75"
                  y="0.75"
                  width="10.5"
                  height="10.5"
                  rx="3"
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                  opacity={0.7}
                />
              </svg>
              deep
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {legendEntries.map(entry => {
            const isLit = litKeys.has(entry.key)
            const crossView = entry.primaryView !== 'both' && entry.primaryView !== view
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => selectFromLegend(entry.key)}
                aria-pressed={isLit}
                data-testid={`body-diagram-legend-${entry.key}`}
                /* kk-chip carries the 40px coarse-pointer floor (FR-026), which these
                   entries inherit now that they are buttons rather than spans. */
                className="kk-chip text-[11px] px-2 py-0.5 capitalize"
                style={{
                  background: hue.background,
                  color: hue.color,
                  borderColor: isLit ? 'var(--foreground)' : 'transparent',
                  borderWidth: isLit ? 2 : 1,
                  boxShadow: isLit ? '0 0 0 1px var(--foreground)' : undefined,
                  opacity: litKeys.size > 0 && !isLit ? 0.5 : 1,
                  transition: 'opacity var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
                }}
              >
                {entry.label}
                {crossView && (
                  /* Without this, a chip that flips the view looks like a glitch. */
                  <span className="ml-1 text-[9px] normal-case" style={{ opacity: 0.7 }}>
                    {entry.primaryView}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
