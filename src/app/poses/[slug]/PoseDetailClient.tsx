'use client'

import Link from 'next/link'
import type { Pose, FiveElement } from '@/lib/pose-types'
import { resolveDisplayName } from '@/lib/pose-library/display-name'
import PoseDetailContent, { useDetailLayer, DetailLayerChips, CustomFieldChecklist } from '../PoseDetailContent'

interface Props {
  pose: Pose
}

const ELEMENT_COLORS: Record<FiveElement, string> = {
  wood:  'bg-green-100 text-green-800',
  fire:  'bg-red-100 text-red-800',
  earth: 'bg-yellow-100 text-yellow-800',
  metal: 'bg-gray-100 text-gray-800',
  water: 'bg-blue-100 text-blue-800',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  accessible:   'bg-emerald-100 text-emerald-800',
  intermediate: 'bg-amber-100 text-amber-800',
  advanced:     'bg-red-100 text-red-800',
}

export default function PoseDetailClient({ pose }: Props) {
  const { layer, selectLayer, customFields, toggleCustomField } = useDetailLayer()

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-raised)', color: 'var(--foreground)' }}>
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Back link */}
        <Link
          href="/poses"
          className="inline-flex items-center gap-1.5 text-sm transition-colors mb-6"
          style={{ color: 'var(--muted)', transitionDuration: '150ms' }}
        >
          ← Pose Library
        </Link>

        {/* Detail depth chips */}
        <DetailLayerChips layer={layer} onSelect={selectLayer} />

        {/* Custom field checklist */}
        {layer === 'custom' && (
          <CustomFieldChecklist customFields={customFields} onToggle={toggleCustomField} />
        )}

        {/* Pose header */}
        <div className="mb-6">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">{resolveDisplayName(pose)}</h1>
            {pose.element && (
              <span className={`text-sm px-2 py-0.5 rounded capitalize mt-1 ${ELEMENT_COLORS[pose.element]}`}>
                {pose.element}
              </span>
            )}
            <span className={`text-sm px-2 py-0.5 rounded capitalize mt-1 ${DIFFICULTY_COLORS[pose.difficulty]}`}>
              {pose.difficulty}
            </span>
          </div>
          <p className="italic mt-0.5" style={{ color: 'var(--muted)' }}>{pose.sanskrit}</p>
        </div>

        <PoseDetailContent pose={pose} layer={layer} customFields={customFields} />
      </div>
    </div>
  )
}
