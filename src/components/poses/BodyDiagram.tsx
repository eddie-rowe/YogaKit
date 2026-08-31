'use client'

import { useState, useMemo } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import BodySvg from './BodySvg'
import {
  getActiveRegions,
  getDeepRegions,
  getActiveJointIds,
} from '@/lib/pose-library/body-map'
import type { MuscleGroup, JointName, FiveElement, ChakraName } from '@/lib/pose-types'

type TabId = 'muscles' | 'meridians' | 'joints' | 'chakras'
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

export default function BodyDiagram({
  muscleGroups,
  meridians,
  jointsInvolved,
  chakras = [],
  element,
  bilateral,
}: BodyDiagramProps) {
  const [activeTab, setActiveTab] = useState<TabId>('muscles')
  const [view, setView] = useState<ViewId>('front')

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

  const hasMuscles  = muscleGroups.length > 0
  const hasJoints   = jointsInvolved.length > 0
  const hasMeridians = meridians.length > 0
  const hasChakras  = chakras.length > 0

  function countForTab(tab: TabId) {
    if (tab === 'muscles')   return muscleGroups.length
    if (tab === 'meridians') return meridians.length
    if (tab === 'joints')    return jointsInvolved.length
    if (tab === 'chakras')   return chakras.length
    return 0
  }

  function hasDataForTab(tab: TabId) {
    if (tab === 'muscles')   return hasMuscles
    if (tab === 'meridians') return hasMeridians
    if (tab === 'joints')    return hasJoints
    if (tab === 'chakras')   return hasChakras
    return false
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Tab bar */}
      <Tabs.Root value={activeTab} onValueChange={v => setActiveTab(v as TabId)}>
        <Tabs.List className="flex gap-1 p-1 bg-stone-100 rounded-xl">
          {TABS.map(tab => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-stone-500 transition-all data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm hover:text-stone-700"
            >
              {tab.label}
              {hasDataForTab(tab.id) && (
                <span className="text-[10px] tabular-nums text-stone-400 data-[state=active]:text-stone-500">
                  {countForTab(tab.id)}
                </span>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      {/* Front / Back toggle */}
      <div className="flex gap-1 self-end">
        {(['front', 'back'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-all ${
              view === v
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* SVG diagram */}
      <div className="relative bg-stone-50 rounded-2xl p-4">
        <BodySvg
          view={view}
          activeTab={activeTab}
          activeRegions={activeRegions}
          deepRegions={deepRegions}
          activeJoints={activeJoints}
          activeMeridians={meridians}
          activeChakras={chakras}
          element={element}
        />

        {/* Empty state overlay */}
        {!hasDataForTab(activeTab) && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
            <p className="text-xs text-stone-400 bg-stone-50/90 px-3 py-1.5 rounded-full">
              No {activeTab} data for this pose
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      {activeTab === 'muscles' && hasMuscles && (
        <div className="flex flex-col gap-1">
          {/* The diagram encodes tissue depth as fill vs. dashed outline. That
              convention was previously left for the reader to infer
              (docs/design-research/04-pose-detail-anatomy.md). */}
          <div
            className="flex items-center gap-3 text-[11px] text-stone-500"
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
          <div className="flex flex-wrap gap-1">
            {muscleGroups.map(m => (
              <span key={m} className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">{m}</span>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'meridians' && hasMeridians && (
        <div className="flex flex-wrap gap-1">
          {meridians.map(m => (
            <span key={m} className="text-[11px] px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full capitalize">{m}</span>
          ))}
        </div>
      )}
      {activeTab === 'joints' && hasJoints && (
        <div className="flex flex-wrap gap-1">
          {jointsInvolved.map(j => (
            <span key={j} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{j}</span>
          ))}
        </div>
      )}
      {activeTab === 'chakras' && hasChakras && (
        <div className="flex flex-wrap gap-1">
          {chakras.map(c => (
            <span key={c} className="text-[11px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full capitalize">{c}</span>
          ))}
        </div>
      )}
    </div>
  )
}
