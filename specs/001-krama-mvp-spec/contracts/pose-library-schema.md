# Contract: Pose Library JSON Schema

**File**: `data/schemas/pose.schema.json`
**Validated by**: CI (`ajv validate`) on every PR that touches `data/poses/`
**Contributes to**: `src/lib/pose-library/` data access layer

---

## Canonical Pose Record Structure

Every file in `data/poses/<slug>.json` must conform to this schema. Fields marked
`required` will fail CI if absent or null.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Pose",
  "type": "object",
  "required": [
    "slug", "sanskrit", "english", "modes", "body_position",
    "meridians", "energetic_quality", "difficulty",
    "props_required", "contraindications", "bilateral", "source"
  ],
  "properties": {
    "slug": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9-]*$",
      "description": "Canonical identifier. Lowercase, hyphens only, no leading digit."
    },
    "sanskrit": { "type": "string", "minLength": 1 },
    "english":  { "type": "string", "minLength": 1 },
    "aliases":  { "type": "array", "items": { "type": "string" }, "default": [] },

    "modes": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["type", "tissue_target", "hold_range"],
        "properties": {
          "type": { "enum": ["yin", "yang", "both"] },
          "tissue_target": { "enum": ["connective", "muscular", "both"] },
          "hold_range": {
            "type": "object",
            "required": ["min", "max"],
            "properties": {
              "min": { "type": "number", "minimum": 0 },
              "max": { "type": "number", "minimum": 0 }
            }
          },
          "cue_notes": { "type": "string", "default": "" }
        }
      }
    },

    "body_position": {
      "enum": ["supine", "prone", "seated", "kneeling", "standing", "inverted"]
    },

    "meridians": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Meridian slugs e.g. ['liver', 'gallbladder']"
    },

    "element": {
      "oneOf": [
        { "enum": ["wood", "fire", "earth", "metal", "water"] },
        { "type": "null" }
      ]
    },

    "energetic_quality": {
      "type": "array",
      "items": {
        "enum": ["grounding", "opening", "cooling", "heating", "calming", "stimulating"]
      },
      "minItems": 1
    },

    "difficulty": {
      "enum": ["accessible", "intermediate", "advanced"]
    },

    "props_required": {
      "type": "array",
      "items": { "type": "string" }
    },

    "prop_free_variation": {
      "oneOf": [{ "type": "string" }, { "type": "null" }],
      "description": "Slug of a prop-free variant, or null if the pose always requires props."
    },

    "counterposes": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Pose slugs that naturally follow this pose."
    },

    "rebound_pose": {
      "oneOf": [{ "type": "string" }, { "type": "null" }],
      "description": "Slug of the rebound/rest pose for deep yin holds."
    },

    "contraindications": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Contraindication slugs from the vocabulary in data-model.md."
    },

    "bilateral": {
      "type": "boolean",
      "description": "True if the pose must be sequenced on both sides."
    },

    "source": {
      "type": "string",
      "minLength": 1,
      "description": "Attribution — teacher/lineage/text. Required; CI rejects empty."
    },

    "notes": {
      "type": "string",
      "default": ""
    }
  }
}
```

---

## Slug Validation Rules

- Format: `^[a-z][a-z0-9-]*$`
- Must be unique across all files in `data/poses/`. CI rejects duplicate slugs.
- File name must match slug: `sleeping-swan.json` contains `"slug": "sleeping-swan"`.

---

## Attribution Requirements (RULE-O3)

- `source` must not be empty. Examples of valid values:
  - `"Paul Grilley, Yin Yoga (2002)"`
  - `"Sarah Powers, Insight Yoga (2008)"`
  - `"Traditional / public domain"`
  - `"Bernie Clark, yinyoga.com"`
- CI will reject any pose record where `source` is `""`, `null`, or missing.

---

## Adding a New Pose (Contributor Guide Summary)

1. Choose a unique slug in `^[a-z][a-z0-9-]*$` format.
2. Create `data/poses/<slug>.json` conforming to this schema.
3. Run `npm run validate:poses` locally to check schema compliance.
4. Open a PR — CI validates automatically.
5. Add any new contraindication slugs to the vocabulary list in `data-model.md` and
   update `data/schemas/contraindications.json` if applicable.
6. Do not copy copyrighted translation text verbatim; paraphrase and attribute.
