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

Fields are tagged Tier-1 (required for every pose) or Tier-2 (backfilled opportunistically
— never block a PR on Tier-2 completeness). The full field dictionary, including the
newer geometry fields that feed the friction engine (`base_of_support`, `orientation`,
`cog_height`, `spinal_action`, `plane`, `level`, `zone`, `energetic_direction`), lives in
[`docs/krama-atlas.md`](docs/krama-atlas.md). Key fields:

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

## Engine architecture (v0.1)

v0.1 is fully deterministic — there is no AI call in the critical path. The order is:

```
teacher composes → friction engine derives seam indicators → validator-lite warns (never blocks) → read view
```

The friction engine's weights live in one exported constant (tuning is data, not code —
see `docs/krama-atlas.md` and `specs/001-krama-mvp-spec/contracts/friction-engine.md`).
All changes to the friction engine or validator-lite require 100% test coverage.

The prior AI-first pipeline (`src/lib/pipeline/`, `/api/generate`, `/dimensions`) is
parked, not deleted — see `DECISIONS.md`. It's the starting point for v0.2's Suggest
button. Don't extend it for v0.1 work; don't delete it either.

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
