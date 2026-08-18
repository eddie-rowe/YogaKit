# Data Model: Krama MVP (v0.1)

**Phase 1 output** | **Date**: 2026-06-22 | **Amended**: 2026-08-17

All types are TypeScript interfaces. No ORM, no database — the pose and built-in flow
libraries are static JSON at build time; user-saved flows serialize to
localStorage/IndexedDB and to `.krama.json` on export.

## Amendment note (2026-08-17)

This file previously modeled the AI pipeline's three stage-boundary types
(`PipelineDraft` → `ConstrainedSequence` → `ValidatedSequence`) plus a `SavedSequence`
type and a 29-slug contraindication vocabulary tied to a `SessionContext` teacher-input
form. `docs/krama-v0.1-spec.md` ships none of that in v0.1. This rewrite:

- Replaces the pipeline stage types with `Flow`, `FlowItem`, `Phase`, `Block`,
  `StillnessNode`, `LayerPreference`, and `FrictionResult`.
- Corrects the `Pose` type, which had drifted from the real
  `data/schemas/pose.schema.json` — this version matches the schema plus the Tier-1
  additions in `docs/krama-atlas.md`, and is the type both the code and this doc must
  track going forward.
- Retains the contraindication vocabulary and `SessionContext`-shaped types verbatim in
  the **Deferred to v0.2** section at the bottom — the schema still carries
  `contraindications` on every pose (Tier-1, unchanged), and this shape is what a v0.2
  roster/safety layer would consume.

---

## Pose Library Types

Mirrors `data/schemas/pose.schema.json` (`additionalProperties: false` — every field
here must be declared in the schema; see `docs/krama-atlas.md` for the full dictionary
and the Tier-1/Tier-2 split).

```typescript
type ModeType        = 'yin' | 'yang' | 'both';
type BodyPosition    = 'supine' | 'prone' | 'seated' | 'kneeling' | 'standing' | 'inverted';
type EnergeticQ      = 'grounding' | 'opening' | 'cooling' | 'heating' | 'calming' | 'stimulating';
type PoseDifficulty  = 'accessible' | 'intermediate' | 'advanced';
type FiveElement     = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

// New Tier-1 geometry fields (2026-08-17) — feed the friction engine.
type ContactPoint    = 'hands' | 'feet' | 'sitbones' | 'forearms' | 'knees' | 'back' | 'shoulders';
type Orientation     = 'prone' | 'supine' | 'upright' | 'inverted';
type CogHeight        = 'floor' | 'low' | 'mid' | 'high';
type SpinalAction     = 'flexion' | 'extension' | 'neutral' | 'lateral' | 'rotation';
type Plane             = 'sagittal' | 'coronal' | 'transverse' | 'multi';
type KinesphereLevel  = 'high' | 'middle' | 'low';
type KinesphereZone   = 'near' | 'mid-reach' | 'far';
type EnergeticDirection = 'brahmana' | 'langhana' | 'samana';

interface HoldRange {
  min: number;   // minutes
  max: number;   // minutes
}

/** One expression of a pose (yin or yang mode). */
interface PoseMode {
  type: ModeType;
  tissue_target: 'connective' | 'muscular' | 'both';
  hold_range: HoldRange;
  cue_notes: string;
}

interface DefaultMeasure {
  breaths?: number;
  seconds?: number;
  // Exactly one of breaths/seconds is set. Compose surface's default hold entry —
  // distinct from PoseMode.hold_range, which stays a minutes-based yin-style range.
}

/** A single entry in the pose library. Tier-1 fields are required for every pose
 *  before the Sept 30 gate; Tier-2 fields are backfilled opportunistically and never
 *  block CI. See docs/krama-atlas.md for the full tier assignment. */
interface Pose {
  // Tier 1 — identity
  slug: string;
  sanskrit: string;
  english: string;
  aliases: string[];

  // Tier 1 — modes & body
  modes: PoseMode[];
  body_position: BodyPosition;
  energetic_quality: EnergeticQ[];
  difficulty: PoseDifficulty;
  complexity: number;          // 1–10, existing scale, unchanged
  breathing_cues: { entering: string; holding: string; exiting: string };
  bilateral: boolean;
  contraindications: string[]; // slugs from data/schemas/contraindications.json
  props_required: string[];
  prop_free_variation: string | null;
  source: string;

  // Tier 1 — new geometry fields (2026-08-17, feed the friction engine)
  base_of_support: ContactPoint[];
  orientation: Orientation;
  cog_height: CogHeight;
  spinal_action: SpinalAction;
  plane: Plane;
  level: KinesphereLevel;
  zone: KinesphereZone;
  energetic_direction: EnergeticDirection;
  intensity: number;            // 1–5, distinct from complexity (1–10)
  default_measure: DefaultMeasure;

  // Tier 2 — backfilled opportunistically, never blocks CI
  type_tags?: string[];
  muscle_groups?: string[];
  injury_risk?: string[];
  joint_action?: string[];
  primary_joints_involved?: string[];
  nervous_system_effect?: string;
  tissue_depth?: string;
  modifications?: string[];
  dosha_affinity?: string[];
  emotional_release_potential?: string;
  sequencing_position?: string;
  before_poses?: string[];
  after_poses?: string[];
  chakras?: string[];
  tradition_names?: Record<string, string>;
  element?: FiveElement | null;
  meridians?: string[];
  counterposes?: string[];
  rebound_pose?: string | null;
  notes?: string;
}
```

---

## Friction Engine Types

```typescript
type FrictionTier = 1 | 2 | 3;  // 1 = low friction (smooth seam), 3 = high friction

interface FrictionWeights {
  contact: number;      // 0.35
  orientation: number;  // 0.25
  cog: number;           // 0.20
  spine: number;         // 0.10
  plane: number;         // 0.10
}

interface FrictionResult {
  score: number;         // 0–1, weighted sum of per-term deltas
  tier: FrictionTier;
  reasons: string[];      // plain-language, one per contributing term with a non-zero delta
}

// friction(fromPose, toPose) → FrictionResult — pure function, see contracts/friction-engine.md
type FrictionFn = (fromPose: Pose, toPose: Pose) => FrictionResult;

/** Precomputed at build time over the full pose library. */
type FrictionMatrix = Record<string /* fromSlug */, Record<string /* toSlug */, FrictionResult>>;
```

---

## Flow Types

"Flow" is the canonical entity end-to-end (renamed from "Sequence" — see spec.md
Amendment note and `DECISIONS.md`).

```typescript
type LayerName = 'simple' | 'advanced' | 'expert' | 'custom';

interface LayerPreference {
  layer: LayerName;
  visibleFields: string[];   // pose fields shown in Compose at this layer; ignored when layer !== 'custom'
}

/** A named, reorderable, optional grouping of Flow Items. */
interface Phase {
  id: string;
  name: string;                          // e.g. "Warm-up"; renameable
  intentTag: EnergeticDirection;          // drives default ordering/coloring
  order: number;
}

/** A single step in a flow. */
interface FlowItem {
  id: string;
  poseSlug: string;             // resolved against the pose library at render time
  mode: ModeType;
  measure: DefaultMeasure;      // breaths or seconds, overridable per item
  note?: string;                 // teacher-authored, free text
  phaseId: string | null;        // null = ungrouped
  order: number;
}

/** An ordered sub-sequence of poses insertable into a flow as a single unit
 *  (e.g. Sun Salutation A). Not a Pose; not a Flow. Expands into member FlowItems
 *  on insertion. */
interface Block {
  slug: string;
  name: string;
  members: Array<{ poseSlug: string; measure: DefaultMeasure }>;
}

/** A Pose with near-empty geometry and a distinct, visually quieter read-view
 *  treatment. Four ship in v0.1. */
type StillnessNode = Pose; // identified by membership in the fixed 4-slug set below:
// ['rebound-supine', 'constructive-rest', 'seated-stillness', 'savasana']

/** The canonical entity for the app's primary output. */
interface Flow {
  id: string;                    // UUID, generated at save time
  title: string;                 // teacher-provided
  items: FlowItem[];
  phases: Phase[];                // may be empty (ungrouped flow)
  createdAt: string;              // ISO 8601
  updatedAt: string;               // ISO 8601
  isBuiltIn: boolean;               // true for the 3 shipped templates; read-only
  schema_version: string;           // e.g. "0.1.0" — see contracts/flow-file-format.md
}
```

---

## `.krama.json` Export Envelope

See `contracts/flow-file-format.md` for the full contract; summarized here for the data
model:

```typescript
interface KramaFile {
  schema_version: string;
  exported_at: string;     // ISO 8601
  flow: Flow;
}
```

---

## Validator-Lite Types

```typescript
interface ValidatorWarning {
  code: 'laterality' | 'closing-stillness';
  message: string;          // plain language, names the specific pose/item
  itemId?: string;           // the offending FlowItem, if applicable
}

// validateLite(flow, poseLibrary) → ValidatorWarning[] — pure function, never throws,
// never blocks save/export. See src/lib/validator/lite.ts.
type ValidateLiteFn = (flow: Flow, poseLibrary: Pose[]) => ValidatorWarning[];
```

---

## State Transitions: Flow Lifecycle

```
[Compose: add/reorder/note/phase] → [Draft in memory]
                                          ↓
                          friction() computed per adjacent pair (from precomputed matrix)
                                          ↓
                          validateLite() → ValidatorWarning[] (never blocks)
                                          ↓
                          [Teacher saves] → [Flow persisted to localStorage/IndexedDB]
                                          ↓
                    [Duplicate] ──┐        [Export .krama.json] ──→ [Import elsewhere]
                                  ↓
                          [New editable Flow, isBuiltIn: false]
                                          ↓
                          [Read view] — the 6am artifact, offline-capable, print-ready
```

---

## Deferred to v0.2 (retained for traceability — not implemented in v0.1)

The following types described the AI pipeline's stage boundaries and the roster/safety
input model. They are not deleted from the codebase (`src/lib/pipeline/types.ts` still
defines them) — they are the starting point for v0.2's Suggest button and roster/safety
layer. See `DECISIONS.md` and the spec's "Deferred to v0.2" appendix.

```typescript
// AI proposal stage output — untrusted.
interface DraftPoseEntry {
  poseSlug: string;
  modeType: ModeType;
  holdMinutes: number;
  why: string;
  transitionFromPrev: string;
  suggestedAlternateSlugs: string[];
}
interface PipelineDraft {
  themeStatement: string;
  philosophicalFraming: string;
  quote: { text: string; attribution: string };
  poses: DraftPoseEntry[];
  aiModelUsed: string;
  generationSkipped: boolean;
}

// Roster / hard-constraint input — the future safety layer's enforcement surface.
interface HardConstraints {
  contraindications: string[];
  propsAvailable: string[];
}
interface SessionContext {
  style?: 'yin' | 'vinyasa' | 'ashtanga' | 'restorative';
  durationMinutes?: number;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  hardConstraints: HardConstraints;
  // ...full shape unchanged from the pre-2026-08-17 data-model.md; truncated here.
}

// Safety layer output shape — when it returns, this is the boundary it produces.
interface SafetyNote {
  poseSlug: string;
  issue: string;
  action: 'replaced' | 'gap-inserted';
  replacedWith?: string;
}
```

**Contraindication vocabulary** (unchanged, still Tier-1 on every `Pose`, still the
vocabulary a v0.2 safety layer would match against — see
`data/schemas/contraindications.json` for the current canonical list, currently 29
slugs including `high-blood-pressure`, `glaucoma`, `pregnancy-second-trimester`,
`hip-replacement`, `no-inversions`, and others).
