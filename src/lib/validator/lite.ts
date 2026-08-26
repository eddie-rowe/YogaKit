// Validator-lite — pure function, never throws, never blocks save/export.
// specs/001-krama-mvp-spec/data-model.md § Validator-Lite Types

import type { Flow } from '@/lib/flow/types'
import type { Pose } from '@/lib/pose-types'
import { isStillnessNode } from '@/lib/flow/types'

export interface ValidatorWarning {
  code: 'laterality' | 'closing-stillness'
  message: string
  itemId?: string
}

export function validateLite(flow: Flow, poseLibrary: Pose[]): ValidatorWarning[] {
  const warnings: ValidatorWarning[] = []
  const poseBySlug = new Map(poseLibrary.map(p => [p.slug, p]))

  const bilateralCounts = new Map<string, number>()
  for (const item of flow.items) {
    const pose = poseBySlug.get(item.poseSlug)
    if (!pose || !pose.bilateral) continue
    bilateralCounts.set(item.poseSlug, (bilateralCounts.get(item.poseSlug) ?? 0) + 1)
  }

  for (const item of flow.items) {
    const pose = poseBySlug.get(item.poseSlug)
    if (!pose || !pose.bilateral) continue
    const count = bilateralCounts.get(item.poseSlug) ?? 0
    if (count % 2 !== 0) {
      warnings.push({
        code: 'laterality',
        message: `${pose.english} is bilateral but appears an odd number of times — one side may be missing.`,
        itemId: item.id,
      })
      // Only surface this once per pose, not once per occurrence.
      bilateralCounts.delete(item.poseSlug)
    }
  }

  const lastItem = [...flow.items].sort((a, b) => a.order - b.order).at(-1)
  if (lastItem && !isStillnessNode(lastItem.poseSlug)) {
    warnings.push({
      code: 'closing-stillness',
      message: 'This flow does not close on a stillness pose.',
      itemId: lastItem.id,
    })
  }

  return warnings
}
