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

export type PoseTypeTag =
  | 'forward-fold' | 'backbend' | 'twist' | 'inversion' | 'lateral-stretch'
  | 'hip-opener' | 'heart-opener' | 'groin-opener' | 'hamstring-stretch'
  | 'quad-stretch' | 'ankle-opener' | 'shoulder-opener' | 'spinal-compression'
  | 'spinal-traction' | 'hip-flexor-release' | 'outer-hip' | 'chest-opener'
  | 'neck-release' | 'sacrum-release' | 'restorative' | 'integration'

export type MuscleGroup =
  | 'psoas' | 'iliacus' | 'hip-flexors' | 'hamstrings' | 'quadriceps' | 'glutes'
  | 'piriformis' | 'hip-adductors' | 'hip-abductors' | 'IT-band' | 'lumbar-spine'
  | 'thoracic-spine' | 'cervical-spine' | 'spinal-erectors' | 'chest-pectorals'
  | 'anterior-shoulder' | 'posterior-shoulder' | 'lats' | 'rhomboids' | 'trapezius'
  | 'intercostals' | 'diaphragm' | 'calves' | 'tibialis-anterior' | 'plantar-fascia'
  | 'achilles' | 'ankle-ligaments' | 'wrist-extensors' | 'obliques' | 'sacroiliac-ligaments'

export interface BreathingCues {
  entering: string
  holding: string
  exiting: string
}

export type JointAction =
  | 'flexion' | 'extension' | 'internal_rotation' | 'external_rotation'
  | 'abduction' | 'adduction' | 'compression' | 'traction'
  | 'lateral_flexion' | 'circumduction' | 'inversion' | 'eversion'

export type JointName =
  | 'lumbar' | 'thoracic' | 'cervical' | 'sacroiliac'
  | 'hip' | 'knee' | 'ankle' | 'toes'
  | 'shoulder' | 'elbow' | 'wrist'
  | 'feet' | 'neck'

export type NervousSystemEffect = 'parasympathetic' | 'sympathetic' | 'neutral'

export type TissueDepth = 'superficial' | 'intermediate' | 'deep'

export type DoshaEffect = 'balancing' | 'neutral' | 'aggravating'

export interface DoshaAffinity {
  vata: DoshaEffect
  pitta: DoshaEffect
  kapha: DoshaEffect
}

export interface EmotionalRelease {
  emotion: string
  tcm_organ: string
  notes?: string
}

export interface PoseModification {
  name: string
  description: string
  props_used?: string[]
  accessibility_level: 'accessible' | 'intermediate' | 'advanced'
}

export type SequencingPosition = 'opening' | 'building' | 'peak' | 'cooldown' | 'integration'

export type ChakraName =
  | 'root' | 'sacral' | 'solar-plexus' | 'heart'
  | 'throat' | 'third-eye' | 'crown'

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
  // Enriched fields (added in v0.2)
  type_tags: PoseTypeTag[]
  muscle_groups: MuscleGroup[]
  complexity: number
  injury_risk: number
  breathing_cues: BreathingCues
  // Enriched fields (added in v0.3)
  joint_action: JointAction[]
  primary_joints_involved: JointName[]
  nervous_system_effect: NervousSystemEffect
  tissue_depth: TissueDepth
  modifications: PoseModification[]
  dosha_affinity: DoshaAffinity
  emotional_release_potential: EmotionalRelease[]
  sequencing_position: SequencingPosition[]
  before_poses?: string[]
  after_poses?: string[]
  chakras?: ChakraName[]
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
