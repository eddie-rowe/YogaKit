# Contributing to Yoga Kit

Yoga Kit is a free, open-source yoga sequencing PWA for teachers. Contributions welcome — especially pose library expansions and accessibility improvements.

## Quick start

```bash
npm install
cp .env.local.example .env.local  # add your ANTHROPIC_API_KEY
npm run dev
```

## Adding poses

Poses live in `data/poses/<slug>.json`. Slugs are canonical identifiers — they appear in URL parameters, contraindication references, and counterpose lists.

### Slug rules

- All lowercase, letters and digits only, words separated by hyphens: `sleeping-swan`, `half-butterfly`
- Must match the filename exactly: `sleeping-swan.json` → slug `"sleeping-swan"`
- Once assigned, slugs never change (counterpose references depend on them)

### Pose schema

Every file must conform to `data/schemas/pose.schema.json`. Run the validator before committing:

```bash
npm run validate:poses
```

Key fields:

| Field | Type | Notes |
|---|---|---|
| `slug` | string | Matches filename, kebab-case |
| `sanskrit` | string | Diacritics permitted |
| `english` | string | Common English name |
| `modes` | PoseMode[] | ≥1 mode; type is `yin`, `yang`, or `both` |
| `body_position` | enum | `supine`, `prone`, `seated`, `kneeling`, `standing`, `inverted` |
| `meridians` | string[] | Slugs from `data/meridians/` records |
| `element` | FiveElement or null | `wood`, `fire`, `earth`, `metal`, `water` |
| `contraindications` | string[] | Slugs only from `data/schemas/contraindications.json` |
| `bilateral` | boolean | True if pose has distinct left/right sides |
| `source` | string | Attribution: book, teacher, or "Traditional" |

### Attribution requirements

- Every pose must have a `source` field that is not empty
- Accepted: book title + author, teacher name, "Traditional", "Various sources"
- Not accepted: empty string or generic "unknown"

### Contraindication vocabulary

Poses may only reference slugs from the 29 canonical contraindications defined in `data/schemas/contraindications.json`. Do not create new slugs — open a discussion first.

## Pipeline architecture

The generation pipeline has a fixed, immutable order:

```
AI propose → rules engine constrain → safety validate
```

No stage may be skipped or reordered. The safety layer (`validate.ts`) is the final authority. All changes to pipeline files require 100% test coverage on `constrain.ts` and `validate.ts`.

## Tests

```bash
npx vitest run              # unit + integration
npm run validate:poses      # schema validation
npx tsc --noEmit            # type check
```

The CI pipeline runs all three on every push.

## Commit style

Use imperative mood: "Add crow pose", "Fix bilateral side enforcement", "Update kidney meridian body focus".

## Opening issues

For new contraindication slugs, non-obvious pose anatomy decisions, or pipeline behavior changes — open an issue before submitting a PR. These affect every teacher's safety constraints.
