'use client'

import type { Pose } from '@/lib/pose-types'
import { resolveDisplayName } from '@/lib/pose-library/display-name'

interface Props {
  search: string
  onSearchChange: (value: string) => void
  results: Pose[]
  onAddPose: (pose: Pose) => void
}

/** Pose search field + the add-to-flow results dropdown. Split out of
 *  `ComposeClient.tsx` (004 T043). */
export default function ComposePoseSearch({ search, onSearchChange, results, onAddPose }: Props) {
  return (
    <div className="relative">
      <input
        data-testid="compose-search-input"
        data-dd-privacy="mask-user-input"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search poses to add…"
        className="kk-input w-full px-3 py-2"
      />
      {results.length > 0 && (
        <div className="kk-card absolute z-10 mt-1 w-full max-h-72 overflow-y-auto shadow-lg">
          {results.map(p => (
            <button
              key={p.slug}
              data-testid={`compose-add-pose-${p.slug}`}
              onClick={() => onAddPose(p)}
              className="w-full text-left px-3 py-2.5 text-sm hover:opacity-80 transition-opacity duration-150 flex items-center justify-between"
            >
              <span>{resolveDisplayName(p)}</span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{p.sanskrit}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
