// Types for the three-stage sequence generation pipeline — the parked AI-proposal
// module (see DECISIONS.md, "park the AI pipeline"). These are pipeline-only: the
// typed boundaries between stages (RULE-H1), and the untrusted-AI-output shapes
// (RULE-H4). Domain types shared with the rest of the app (Pose, PoseMode, the
// dimension enums, meridian records) live in `@/lib/pose-types` — split out during
// the v3.0.0 platform-pivot housekeeping pass (2026-08-26) specifically so this
// module can double in size (or be deleted) without touching anything else.

import type {
  Style,
  Season,
  Dosha,
  FiveElement,
  ExperienceLevel,
  IntensityCurve,
  ModeType,
  Pose,
} from '@/lib/pose-types'

// ─── Session Context (Teacher Input) ─────────────────────────────────────────

export interface HardConstraints {
  contraindications: string[]
  propsAvailable: string[]
}

export interface SessionContext {
  style?: Style
  durationMinutes?: number
  timeOfDay?: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'
  season?: Season
  experienceLevel?: ExperienceLevel
  ageRange?: { min: number; max: number }
  fitnessLevel?: 'low' | 'moderate' | 'high'
  numberOfStudents?: number
  roomTemperature?: 'cool' | 'neutral' | 'warm' | 'heated'
  classFormat?: 'drop-in' | 'series'
  targetSystem?: string
  meridianFocus?: string[]
  elementFocus?: FiveElement
  doshaEmphasis?: Dosha
  goal?: string
  theme?: string
  intensityCurve?: IntensityCurve
  poseComplexity?: 'simple' | 'moderate' | 'complex'
  yinYangBalance?: number
  density?: 'sparse' | 'moderate' | 'dense'
  hardConstraints: HardConstraints
}

// ─── Pipeline Stage 1 → 2: PipelineDraft (AI output, untrusted) ─────────────

export interface DraftPoseEntry {
  poseSlug: string
  modeType: ModeType
  holdMinutes: number
  why: string
  transitionFromPrev: string
  suggestedAlternateSlugs: string[]
}

export interface PipelineDraft {
  themeStatement: string
  philosophicalFraming: string
  quote: {
    text: string
    attribution: string
  }
  sutra: {
    text: string
    attribution: string
  }
  poses: DraftPoseEntry[]
}

// ─── Pipeline Stage 2 → 3: ConstrainedSequence ───────────────────────────────

export interface SequenceItem {
  pose: Pose
  modeType: ModeType
  holdMinutes: number
  side?: 'left' | 'right' | 'both'
  why: string
  transitionFromPrev: string
  transitionToNext: string
  alternates: Pose[]
}

export interface ConstrainedSequence {
  sessionContext: SessionContext
  themeStatement: string
  philosophicalFraming: string
  quote: { text: string; attribution: string }
  sutra: { text: string; attribution: string }
  items: SequenceItem[]
  totalHoldMinutes: number
  transitionMinutes: number
  totalSessionMinutes: number
}

// ─── Pipeline Stage 3 output: ValidatedSequence (final) ──────────────────────

export interface SafetyNote {
  poseSlug: string
  issue: string
  action: 'replaced' | 'gap-inserted'
  replacedWith?: string
}

export interface ValidatedSequence extends ConstrainedSequence {
  safetyNotes: SafetyNote[]
  passedValidation: boolean
  timingSumWarning?: string
}

// ─── Saved Sequence (P2 — IndexedDB) ─────────────────────────────────────────

export interface SavedSequence {
  id: string
  title: string
  savedAt: string
  sequence: ValidatedSequence
  rating?: 1 | 2 | 3 | 4 | 5
  postTeachingNotes?: string
  taughtAt?: string
}
