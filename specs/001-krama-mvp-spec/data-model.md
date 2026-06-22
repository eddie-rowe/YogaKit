# Data Model: Krama MVP

**Phase 1 output** | **Date**: 2026-06-22

All types are TypeScript interfaces. They represent the data shapes at each pipeline
stage boundary and in the pose library. No ORM, no database — the pose library is
static JSON; sequences are serialized to IndexedDB as JSON blobs.

---

## Dimension Allowed Values (enums)

```typescript
type Style         = 'yin' | 'vinyasa' | 'ashtanga' | 'restorative';
type Season        = 'spring' | 'summer' | 'late-summer' | 'autumn' | 'winter';
type Dosha         = 'vata' | 'pitta' | 'kapha' | 'vata-pitta' | 'pitta-kapha'
                   | 'vata-kapha' | 'tridoshic';
type FiveElement   = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
type BodyPosition  = 'supine' | 'prone' | 'seated' | 'kneeling' | 'standing'
                   | 'inverted';
type EnergeticQ    = 'grounding' | 'opening' | 'cooling' | 'heating' | 'calming'
                   | 'stimulating';
type IntensityCurve = 'bell' | 'plateau' | 'gradual-ramp' | 'front-loaded'
                   | 'back-loaded';
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'mixed';
type PoseDifficulty  = 'accessible' | 'intermediate' | 'advanced';
type ModeType      = 'yin' | 'yang' | 'both';
```

---

## Pose Library Types

```typescript
/** Canonical hold time range in minutes. */
interface HoldRange {
  min: number;  // minutes
  max: number;  // minutes
}

/** One expression of a pose (yin or yang mode). */
interface PoseMode {
  type: ModeType;
  tissue_target: 'connective' | 'muscular' | 'both';
  hold_range: HoldRange;      // yin: typically 2–8 min; yang: 5–30 breaths (represented as seconds)
  cue_notes: string;          // brief teaching note for this mode
}

/** A single entry in the pose library. */
interface Pose {
  slug: string;               // canonical identifier e.g. "sleeping-swan"
  sanskrit: string;           // e.g. "Kapotasana variation"
  english: string;            // e.g. "Sleeping Swan"
  aliases: string[];          // e.g. ["Half Pigeon", "Eye of the Needle (variation)"]

  modes: PoseMode[];          // at least one; may have both yin and yang

  body_position: BodyPosition;
  meridians: string[];        // slugs e.g. ["liver", "gallbladder"]
  element: FiveElement | null;

  energetic_quality: EnergeticQ[];
  difficulty: PoseDifficulty;

  props_required: string[];   // e.g. ["bolster", "block"]; empty if none
  prop_free_variation: string | null; // slug of a variant that needs no props, or null
  counterposes: string[];     // pose slugs; poses that follow naturally
  rebound_pose: string | null;// slug of the rebound/rest pose after a deep hold

  contraindications: string[];// categorical slugs e.g. ["high-blood-pressure",
                              //   "hip-replacement", "pregnancy-second-trimester"]
  bilateral: boolean;         // true if the pose must be done on both sides

  source: string;             // attribution e.g. "Paul Grilley, Yin Yoga (2002)"
  notes: string;              // optional teaching notes / lineage context
}
```

---

## Meridian Record

```typescript
interface MeridianRecord {
  slug: string;               // e.g. "liver"
  organ: string;              // e.g. "Liver"
  element: FiveElement;
  direction: 'ascending' | 'descending';
  peak_hours: string;         // e.g. "1am–3am"
}

interface ElementRecord {
  element: FiveElement;
  season: Season;
  meridians: MeridianRecord[];
  themes: string[];
  emotions: {
    balanced: string;
    excess: string;
    deficiency: string;
  };
  body_focus: string[];       // anatomical areas this element's poses tend to load
}
```

---

## Session Context (teacher input)

```typescript
/** Hard constraints — enforced by safety layer. */
interface HardConstraints {
  contraindications: string[];  // categorical slugs from the contraindications vocabulary
  propsAvailable: string[];     // props the class has access to; safety layer checks this
  // If propsAvailable is undefined/null, treat as all props available.
}

/** All teacher-set dimensions for a session. All fields optional. */
interface SessionContext {
  style?: Style;
  durationMinutes?: number;
  timeOfDay?: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  season?: Season;

  experienceLevel?: ExperienceLevel;
  ageRange?: { min: number; max: number };
  fitnessLevel?: 'low' | 'moderate' | 'high';
  numberOfStudents?: number;
  roomTemperature?: 'cool' | 'neutral' | 'warm' | 'heated';
  classFormat?: 'drop-in' | 'series';

  targetSystem?: string;        // free text e.g. "hips", "spine", "nervous system"
  meridianFocus?: string[];     // meridian slugs e.g. ["liver", "gallbladder"]
  elementFocus?: FiveElement;

  doshaEmphasis?: Dosha;
  goal?: string;                // free text e.g. "downregulate nervous system"
  theme?: string;               // free text e.g. "letting go"

  intensityCurve?: IntensityCurve;
  poseComplexity?: 'simple' | 'moderate' | 'complex';
  yinYangBalance?: number;      // 0.0 = pure yin, 1.0 = pure yang; 0.2 typical for yin class
  density?: 'sparse' | 'moderate' | 'dense';

  hardConstraints: HardConstraints;
}
```

---

## Pipeline Stage Interfaces

These are the typed boundaries between the three pipeline stages (RULE-H1).

### Stage 1 → Stage 2: PipelineDraft (AI output, untrusted)

```typescript
/** A proposed pose entry from the AI layer. Treated as untrusted. */
interface DraftPoseEntry {
  poseSlug: string;           // AI's suggested pose — may not exist in library
  modeType: ModeType;
  holdMinutes: number;
  why: string;                // AI-generated rationale
  transitionFromPrev: string; // AI-generated transition note
  suggestedAlternateSlugs: string[];
}

/** The AI layer's full draft — untrusted input to the rules engine. */
interface PipelineDraft {
  themeStatement: string;
  philosophicalFraming: string;
  quote: {
    text: string;
    attribution: string;
  };
  poses: DraftPoseEntry[];
  aiModelUsed: string;        // for provenance tracking
  generationSkipped: boolean; // true when AI was unavailable; rules engine seeded this
}
```

### Stage 2 → Stage 3: ConstrainedSequence (rules engine output)

```typescript
/** A sequence item after rules engine processing. Poses are validated against library. */
interface SequenceItem {
  pose: Pose;                 // resolved from library by slug; invalid slugs dropped
  modeType: ModeType;
  holdMinutes: number;
  side?: 'left' | 'right' | 'both'; // set by bilateral logic
  why: string;                // carried from AI or generated by rules engine
  transitionFromPrev: string;
  transitionToNext: string;   // rules engine may add/update this
  alternates: Pose[];         // resolved and ranked by dimensional alignment
}

interface ConstrainedSequence {
  sessionContext: SessionContext;
  themeStatement: string;
  philosophicalFraming: string;
  quote: { text: string; attribution: string };
  items: SequenceItem[];
  totalHoldMinutes: number;   // sum computed by rules engine
  generationProvenance: 'ai-assisted' | 'rules-only';
}
```

### Stage 3 output: ValidatedSequence (safety layer output — final)

```typescript
/** Safety layer's report for a single item. */
interface SafetyNote {
  poseSlug: string;
  issue: string;              // plain language description of what was caught
  action: 'replaced' | 'gap-inserted';
  replacedWith?: string;      // slug of replacement pose, if replaced
}

/** The final output shown to the teacher. */
interface ValidatedSequence extends ConstrainedSequence {
  safetyNotes: SafetyNote[]; // empty if no interventions; shown to teacher if non-empty
  passedValidation: boolean;  // always true when shown to UI (false sequences are retried)
  timingSumWarning?: string;  // present if total still outside ±5 min after correction
}
```

---

## Saved Sequence (P2 — IndexedDB)

```typescript
interface SavedSequence {
  id: string;                 // UUID generated at save time
  title: string;              // teacher-provided or auto-generated from theme
  savedAt: string;            // ISO 8601
  sequence: ValidatedSequence;
  rating?: 1 | 2 | 3 | 4 | 5;
  postTeachingNotes?: string;
  taughtAt?: string;          // ISO 8601
}
```

---

## Contraindication Vocabulary

Canonical slugs for the safety layer's constraint matching. Poses tag themselves with
these slugs; teachers select from this list in the UI. Extensible via PR.

```
high-blood-pressure
glaucoma
vertigo
recent-surgery-general
recent-surgery-hip
recent-surgery-knee
recent-surgery-shoulder
hip-replacement
knee-replacement
pregnancy-first-trimester
pregnancy-second-trimester
pregnancy-third-trimester
postpartum-recent          # within 6 weeks
herniated-disc-lumbar
herniated-disc-cervical
sciatica
carpal-tunnel
wrist-injury
ankle-injury
shoulder-injury
no-floor-transitions
chair-based                # practice must remain seated
no-inversions
no-forward-folds
no-backbends
no-hip-external-rotation
no-hip-internal-rotation
no-deep-hip-flexion
no-spinal-rotation
```

---

## State Transitions: Sequence Lifecycle

```
[Dimensions Set] → generate() → [PipelineDraft] → constrain() → [ConstrainedSequence]
                                                              → validate() → [ValidatedSequence]
                                                                          ↓
                                                              [Displayed to Teacher]
                                                                          ↓
                          [Teacher Reviews / Edits / Swaps] (no regen)
                                                                          ↓
                          [Export Cue Sheet] or [Save to Library (P2)]
```
