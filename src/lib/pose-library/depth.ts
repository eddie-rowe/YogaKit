// The progressive-depth ladder shared by the pose detail view and the composer's
// inline escalation (004 FR-056): one definition of the steps, their order, and the
// reveal motion, so the two surfaces cannot drift.

export type DepthStep = 'simple' | 'advanced' | 'expert'

export const DEPTH_STEPS: readonly DepthStep[] = ['simple', 'advanced', 'expert']

export const DEPTH_RANK: Record<DepthStep, number> = { simple: 0, advanced: 1, expert: 2 }

// The step a tap escalates to; the last step collapses back to the first.
export function nextDepth(step: DepthStep): DepthStep {
  return DEPTH_STEPS[(DEPTH_RANK[step] + 1) % DEPTH_STEPS.length]
}

export function depthAtLeast(step: DepthStep, min: DepthStep): boolean {
  return DEPTH_RANK[step] >= DEPTH_RANK[min]
}

// Reveal class for newly shown depth content — defined once in globals.css at
// --duration-base with --ease-standard (≤200ms, no bounce).
export const REVEAL_CLASS = 'kk-reveal'
