// Re-entry offer selection (T041, FR-032/FR-033).
//
// Given the flow the active intention references, pick the smallest unit the pose model
// supports: the first phase that holds poses, or — for a flow with no usable phases — the
// first pose. Structure only: ids and slugs, never cues, movement names or teacher voice.
// There is deliberately no count, duration-owed or "missed days" field, so nothing here can
// express catching up on a missed period (FR-033). Pure and deterministic: no clock, storage
// or network.

import type { Flow } from '@/lib/flow/types'

export type ReentryOffer =
  | { kind: 'phase'; phaseId: string; itemIds: string[] }
  | { kind: 'pose'; itemId: string; poseSlug: string }

/** The slice of a flow this selection reads; the full `Flow` satisfies it. */
export type ReentryFlow = Pick<Flow, 'items' | 'phases'>

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

/** The smallest re-entry unit in `flow`, or null when there is no flow or nothing in it. */
export function reentryOffer(flow: ReentryFlow | null | undefined): ReentryOffer | null {
  if (!flow || flow.items.length === 0) return null

  for (const phase of [...flow.phases].sort(byOrder)) {
    const members = flow.items.filter((i) => i.phaseId === phase.id).sort(byOrder)
    if (members.length > 0) {
      return { kind: 'phase', phaseId: phase.id, itemIds: members.map((i) => i.id) }
    }
  }

  const first = [...flow.items].sort(byOrder)[0]
  return { kind: 'pose', itemId: first.id, poseSlug: first.poseSlug }
}
