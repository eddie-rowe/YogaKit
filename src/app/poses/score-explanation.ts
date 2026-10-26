/**
 * In-place explanations for the two authored scores. Copy is used verbatim from
 * `specs/003-pose-library/contracts/score-explanation.md` (signed off 2026-10-17); any
 * wording change reopens that sign-off. `complexity` and `injury_risk` are hand-authored
 * integers the friction engine never reads, so nothing here may claim a computation.
 */
export type ScoreField = 'complexity' | 'injury_risk'

export interface ScoreExplanationCopy {
  /** Label shown beside the number, e.g. "Complexity". */
  label: string
  body: string
}

export const COMPLEXITY_EXPLANATION: ScoreExplanationCopy = {
  label: 'Complexity',
  body:
    'How much setup and body awareness the shape asks for — finding the edge, arranging props, ' +
    'knowing when you have arrived. Set by a contributor reading the pose against the rest of ' +
    'the library, not calculated.',
}

export const INJURY_RISK_EXPLANATION: ScoreExplanationCopy = {
  label: 'Injury risk',
  body:
    'How much the shape itself can ask of a joint or a passive structure, before accounting ' +
    'for who is practising it. A low number is not a promise, and a high one is not a warning ' +
    'against the pose — read it alongside the contraindications above.',
}

export const SCORE_EXPLANATION_FOOTER =
  'These are editorial judgements on a 1–10 scale, comparable within this library and not ' +
  'against anything outside it. They are not derived from the sequencing engine.'

export const SCORE_EXPLANATIONS: Record<ScoreField, ScoreExplanationCopy> = {
  complexity: COMPLEXITY_EXPLANATION,
  injury_risk: INJURY_RISK_EXPLANATION,
}
