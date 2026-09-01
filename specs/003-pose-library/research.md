# Phase 0 Research: Pose Library

Six unknowns, all resolved. Three of them exist because the spec asserts something about
the codebase that turned out not to be true; those are marked **correction** and the
evidence is cited so the next reader can re-check rather than re-litigate.

The six open decisions in `design-input.md` are not repeated here — all six were ratified
at their recommended defaults in the spec's Assumptions section and need no further work.

---

## 1. Validation error formatting and the shape of the coverage figure — **correction**

**Decision**: Extract the validator's logic into a pure module,
`scripts/lib/tier1-report.mjs`, exporting `deriveTier1Fields(schema)`,
`formatAjvError(err, data)`, and `tier1Coverage(poses, tier1Fields)`. Convert
`scripts/validate-poses.js` to `.mjs` so it can import them. Emit a Tier-1 coverage
figure — overall percentage plus a per-field line for anything below 100% — above the
existing Tier-2 report.

**Rationale**: FR-008 asks for a blocking CI gate, and it already exists —
`.github/workflows/ci.yml:29-30` runs `npm run validate:poses` with no `|| true`. **But
FR-006 is not satisfied.** The script's error loop prints only `err.instancePath` and
`err.message`, and Ajv's message for an enum violation is the bare *"must be equal to one
of the allowed values"*: it names neither the offending value nor the permitted set.
FR-006 ("names the offending value") and US2/AS3 ("names the permitted values") both
require exactly that. `formatAjvError` resolves the `instancePath` against the document to
recover the actual value and appends `err.params.allowedValues`.

`deriveTier1Fields` computes `schema.required` minus `x-tier2-properties` rather than
hard-coding a list. Today those sets are disjoint — 24 required, 20 Tier-2, zero overlap —
so the subtraction is a no-op. It is there so that promoting a field to Tier-2 without
removing it from `required` cannot silently produce a wrong coverage denominator.

**Alternatives considered**: Bolting a `--dir` flag onto the existing script and driving
it through temp fixture directories. Rejected as the *primary* mechanism — slow, and it
puts filesystem setup between the assertion and the thing asserted. The flag is kept for
one integration case, because SC-001 is about the gate exiting non-zero, not merely about
the reporter noticing.

## 2. The theme taxonomy is not closed — **correction**

**Decision**: Read FR-029 as *establishing* the closed set rather than preserving one.
US5 gains a new `data/schemas/theme-taxonomy.json`, an `enum` on
`emotional_release_potential[].emotion` referencing its slugs, and a signed remap of the
affected pose files. The field **stays in `x-tier2-properties`**, so the enum can fail CI
on a bad value without changing the Tier-1 gate's shape.

**Rationale**: FR-029 says the taxonomy "MUST remain the existing curated, closed set and
MUST NOT become an open or ad hoc tag set." It already is an ad hoc tag set. The schema
types `emotion` as `{"type":"string","minLength":1}` — free text — and the 67 files hold
**38 distinct values**, including `frustration` / `frustration and anger` /
`frustration and burden`, three variants of `grief`, and one snake-cased
`tension_and_control`. `PosesClient.tsx:57-59,133-137` groups on the raw string, so the
theme view renders roughly 38 near-duplicate sections. FR-027's "one subhead per section"
is unauthorable against that, and SC-010's "100% of sections carry a subhead" would be
satisfied by writing 38 subheads for what are really a dozen themes.

**This reclassifies US5 from a copy pass to a data migration**, and it is the riskiest
work in the feature — not US6's RLS, which is well-patterned. The collapse needs domain
authority: whether `grief and letting go` folds into `grief` is a judgement about the
practice, not about the code. Getting it wrong ships a clinical-sounding label beside a
pose list, which is the failure FR-027 exists to prevent. The proposed collapse and its
full 38 → N mapping table are in `contracts/theme-taxonomy.md`, drafted for sign-off in
the same round as the score copy.

**Alternatives considered**: Normalizing at read time in `PosesClient` and leaving the
data alone. Rejected — it puts the taxonomy in application code where nothing validates
it, and the next contributor adding a pose gets no feedback that `grief and holding` is
not a theme.

## 3. `complexity` and `injury_risk` are authored, not derived — **correction**

**Decision**: The FR-022/023 explanation copy states that a contributor recorded the
number on a documented 1–10 scale and cites `pose.source`. It never claims the app
computed it, and it exposes no weighting constant (there is none to expose). Render
`complexity` unconditionally and `injury_risk` behind a `!= null` guard.

**Rationale**: The spec's Derived Score entity says these are "computed from pose
geometry". They are not: both are hand-authored integers in the JSON, schema-typed
`integer 1..10` with prose descriptions, and the friction engine never reads either.
Explaining a number by a mechanism that does not exist would satisfy RULE-T3's letter
while defeating it — the reader would come away with a false model of where the number
came from, which is worse than no explanation.

Two consequences worth stating plainly. First, **neither number is rendered anywhere
today** — they surface only as sort options (`PosesClient.tsx:302-306`) and two max
sliders. So FR-022 is currently *vacuously* satisfied and SC-009's denominator is zero;
US4 raises it to three (two slider labels and the detail-view figure). Second, the
tier tension resolves without reclassifying anything.

**On the tier tension specifically**: `complexity` is Tier-1 (in `required`),
`injury_risk` is Tier-2 (in `x-tier2-properties`), yet FR-022 pairs them. `injury_risk` is
in fact present on all 67 poses today. Reclassify neither. Tier-2 means "may be absent,
never fails CI", so the distinction lives in code as a null guard rather than as a
recurring argument, and today's full coverage stops being load-bearing. Promoting
`injury_risk` to Tier-1 would change what the friction engine is contractually allowed to
assume about its input — well outside this feature.

## 4. Region ↔ legend linking, including the view-switch case

**Decision**: Derive an inverse `REGION_TO_MUSCLES` from `MUSCLE_REGION_MAP` at module
load. Widen `getActiveJointIds` to carry the joint name. Add
`getLegendEntries(…, view)` returning `{ key, label, category, regionIds, primaryView }`.
A legend tap sets the highlight **and** the view in the same state update.

**Rationale**: `MUSCLE_REGION_MAP` is genuinely many-to-many — `region-psoas` is reached
from both `psoas` and `hip-flexors`, `region-iliacus-l` from both `iliacus` and
`hip-flexors` — so FR-014's "without appearing to select the wrong thing" is a real case,
not a hypothetical, and both directions must highlight *sets* rather than single partners.
Inverting programmatically rather than hand-maintaining a second table is what keeps the
two from drifting.

The non-obvious part is **view scoping**, and SC-004 fails without it: regions are front-
or back-scoped, so tapping the `hamstrings` legend chip while the front view is showing
highlights nothing at all, because `MUSCLE_REGION_MAP.hamstrings` is back-only. That reads
as a broken control. Hence `primaryView` on each legend entry, the same-update view flip,
and a small front/back marker on cross-view entries so the flip reads as intentional.

`getActiveJointIds` currently returns `Array<{cx, cy}>` and discards the joint name, which
makes joint-legend linking impossible; widening it is a breaking signature change, so
every call site needs checking first.

**Verified as achievable**: every map key resolves against real data — no pose references
a meridian without a `MERIDIAN_PATH_MAP` entry, a muscle without a region, or a joint
without a dot. SC-004 is true today and the round-trip test is what keeps it true.

## 5. FR-015 versus FR-016: the depth legend on a non-muscle tab

**Decision**: The depth legend stays muscle-scoped. Where muscles are absent, the muscles
tab is absent too, and there is no depth encoding to explain.

**Rationale**: FR-016 hides tabs with no data, which changes the default tab away from the
hardcoded `'muscles'`. A pose with meridians but no muscles then opens with no depth
legend, and FR-015's "visible without interaction" looks violated. It isn't — the legend
explains a *muscle* depth encoding specifically. Recorded here so a later reviewer does
not read SC-006 as demanding a legend on the meridian tab.

Three cases follow, not two: zero categories with data renders nothing at all (no diagram,
no legend, no tab group, and the caller must not leave an orphaned heading); one category
renders a labelled heading rather than a degenerate one-tab tab set; two or more renders
tabs as today, minus the empty ones. The zero case is real — exactly two poses hit it,
`rebound-supine` and `seated-stillness`, both stillness nodes. Per-category zero-data
counts, useful for fixtures: meridians 25, chakras 23, joints 16, muscles 2.

## 6. `/poses` is `force-dynamic`, and the comment above the loader is false

**Decision**: Delete `export const dynamic = 'force-dynamic'` from
`src/app/poses/page.tsx:5` and confirm via the `next build` route table that `/poses`
becomes static. Correct the comment at `src/lib/pose-library/index.ts:3` and convert its
`require()` calls to top-level `node:` imports.

**Rationale**: The catalog index re-reads 67 JSON files from disk per request with no
request-scoped input to justify it. This is *less* severe than it first appears —
`public/sw.js:5-11` precaches `/poses` cache-first, so FR-036 holds for the index today
regardless of the directive. So this is a RULE-L6 performance and correctness win, not an
FR-036 rescue, and it should be described as such rather than oversold.

Separately, `src/lib/pose-library/index.ts:3` claims "Build-time static imports — bundled
at compile time, never fetched at runtime (RULE-L3)" directly above a runtime
`fs.readdirSync(process.cwd())`. The comment is false and cites a constitutional rule
while being false, which is the worst kind of stale comment: it would stop a reader from
noticing the problem.

**If the build reveals a reason the directive must stay**, record that reason here rather
than silently leaving it in place.

**Outcome (Phase 3):** it did not. With the directive removed, `next build` moves `/poses`
from `ƒ` to `○` and the 67 `/poses/[slug]` pages stay `●`. Nothing else in the route table
changed.

---

## 7. What "Tier-1 present" means for a nullable field — **correction, found in implementation**

**Decision**: A `null` counts as a gap only where the schema forbids `null`. Nullability is
derived from the schema, never listed by hand.

**Why this needed deciding at all**: the first implementation of `tier1Coverage` treated
"present" as `!== undefined && !== null`, which is the obvious reading, and it reported the
library as **17/67 poses complete (25.4%)**. The library is in fact complete. The culprit is
`prop_free_variation`: it is Tier-1 and in the schema's `required` array, but its schema is
`oneOf: [string, null]`, and 50 of the 67 poses carry `null` — which is an authored answer
("this pose needs no prop-free variation"), not an omission.

So there are two kinds of `null` in the data and only one of them is a gap. The distinction
lives in the schema, so `deriveNullableFields(schema)` reads it from there — the same
argument as `deriveTier1Fields`: a hand-maintained list of nullable fields is a second
authority that will eventually disagree with the first.

Worth recording because a 25.4% figure in CI output is *worse than no figure*. It would have
been read either as a real regression, costing someone an afternoon, or — after the second
time — as noise, which is how a coverage gate stops being read at all.

---

## 8. The new module's coverage threshold — **deviation from the plan**

The plan gave `scripts/lib/tier1-report.mjs` "its own threshold" in `vitest.config.ts`,
below the 100% the constitution mandates for the friction engine and validator-lite. It
turned out not to need one: it is a pure function over parsed JSON with nothing hard to
reach, and it sits at 100% on all four metrics. A separate, lower threshold would have
documented an exemption nobody was using — so all three files share the one threshold
block, and RULE-S3's mandate for the two constitutional files is unchanged.

---

## Note for `004`

`src/app/compose/ComposeFlowItem.tsx:172` already renders `energetic_direction`, as a raw
unglossed Sanskrit token (`brahmana`) in a purple chip. This feature deliberately does not
touch it — every composer render is `004`'s per the spec's Assumptions. Two things for
`004` to pick up: adopt `src/lib/pose-library/energetic-direction.ts` so the gloss is
shared, and note that the purple chip collides with the sanctioned *chakra* hue in
FR-040's palette.
