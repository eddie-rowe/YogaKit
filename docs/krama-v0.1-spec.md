# YogaKit v0.1 — Locked MVP Specification
*Spec-lock target: Aug 31, 2026 · Working build: Sept 30 · Teacher feedback: Oct 31*
*Companions: `krama-atlas.md`, `krama-guardrails.md`, pose/transition schemas.*

> **Historical, as of 2026-08-26.** This document describes the local-first, no-auth,
> no-database v0.1 product. Following stakeholder feedback (`docs/mvp-spec-suggestions.md`),
> the constitution was amended to v3.0.0 and the product was expanded into a multi-tenant,
> authenticated, billed platform (spec-kit features `002-auth-tenancy-billing` through
> `006-profile-settings`). This spec is retained as the historical record of the original
> local-first scope and the "6am test" it introduced — which remains a north star for the
> v1.0 read view — but it no longer describes the shipping product's full scope. See
> `.specify/memory/constitution.md` (v3.0.0) and
> `/Users/eddie.rowe/.claude/plans/i-met-with-giaconda-declarative-dewdrop.md` for the
> current plan.

---

## 1 · Product statement

A mobile-first, laptop-friendly PWA where a yoga teacher can intuitively build, review, save, and read a class sequence from a pose library. Local-first (browser storage + export/import), no auth, no external DB. Beauty is a functional requirement, not a polish pass: the app should feel like it was made by someone who practices.

**The 6am test (v0.1 north star):** Eddie builds a sequence the night before, opens the read view on his phone at 6am, and practices through it without touching the screen more than once.

---

## 2 · Scope

### In (v0.1)
1. **Pose library** — ~33 poses + 3–4 stillness nodes, full Atlas schema with Tier-1 fields populated (§4).
2. **Compose** — add poses via search, set breaths *or* seconds, per-item notes, drag + button reorder, phase grouping with the six-phase default template (§5), layer chips (simple / advanced / expert / custom), live total duration.
3. **Flows** — save, duplicate, edit, delete. Persist to localStorage/IndexedDB. Export/import a single `.krama.json` file (schema-versioned) as the portability story.
4. **Built-in flows** — 10-min personal asana · 60-min vinyasa (heart openers) · 60-min yin. Shipped as read-only templates; "duplicate to edit."
5. **Read view** — the 6am artifact: clean, large-type, phase-grouped, breath-notated, print stylesheet, works offline.
6. **Friction crawl** — deterministic friction computed between adjacent poses from Tier-1 geometry; rendered as 3-tier seam indicator with template reasoning line (§6).
7. **Validator lite** — laterality warning + no-closing-stillness warning only. Warnings never block.
8. **PWA baseline** — installable, offline after first load.

### Out (v0.1) — recorded so they stay out
Suggest button (v0.2) · player/timer/audio (v0.2+) · roster & contraindication engine · arc sparkline · disturbance score · lenses UI · provenance UI · Teach & Learn tabs beyond stubs · accounts, sync, sharing links · any AI at runtime.

---

## 3 · Navigation (from notebook, adopted)

Five-tab vocabulary, three real in v0.1:

| Tab | v0.1 state |
|---|---|
| **Home** | Minimal: today's flow (last opened) + "new flow" + the three built-ins. |
| **Compose** | Full (§2.2). |
| **Flows** | Full: saved + built-in list, duplicate/export/import. |
| **Poses** | Library: search, category filter, detail view by Atlas family (empty families hidden). |
| **Learn** | Stub tab, present but marked "soon" — it holds the nav shape without building the feature. |

---

## 4 · Schema strategy: full Atlas, tiered entry

Ship the complete Atlas-aligned pose schema. Tag fields by entry tier; UI hides empty fields everywhere.

### Tier 1 — `x-mvp: true` (entered for all 33 before Sept 30; ~2–3 min/pose)
- `id`, `name_english`, `name_sanskrit`, `aliases`
- `category` / `groupings` (one primary family)
- `yoga_style` fit (vinyasa / hatha / yin / restorative flags)
- `cues` (3–5 lines) + `breathing_cues` (1 line, in/out pattern where it matters)
- `default_measure`: `{breaths: n}` or `{seconds: n}` per style
- `laterality`
- `intensity` (1–5), `complexity` (1–5)
- **Geometry-lite** (feeds friction): `base_of_support` (contact list), `orientation`, `cog_height`, `spinal_action`
- **Kinespherics** (from notebook — new Shape-family fields): `plane` (sagittal / coronal / transverse / multi), `level` (high / middle / low), `zone` (near / mid-reach / far)
- `energetic_direction` (brahmana / langhana / samana)
- `contraindications` (flat strings ok in v0.1; severity structure in v0.2)

### Tier 2 — full Atlas fields, present in schema, backfilled opportunistically
`joint_config`, tissue/load family, time family (`temporal_texture`, `rebound_requirement`, `exit_cost`), lenses (meridian/chakra/dosha), inner experience, story/identity, provenance, media. **Rule:** never block a release on Tier-2 completeness.

### Stillness nodes (in the corpus, required by the yin built-in)
`rebound-supine`, `constructive-rest`, `seated-stillness`, `savasana` — near-empty geometry, real durations, distinct visual treatment.

### Corpus roster (~33 + stillness; covers all three built-ins)
Mountain · Standing forward fold · Halfway lift · Chair · Tree · High lunge · Low lunge · Warrior I · Warrior II · Reverse warrior · Extended side angle · Triangle · Half moon · Down dog · Plank · Low push-up (chaturanga) · Cobra · Up dog · Locust · Child's pose · Cat–cow · Thread the needle · Bridge · Camel · Pigeon (sleeping swan) · Seated forward fold (caterpillar) · Butterfly · Dragon · Sphinx · Seal · Saddle · Supine twist · Happy baby · Legs up the wall · Easy seat — plus the four stillness nodes. Sun Salutation A ships as a built-in *block* (ordered sub-sequence), not a pose.

---

## 5 · Phase template (from notebook, adopted)

Default six phases; all optional, reorderable, renamable:
**Connect** (samana · arrive) → **Warm-up** (langhana · settle) → **Build** (brahmana · heat) → **Peak** (brahmana · apex) → **Land** (langhana · integrate) → **Transition** (samana · depart).
Each phase shows name · intent tag · summed duration. Phase collapse (fold to a bar) is v0.1 if cheap, v0.2 if not.

---

## 6 · Engine: crawl → walk → run

**Crawl (v0.1).** `friction(fromPose, toPose) → {score, tier, reasons[]}` — pure function over Tier-1 geometry:
- contact term: base_of_support conserved / added / removed / swapped
- orientation term: none / level-change (uses kinespheric `level` delta) / flip
- cog term: cog_height delta magnitude
- spine term: spinal_action continuation / reversal / neutral
- plane term (small weight): same-plane vs plane-shift
v1 weights: 0.35 contact · 0.25 orientation · 0.2 cog · 0.1 spine · 0.1 plane. Weights live in one exported constant — tuning is data, not code. `reasons[]` are template strings from the deltas ("hands and feet stay planted", "flips from prone to supine"). Precompute the full pair matrix at build time; render as seam indicator in Compose and nothing else.

**Walk (v0.2, post-teacher-feedback).** The Suggest button: rank library by ascending friction from the current pose, filtered by active phase intent (energetic_direction match) and style; top 5 with reasons. Same function, reversed.

**Run (v2).** Disturbance score (needs Tier-2 time fields) · arc-level checks · roster-aware filtering · lens continuity. Never in v0.x.

**Hard line at every stage:** engine proposes structure with derived reasoning; it never authors cues, movement names, or teacher voice.

---

## 7 · Layers

`simple` — name, measure, notes, seam indicator. `advanced` — + geometry-lite, kinespherics, intensity/complexity, energetic tags. `expert` — + all populated Tier-2 fields, friction numerics. `custom` — user picks visible field groups (checkbox sheet); persisted per-view. Safety chips and warnings render at **every** layer (floor, not ceiling).

---

## 8 · Tech & repo

Next.js (app router) on Vercel · TypeScript · poses as JSON validated against the schema in CI (ajv) · localStorage/IndexedDB via a thin storage module (swap-ready for a real DB later) · private GitHub repo · Datadog RUM basic (page views, errors, web vitals — no user content in telemetry) · Playwright smoke tests keyed to `data-testid` contract from `krama-guardrails.md` §1.3.

**Repo files from day one:** `FRICTION.md` (the running friction log — dated one-liners, no editing old entries; this file is the v2 spec) · `DECISIONS.md` (why-we-chose log) · `/data/poses/*.json` · `/data/flows/*.krama.json`.

---

## 9 · Milestones

| Date | Gate |
|---|---|
| **Aug 31** | This spec locked · schema files final (Tier tags in place) · repo scaffolded, CI validating pose JSON · 5 poses entered as schema proof. |
| **Sept 30** | v0.1 deployed · all 33+4 entered · 3 built-ins ship · read view passes the 6am test · **used for own practice 5×** · friction log has entries. |
| **Oct 31** | 3 teachers complete a guided journey (script provided: build a 30-min class from scratch → duplicate & modify a built-in → read view walkthrough) · written feedback from each · v0.2 scope drafted from FRICTION.md + feedback. |

**Accountability cadence:** brief ship-note to Brenda, Gia, Tavo at each gate (and mid-Sept). Gioconda & Tavo review the Tier-1 data for 10 poses before mass entry — validate the vocabulary before 33× the typing.

---

## 10 · Beauty tenets (functional requirements)

1. Typography-first; the pose names are the interface.
2. Generous whitespace; one accent color; stillness nodes visually quieter, not louder.
3. Breath notation as marks (↑ ↓ ~), never paragraphs.
4. Dark mode from day one (6am is dark).
5. Motion minimal and meaningful — a reorder should feel like a breath, nothing should bounce.
6. Every screen answers: *would a teacher leave this open on her mat?*

---

*yogakit · v0.1 spec · locked when Eddie says so*
