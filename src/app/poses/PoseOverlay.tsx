'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { Pose, FiveElement } from '@/lib/pipeline/types'
import { resolveDisplayName } from '@/lib/pose-library/display-name'
import PoseDetailContent, { useDetailLayer, DetailLayerChips, CustomFieldChecklist } from './PoseDetailContent'

interface Props {
  pose: Pose
  onClose: () => void
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

export default function PoseOverlay({ pose, onClose }: Props) {
  const { layer, selectLayer, customFields, toggleCustomField } = useDetailLayer()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      data-testid="poses-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center md:p-6"
      style={{ background: 'color-mix(in srgb, var(--background) 60%, black 20%)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-3xl overflow-y-auto md:rounded-2xl border"
        style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
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
            <button
              data-testid="poses-overlay-close"
              onClick={onClose}
              aria-label="Close"
              className="flex-shrink-0 p-1.5 rounded-full transition-colors"
              style={{ color: 'var(--muted)', transitionDuration: '150ms' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Detail depth chips */}
          <DetailLayerChips layer={layer} onSelect={selectLayer} />

          {/* Custom field checklist */}
          {layer === 'custom' && (
            <CustomFieldChecklist customFields={customFields} onToggle={toggleCustomField} />
          )}

          <PoseDetailContent pose={pose} layer={layer} customFields={customFields} />
        </div>
      </div>
    </div>
  )
}
