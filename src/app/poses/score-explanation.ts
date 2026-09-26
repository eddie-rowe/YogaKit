/**
 * Score-explanation copy — 003 US4 (FR-022, FR-023).
 *
 * Contract: specs/003-pose-library/contracts/score-explanation.md — copy drafted,
 * awaiting owner sign-off (see CLAUDE.md "003 copy awaiting sign-off"). This file uses the
 * contract's copy verbatim; do not hand-write replacement copy here without the same
 * sign-off the contract itself is waiting on.
 *
 * The premise this corrects: `complexity` and `injury_risk` are hand-authored integers in
 * the pose JSON (`data/schemas/pose.schema.json`, `integer 1..10`). The friction engine
 * (`src/lib/friction/`) never reads either field — nothing computes them, so there are no
 * "contributing factors" to describe and no weighting constant to leak. This copy explains
 * an editorial judgement, not a computation, and must never imply otherwise.
 */

export interface ScoreExplanationCopy {
  heading: string
  body: string
  lineage: string
}

export function complexityExplanation(value: number, source: string): ScoreExplanationCopy {
  return {
    heading: `Complexity ${value}/10`,
    body:
      'How much setup and body awareness the shape asks for — finding the edge, arranging ' +
      'props, knowing when you have arrived. Set by a contributor reading the pose against ' +
      'the rest of the library, not calculated.',
    lineage: `Lineage: ${source}`,
  }
}

export function injuryRiskExplanation(value: number, source: string): ScoreExplanationCopy {
  return {
    heading: `Injury risk ${value}/10`,
    body:
      'How much the shape itself can ask of a joint or a passive structure, before ' +
      'accounting for who is practising it. A low number is not a promise, and a high one ' +
      'is not a warning against the pose — read it alongside the contraindications above.',
    lineage: `Lineage: ${source}`,
  }
}

// Shared footer, rendered with both fields (contract: "Shared footer, both fields").
export const SCORE_EXPLANATION_FOOTER =
  'These are editorial judgements on a 1–10 scale, comparable within this library and not ' +
  'against anything outside it. They are not derived from the sequencing engine.'
