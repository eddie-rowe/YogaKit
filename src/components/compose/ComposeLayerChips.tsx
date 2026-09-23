'use client'

import type { LayerName } from '@/lib/flow/types'

const LAYERS: LayerName[] = ['simple', 'advanced', 'expert']

interface Props {
  layer: LayerName
  onSelect: (layer: LayerName) => void
}

/** The simple/advanced/expert depth chips. Split out of `ComposeClient.tsx` (004 T043). */
export default function ComposeLayerChips({ layer, onSelect }: Props) {
  return (
    <div className="flex gap-1.5">
      {LAYERS.map(l => (
        <button
          key={l}
          data-testid={`compose-layer-${l}`}
          data-active={layer === l}
          onClick={() => onSelect(l)}
          className="kk-chip px-3 py-1 text-xs capitalize"
        >
          {l}
        </button>
      ))}
    </div>
  )
}
