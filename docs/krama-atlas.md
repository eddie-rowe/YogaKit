# Krama Atlas — Pose Field Dictionary

Companion to the locked spec (`docs/krama-v0.1-spec.md` §4). This is the authority for
every field in `data/schemas/pose.schema.json`: what it means, which entry tier it
belongs to, and how it maps onto the vocabulary in the v0.1 spec (which was written from
an external notebook and doesn't always use the repo's field names).

**Tier rule (spec §4, unchanged):** Tier-1 fields are entered for every pose before the
Sept 30 gate. Tier-2 fields are backfilled opportunistically. **Never block a release on
Tier-2 completeness.** `npm run validate:poses` fails CI on missing Tier-1 fields only;
Tier-2 gaps are a warning.

Schema note: `data/schemas/pose.schema.json` sets `additionalProperties: false` — every
field below (and any new one) MUST be declared in the schema before it can be used in a
pose file.

---

## Name mapping (spec vocabulary → repo field)

The spec's §4 was drafted independently of the schema. Where names differ, the repo name
is canonical (43 pose files and all pipeline code already use it) — do not rename data.

| Spec name (§4) | Repo field | Notes |
|---|---|---|
| `id` | `slug` | Canonical identifier, kebab-case, unique. CI rejects a duplicate slug. |
| `name_english` | `english` | |
| `name_sanskrit` | `sanskrit` | |
| `aliases` | `aliases` | Same. |
| `category` / `groupings` | `type_tags` (Tier-2 today; see below) | One or more of the `type_tags` enum values acts as the primary family. |
| `yoga_style` fit | `modes[].type` (`yin`/`yang`/`both`) | The spec's vinyasa/hatha/yin/restorative flags map to which `modes[]` entries exist on a pose, plus `tradition_names` for per-style display names. |
| `cues` (3–5 lines) | `modes[].cue_notes` | One field, not a line array; write as short sentences. |
| `breathing_cues` (1 line) | `breathing_cues` (`entering`/`holding`/`exiting`) | Repo's version is richer (3 phases vs. the spec's 1 line) — keep the repo shape. |
| `default_measure: {breaths|seconds}` | `default_measure` — **new field, added by this doc** | Not in schema yet. See "New Tier-1 fields" below. `modes[].hold_range` (minutes) stays as the yin-style duration range; `default_measure` is the Compose-surface default for breaths-or-seconds entry. |
| `laterality` | `bilateral` (boolean) | Spec implies a richer laterality model (left/right/both/n-a); repo's boolean is coarser. Kept as-is for v0.1 — see Atlas note below. |
| `intensity` (1–5) | `intensity` — **new field, added by this doc** | Distinct from `complexity`. Repo's `complexity` is 1–10 ("how hard to enter/hold"); spec's `intensity` (1–5) is "how much this pose asks of the nervous system/tissue" — keep both. |
| `complexity` (1–5) | `complexity` (1–10, kept as-is) | Do not rescale existing data; the repo's 1–10 scale is finer-grained and already populated across 43 poses. |
| `base_of_support` | `base_of_support` — **new field** | See "New Tier-1 fields." |
| `orientation` | `orientation` — **new field** | |
| `cog_height` | `cog_height` — **new field** | |
| `spinal_action` | `spinal_action` — **new field** | |
| `plane` / `level` / `zone` (kinespherics) | `plane` / `level` / `zone` — **new fields** | |
| `energetic_direction` (brahmana/langhana/samana) | `energetic_direction` — **new field** | Distinct from the existing `energetic_quality` enum (grounding/opening/cooling/heating/calming/stimulating), which stays as-is. |
| `contraindications` (flat strings) | `contraindications` (enum array) | Already flat strings in v0.1 form — no change. |

## Tier 1 — required for all poses before Sept 30

Existing schema fields, already Tier-1 in practice:

- `slug`, `sanskrit`, `english`, `aliases`
- `modes` (`type`, `tissue_target`, `hold_range`, `cue_notes`)
- `body_position`
- `energetic_quality`
- `difficulty`, `complexity`
- `breathing_cues`
- `bilateral`
- `contraindications`
- `props_required`, `prop_free_variation`
- `source`

New Tier-1 fields (schema addition required — tracked in
`specs/001-krama-mvp-spec/contracts/pose-library-schema.md`):

| Field | Type | Purpose |
|---|---|---|
| `base_of_support` | array of strings (contact points: `hands`, `feet`, `sitbones`, `forearms`, `knees`, `back`, `shoulders`, …) | Feeds the friction engine's contact term (35% weight). |
| `orientation` | enum (`prone`, `supine`, `upright`, `inverted`) | Feeds the friction engine's orientation term (25% weight, combined with `level`). |
| `cog_height` | enum (`floor`, `low`, `mid`, `high`) | Feeds the friction engine's cog term (20% weight). |
| `spinal_action` | enum (`flexion`, `extension`, `neutral`, `lateral`, `rotation`) | Feeds the friction engine's spine term (10% weight). |
| `plane` | enum (`sagittal`, `coronal`, `transverse`, `multi`) | Feeds the friction engine's plane term (10% weight). |
| `level` | enum (`high`, `middle`, `low`) | Kinesphere level; combines with `orientation` for the orientation term. |
| `zone` | enum (`near`, `mid-reach`, `far`) | Kinesphere zone; informative, not yet weighted in v0.1's friction formula. |
| `energetic_direction` | enum (`brahmana`, `langhana`, `samana`) | Heating/cooling/neutral energetic direction; drives the default six-phase template's intent tags (Connect=samana, Warm-up=langhana, Build/Peak=brahmana, Land=langhana, Transition=samana). |
| `intensity` | integer 1–5 | See name-mapping row above. |
| `default_measure` | object `{ breaths: n } \| { seconds: n }` | The Compose surface's default hold entry, distinct from `modes[].hold_range` (a range, in minutes, for yin-style holds). |

## Tier 2 — present in schema, backfilled opportunistically

Everything else already in `data/schemas/pose.schema.json`:

- `type_tags`, `muscle_groups`
- `injury_risk`
- `joint_action`, `primary_joints_involved`
- `nervous_system_effect`, `tissue_depth`
- `modifications`
- `dosha_affinity`
- `emotional_release_potential`
- `sequencing_position`
- `before_poses`, `after_poses`
- `chakras`
- `tradition_names`
- `element`, `meridians` (lenses — spec §2 lists lenses UI as OUT for v0.1, but the
  underlying data fields stay populated where already entered; just not surfaced in UI)
- `counterposes`, `rebound_pose`
- `notes`

## Stillness nodes

Four required by the yin built-in (spec §4): `rebound-supine`, `constructive-rest`,
`seated-stillness`, `savasana`. `constructive-rest.json` and `savasana.json` already
exist. `rebound-supine.json` and `seated-stillness.json` are new files. Stillness nodes
carry near-empty geometry (minimal `base_of_support` deltas, `spinal_action: neutral`)
and real durations; the read view gives them a visually quieter treatment (spec §10.2),
never louder.

## Blocks

"Sun Salutation A ships as a built-in *block* (ordered sub-sequence), not a pose" (spec
§4). This has no schema entity yet — it is not a `Pose` and not a `Flow`. Tracked as a
new `Block` entity in `specs/001-krama-mvp-spec/data-model.md`: an ordered list of
`{slug, default_measure}` pairs with its own name, insertable into a Flow as a single
Compose action that expands into its member poses.
