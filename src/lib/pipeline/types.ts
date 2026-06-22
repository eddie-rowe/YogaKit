// Shared TypeScript types for the three-stage sequence generation pipeline.
// These are the typed boundaries between stages (RULE-H1).

// ─── Dimension Enums ────────────────────────────────────────────────────────

export type Style = 'yin' | 'vinyasa' | 'ashtanga' | 'restorative'
export type Season = 'spring' | 'summer' | 'late-summer' | 'autumn' | 'winter'
export type Dosha =
  | 'vata'
  | 'pitta'
  | 'kapha'
  | 'vata-pitta'
  | 'pitta-kapha'
  | 'vata-kapha'
  | 'tridoshic'
export type FiveElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
export type BodyPosition =
  | 'supine'
  | 'prone'
  | 'seated'
  | 'kneeling'
  | 'standing'
  | 'inverted'
export type EnergeticQ =
  | 'grounding'
  | 'opening'
  | 'cooling'
  | 'heating'
  | 'calming'
  | 'stimulating'
export type IntensityCurve =
  | 'bell'
  | 'plateau'
  | 'gradual-ramp'
  | 'front-loaded'
  | 'back-loaded'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'mixed'
export type PoseDifficulty = 'accessible' | 'intermediate' | 'advanced'
export type ModeType = 'yin' | 'yang' | 'both'
export type TissueTarget = 'connective' | 'muscular' | 'both'

// ─── Pose Library Types ──────────────────────────────────────────────────────

export interface HoldRange {
  min: number // minutes
  max: number // minutes
}

export interface PoseMode {
  type: ModeType
  tissue_target: TissueTarget
  hold_range: HoldRange
  cue_notes: string
}

export interface Pose {
  slug: string
  sanskrit: string
  english: string
  aliases: string[]
  modes: PoseMode[]
  body_position: BodyPosition
  meridians: string[]
  element: FiveElement | null
  energetic_quality: EnergeticQ[]
  difficulty: PoseDifficulty
  props_required: string[]
  prop_free_variation: string | null
  counterposes: string[]
  rebound_pose: string | null
  contraindications: string[]
  bilateral: boolean
  source: string
  notes: string
}

// ─── Meridian Data Types ─────────────────────────────────────────────────────

export interface MeridianRecord {
  slug: string
  organ: string
  element: FiveElement
  direction: 'ascending' | 'descending'
  peak_hours: string
}

export interface ElementRecord {
  element: FiveElement
  season: Season
  meridians: MeridianRecord[]
  themes: string[]
  emotions: {
    balanced: string
    excess: string
    deficiency: string
  }
  body_focus: string[]
}

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
  poses: DraftPoseEntry[]
  aiModelUsed: string
  generationSkipped: boolean
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
  items: SequenceItem[]
  totalHoldMinutes: number
  generationProvenance: 'ai-assisted' | 'rules-only'
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
