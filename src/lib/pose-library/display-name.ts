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
