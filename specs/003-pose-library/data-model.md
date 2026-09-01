# Phase 1 Data Model: Pose Library

`data/poses/*.json` is the single source of truth (FR-001) and stays readable with no
account, subscription, or entitlement (FR-002, RULE-O6/O7). Nothing here introduces a
server mirror (FR-003).

---

## 1. The Tier-1 field set, as the validator enforces it

Derived at runtime as `schema.required` minus `schema['x-tier2-properties']`, never
hard-coded. Today that is **24 fields**, and the two sets are disjoint — the subtraction
is a no-op, kept as a guard against a future field appearing in both.

```
base_of_support   bilateral         body_position     breathing_cues
cog_height        complexity        contraindications default_measure
difficulty        energetic_direction                 energetic_quality
english           intensity         level             modes
orientation       plane             prop_free_variation
props_required    sanskrit          slug              source
spinal_action     zone
```

`source` (FR-004) is in this set, so attribution cannot be bypassed by a new field —
including `energetic_direction`, which US2 depends on.

**Coverage reporting** (FR-007). `tier1Coverage(poses, tier1Fields)` returns:

| Key | Shape | Meaning |
|---|---|---|
| `overall` | number, 0–1 | Fraction of (pose × field) pairs present |
| `perField` | `Record<field, {present, total}>` | Which field is regressing, not just that one is |
| `gaps` | `Array<{slug, field}>` | Every absence, named on both axes (FR-005) |

The per-field breakdown is what makes SC-002 real: a partial regression is visible before
it reaches zero. Only fields below 100% get a printed line, so the healthy case stays one
summary row.

**Tier-2** (20 fields) keeps its existing report, which never fails CI. Opportunistic
backfill is the point of the tier; a Tier-2 gap is information, not an error.

---

## 2. `energetic_direction` → label (US2)

Three enum values, fixed by the schema. `src/lib/pose-library/energetic-direction.ts`
exports one map; `004` will consume the same one.

| Value | Label | Gloss |
|---|---|---|
| `brahmana` | building | Expanding, warming, drawing energy outward |
| `langhana` | reducing | Condensing, cooling, drawing energy inward |
| `samana` | balancing | Neither building nor reducing; settling toward centre |

The Sanskrit term stays visible beside the English (`brahmana — building`). This is
traditional vocabulary with no exact English equivalent, not invented UI copy, and hiding
it would make the atlas less useful to the teachers it is for. The schema's own
description phrases the same distinction as heating / cooling / neutral; FR-010 phrases it
as building / reducing / balancing. They agree — the label follows FR-010, and the gloss
carries the thermal reading.

**Rendering** (FR-012): the pose detail meta block, at the `simple` progressive-depth
layer, since FR-012 says *readable*, not *gated*. Token-coloured
(`var(--surface-raised)` / `var(--foreground)`) — deliberately **not** the purple that
`ComposeFlowItem.tsx:172` currently gives this field, because purple is the sanctioned
*chakra* hue and re-spending it here is the FR-040 palette migration the spec guards
against.

---

## 3. The region ↔ legend model (US3)

### Existing, unchanged

`MUSCLE_REGION_MAP: Record<MuscleGroup, SvgRegion[]>` in
`src/lib/pose-library/body-map.ts`. Many-to-many in both directions, and the reverse
direction is where the interesting cases are:

| Region | Reached from |
|---|---|
| `region-psoas` | `psoas`, `hip-flexors` |
| `region-iliacus-l` | `iliacus`, `hip-flexors` |

### Derived

**`REGION_TO_MUSCLES: Record<SvgRegion, MuscleGroup[]>`** — inverted from
`MUSCLE_REGION_MAP` at module load. Derived rather than hand-maintained so the two cannot
disagree. Tapping `region-psoas` must highlight *both* `psoas` and `hip-flexors`;
highlighting only one is the "appearing to select the wrong thing" FR-014 forbids.

**`getLegendEntries(…, view)` → `LegendEntry[]`**:

| Field | Type | Why |
|---|---|---|
| `key` | string | Stable identity for selection state and testids |
| `label` | string | Display text |
| `category` | `'muscles' \| 'meridians' \| 'joints' \| 'chakras'` | Which hue and which tab |
| `regionIds` | `SvgRegion[]` | What to highlight |
| `primaryView` | `'front' \| 'back'` | **Load-bearing** — see below |

`primaryView` exists because regions are view-scoped. `MUSCLE_REGION_MAP.hamstrings` is
back-only, so tapping the `hamstrings` chip from the front view highlights nothing and
SC-004 fails. A legend tap sets the highlight and the view in the same update.

### Widened

`getActiveJointIds(joints, view, bilateral)` returns `Array<{cx, cy}>` today and discards
the joint name, which makes joint-legend linking impossible. It becomes
`Array<{ id, joint, cx, cy }>` where `id` is `joint-{name}` or `joint-{name}-mirror`. This
is a breaking signature change — every call site needs checking first.

### The invariant that keeps SC-004 true

Every id in `REGION_TO_MUSCLES` exists as a key in `BodySvg`'s `MUSCLE_PATHS`, and every
`MUSCLE_PATHS` key appears in `REGION_TO_MUSCLES`. This holds against real data today; the
round-trip test is what makes it fail the day someone adds a region path with no map entry.

---

## 4. `emotional_release_potential[].emotion` (US5 — deferred, designed here)

**Current**: `{"type": "string", "minLength": 1}`. Free text. 38 distinct values across 67
poses, with obvious duplicates.

**Target**: a new `data/schemas/theme-taxonomy.json` holding the canonical closed set —
one entry per emotion with `slug`, `label`, `subhead`, `tcm_organs[]` — and an `enum` on
`emotion` referencing its slugs. Version-controlled and openly readable like the rest of
the data (RULE-O2/O6).

The field **stays in `x-tier2-properties`**. That is the point: the enum can fail CI on a
bad value without the Tier-1 gate changing shape, and a pose that simply omits the field
is still valid.

The proposed collapse, the complete 38 → N mapping, and a drafted subhead per canonical
emotion are in `contracts/theme-taxonomy.md`. They need owner sign-off before the data
patch is written — see research.md §2 for why this is the feature's riskiest work.

---

## 5. `pose_favourites` and `pose_notes` (US6 — deferred, designed here)

Modelled on `supabase/migrations/20260826224207_claimed_flows.sql:11-36`, which is a
near-exact template.

```sql
create table pose_favourites (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  pose_slug  text        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, pose_slug)
);

create table pose_notes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  pose_slug  text        not null,
  body       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pose_slug)
);
```

Both get `enable row level security` and four policies each, every one predicated solely
on `user_id = (select auth.uid())`, with the update policy carrying both `using` and
`with check`.

### What is deliberately absent

A private pose note is practice content (Principle VIII). So: **no `org_id`, no
`cohort_id`, no visibility column, no teacher-role predicate, no role enum.** The absence
is the guarantee — RULE-V2 says there must be no column a policy *could* join against —
which is why it is asserted structurally, by querying `information_schema.columns` for
anything matching `%org%` or `%cohort%`, and not only behaviourally.

### `pose_slug` gets no foreign key and no CHECK

Pose slugs live in JSON, not Postgres, so there is no table to reference. Adding a CHECK
constraint enumerating valid slugs would be worse than nothing: it would make Postgres a
second authority over pose identity, against FR-003 and RULE-O6, and every pose addition
would then require a migration.

FR-039's "degrade quietly" falls out of this rather than needing cleanup code — the client
joins favourites against the already-loaded 67 poses, so a slug that no longer exists
simply matches nothing and disappears from the list.

### Two properties that need no code

- **FR-037** — a lapsed subscription cannot revoke access, because no policy consults
  entitlements. RULE-O7 requires this for a user's own records. It is true by
  construction; assert it in review rather than building a check to prove it.
- **FR-038** — deletion cascades from `auth.users` via the existing FK.
