// Helpers for resolving tradition-aware pose display names.
// Pure functions — no `fs`, importable by both server and client components.

import type { Pose, Style } from '@/lib/pose-types'

/**
 * Resolve the display name for a pose, optionally biased to a teaching style.
 *
 * Fallback chain: tradition_names[style] → english.
 * `english` is always a non-empty string (schema-required), so this never
 * returns undefined. Does NOT fall back to `sanskrit` — that is always shown
 * separately as an italic subtitle.
 */
export function resolveDisplayName(pose: Pose, style?: Style): string {
  if (style && pose.tradition_names?.[style]) return pose.tradition_names[style] as string
  return pose.english
}

/**
 * A readable name for a pose slug that no longer resolves against the library
 * (FR-031, invariant I10).
 *
 * flow_items.pose_slug has no foreign key and no CHECK, on purpose: pose identity
 * lives in data/poses/*.json (RULE-O6), and enumerating valid slugs in Postgres would
 * make the database a second authority that drifts the first time a pose is renamed.
 * The cost of that choice is exactly this case — a shared or duplicated flow can name
 * a pose this build does not have — and the item has to open anyway.
 *
 * Printing the raw slug is not legible: `half-butterfly-r` is a key, not a name. This
 * humanizes it instead, so a teacher reading at arm's length sees something they can
 * recognise, and the caller shows a quiet caption saying the library does not have it.
 */
export function humanizePoseSlug(slug: string): string {
  const words = slug.trim().split(/[-_\s]+/).filter(Boolean)
  if (words.length === 0) return 'Unnamed pose'
  return words.join(' ').replace(/^./, c => c.toUpperCase())
}

/**
 * The name to render for one flow item: the pose's own display name when the library
 * has it, a humanized slug when it does not. Every flow render path goes through this
 * rather than through its own `?? item.poseSlug`, so "degrades legibly" is one
 * function with one test rather than four fallbacks that drift.
 */
export function resolveItemName(pose: Pose | undefined, slug: string, style?: Style): string {
  return pose ? resolveDisplayName(pose, style) : humanizePoseSlug(slug)
}

/**
 * All names this pose answers to — single source of truth for search corpora.
 * Includes english, sanskrit, flat aliases, and all tradition_names values.
 */
export function allSearchableNames(pose: Pose): string[] {
  return [
    pose.english,
    pose.sanskrit,
    ...(pose.aliases ?? []),
    ...Object.values(pose.tradition_names ?? {}),
  ]
}

/**
 * Whether a pose is eligible to appear in sessions of the given style.
 * Derived from modes[].type — no separate `styles[]` field needed on the pose.
 *
 *   yin / restorative  →  pose must offer a yin or both mode
 *   vinyasa / ashtanga →  pose must offer a yang or both mode
 */
export function appliesToStyle(pose: Pose, style: Style): boolean {
  if (style === 'yin' || style === 'restorative')
    return pose.modes.some(m => m.type === 'yin' || m.type === 'both')
  return pose.modes.some(m => m.type === 'yang' || m.type === 'both')
}
