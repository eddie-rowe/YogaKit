'use client'

import type { WeightedPose } from '@/lib/pose-library/sequence-stats'
import {
  chakraDistribution,
  meridianDistribution,
  muscleDistribution,
} from '@/lib/pose-library/sequence-stats'
import UsagePie from './UsagePie'

interface Props {
  poses: WeightedPose[]
}

export default function SequenceAnalytics({ poses }: Props) {
  const chakras  = chakraDistribution(poses)
  const meridians = meridianDistribution(poses)
  const muscles  = muscleDistribution(poses)

  const hasAny = chakras.length > 0 || meridians.length > 0 || muscles.length > 0
  if (!hasAny) return null

  return (
    <div>
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
        Session analytics
      </p>
      <div className="flex flex-wrap gap-8 justify-start">
        {chakras.length > 0   && <UsagePie title="Chakras"       slices={chakras} />}
        {meridians.length > 0 && <UsagePie title="Meridians"     slices={meridians} />}
        {muscles.length > 0   && <UsagePie title="Muscle Groups" slices={muscles} />}
      </div>
    </div>
  )
}
