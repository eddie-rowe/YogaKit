# Contract: Pose Library JSON Schema

**File**: `data/schemas/pose.schema.json`
**Validated by**: CI (`ajv validate`, `npm run validate:poses`) on every PR that touches `data/poses/`
**Contributes to**: `src/lib/pose-library/` data access layer, `src/lib/friction/`
**Amended**: 2026-08-17 — this contract previously drifted out of sync with the real
schema (missing `type_tags`, `muscle_groups`, `complexity`, `chakras`, and a dozen other
fields already shipped). This version matches the current `pose.schema.json` verbatim,
plus documents the ten new Tier-1 geometry fields Phase C adds. See
`docs/krama-atlas.md` for the full field dictionary, the spec-vocabulary name mapping,
and the tier rationale.

---

## Tier rule

Tier-1 fields are required for every pose before the Sept 30 gate. Tier-2 fields are
backfilled opportunistically — `npm run validate:poses` fails CI on missing Tier-1
fields only; Tier-2 gaps produce a warning report, never a CI failure.
`additionalProperties: false` — every field, Tier-1 or Tier-2, must be declared in the
schema before any pose file can use it.

## Current schema (already shipped, all Tier-1 in practice)

Required fields today: `slug`, `sanskrit`, `english`, `modes`, `body_position`,
`meridians`, `energetic_quality`, `difficulty`, `props_required`, `contraindications`,
`bilateral`, `source`, `type_tags`, `muscle_groups`, `complexity`, `injury_risk`,
`breathing_cues`, `joint_action`, `primary_joints_involved`, `nervous_system_effect`,
`tissue_depth`, `modifications`, `dosha_affinity`, `emotional_release_potential`,
`sequencing_position`.

Per `docs/krama-atlas.md`, this list splits for v0.1 purposes into:

- **Tier-1** (gates CI): `slug`, `sanskrit`, `english`, `aliases`, `modes`,
  `body_position`, `energetic_quality`, `difficulty`, `complexity`, `breathing_cues`,
  `bilateral`, `contraindications`, `props_required`, `prop_free_variation`, `source`.
- **Tier-2** (opportunistic, in schema already): `type_tags`, `muscle_groups`,
  `injury_risk`, `joint_action`, `primary_joints_involved`, `nervous_system_effect`,
  `tissue_depth`, `modifications`, `dosha_affinity`, `emotional_release_potential`,
  `sequencing_position`, `before_poses`, `after_poses`, `chakras`, `tradition_names`,
  `element`, `meridians`, `counterposes`, `rebound_pose`, `notes`.

This reclassification is a validator-behavior change, not a schema shape change — the
fields above are already `required` in `pose.schema.json`'s `required` array; Phase C
moves the CI gate to only the true Tier-1 subset (dropping `type_tags`, `muscle_groups`,
`injury_risk`, `joint_action`, `primary_joints_involved`, `nervous_system_effect`,
`tissue_depth`, `modifications`, `dosha_affinity`, `emotional_release_potential`,
`sequencing_position` from the hard-required list, while keeping them declared
properties that CI reports on as a warning when absent).

## New Tier-1 fields (Phase C schema addition — not yet in `pose.schema.json`)

These ten fields feed the friction engine (`contracts/friction-engine.md`) and don't
exist in the schema yet. Phase C adds them as required, `additionalProperties`-declared
properties:

```json
{
  "base_of_support": {
    "type": "array",
    "minItems": 1,
    "items": {
      "enum": ["hands", "feet", "sitbones", "forearms", "knees", "back", "shoulders"]
    },
    "description": "Contact points touching the ground. Feeds the friction engine's contact term (35% weight)."
  },
  "orientation": {
    "enum": ["prone", "supine", "upright", "inverted"],
    "description": "Feeds the friction engine's orientation term (25% weight, combined with level)."
  },
  "cog_height": {
    "enum": ["floor", "low", "mid", "high"],
    "description": "Center-of-gravity height. Feeds the friction engine's cog term (20% weight)."
  },
  "spinal_action": {
    "enum": ["flexion", "extension", "neutral", "lateral", "rotation"],
    "description": "Feeds the friction engine's spine term (10% weight)."
  },
  "plane": {
    "enum": ["sagittal", "coronal", "transverse", "multi"],
    "description": "Feeds the friction engine's plane term (10% weight)."
  },
  "level": {
    "enum": ["high", "middle", "low"],
    "description": "Kinesphere level; combines with orientation for the orientation term."
  },
  "zone": {
    "enum": ["near", "mid-reach", "far"],
    "description": "Kinesphere zone; informative in v0.1, not yet weighted in the friction formula."
  },
  "energetic_direction": {
    "enum": ["brahmana", "langhana", "samana"],
    "description": "Heating/cooling/neutral energetic direction; drives the six-phase template's default intent tags."
  },
  "intensity": {
    "type": "integer",
    "minimum": 1,
    "maximum": 5,
    "description": "How much this pose asks of the nervous system/tissue. Distinct from complexity (1-10, how hard to enter/hold)."
  },
  "default_measure": {
    "type": "object",
    "oneOf": [
      { "required": ["breaths"], "properties": { "breaths": { "type": "integer", "minimum": 1 } }, "additionalProperties": false },
      { "required": ["seconds"], "properties": { "seconds": { "type": "integer", "minimum": 1 } }, "additionalProperties": false }
    ],
    "description": "The Compose surface's default hold entry. Distinct from modes[].hold_range, which stays a minutes-based yin-style range."
  }
}
```

All ten join the Tier-1 `required` list. Backfilling them across the existing 43 poses
plus authoring them for the ~20 new yang poses is Phase C's critical-path work — the
friction engine cannot run without them.

## Slug validation rules (unchanged)

- Format: `^[a-z][a-z0-9-]*$`
- Must be unique across all files in `data/poses/`. CI rejects duplicate slugs.
- File name must match slug: `sleeping-swan.json` contains `"slug": "sleeping-swan"`.
- Once assigned, slugs never change (counterpose/before_poses/after_poses references
  depend on them).

## Attribution requirements (RULE-O3, unchanged)

- `source` must not be empty. CI rejects `""`, `null`, or missing.

## Contraindication vocabulary (unchanged)

Poses may only reference slugs from `data/schemas/contraindications.json` (currently 29
slugs). New slugs require an issue/discussion before a PR, not an inline addition.

## Adding a new pose (contributor guide summary)

1. Choose a unique slug in `^[a-z][a-z0-9-]*$` format.
2. Create `data/poses/<slug>.json` conforming to this schema, filling every Tier-1 field
   (see `docs/krama-atlas.md` for the full list, including the ten new geometry fields).
3. Run `npm run validate:poses` locally — check the Tier-1 completeness report as well
   as the schema pass/fail.
4. Open a PR — CI validates automatically; Tier-2 gaps do not block merge.
5. Do not copy copyrighted translation text verbatim; paraphrase and attribute via
   `source`.
