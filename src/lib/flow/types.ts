// Flow entity types — the canonical end-to-end entity name (renamed from "Sequence",
// see specs/001-krama-mvp-spec/data-model.md and DECISIONS.md).

import type { DefaultMeasure, EnergeticDirection, ModeType, Pose } from '@/lib/pose-types'

export type LayerName = 'simple' | 'advanced' | 'expert' | 'custom'

export interface LayerPreference {
  layer: LayerName
  visibleFields: string[] // pose fields shown in Compose at this layer; ignored unless layer === 'custom'
}

/** A named, reorderable, optional grouping of Flow Items. */
export interface Phase {
  id: string
  name: string
  intentTag: EnergeticDirection
  order: number
}

/** A single step in a flow. */
export interface FlowItem {
  id: string
  poseSlug: string // resolved against the pose library at render time
  mode: ModeType
  measure: DefaultMeasure // breaths or seconds, overridable per item
  note?: string
  phaseId: string | null // null = ungrouped
  order: number
}

/** An ordered sub-sequence of poses insertable into a flow as a single unit
 *  (e.g. Sun Salutation A). Not a Pose; not a Flow. Expands into member FlowItems
 *  on insertion. */
export interface Block {
  slug: string
  name: string
  members: Array<{ poseSlug: string; measure: DefaultMeasure }>
}

/** A Pose with near-empty geometry and a distinct, visually quieter read-view
 *  treatment. Four ship in v0.1, identified by slug membership below. */
export type StillnessNode = Pose

export const STILLNESS_NODE_SLUGS = [
  'rebound-supine',
  'constructive-rest',
  'seated-stillness',
  'savasana',
] as const

export function isStillnessNode(poseSlug: string): boolean {
  return (STILLNESS_NODE_SLUGS as readonly string[]).includes(poseSlug)
}

/** The canonical entity for the app's primary output. */
export interface Flow {
  id: string // UUID, generated at save time
  title: string // teacher-provided
  items: FlowItem[]
  phases: Phase[] // may be empty (ungrouped flow)
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  isBuiltIn: boolean // true for the 3 shipped templates; read-only
  schema_version: string // e.g. "0.1.0" — see contracts/flow-file-format.md
}

export interface KramaFile {
  schema_version: string
  exported_at: string // ISO 8601
  flow: Flow
}
