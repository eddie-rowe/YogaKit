# Contract: Theme Taxonomy — **SIGNED OFF 2026-10-17**

**Status**: Signed off 2026-10-17 by the owner. Approved **with two reversals** —
the closed set is **14 themes, not 13**. See "Sign-off rulings" immediately below;
where this document's original proposal and the rulings disagree, the rulings win.
**Consumed by**: US5 (FR-027, FR-029, SC-010), tracked on `#83`.

## Sign-off rulings

The five calls this document flagged, ruled. Both low-confidence merges were
reversed; the three the author held with medium or high confidence stand.

| # | Call | Author's confidence | Ruling |
|---|---|---|---|
| 1 | `sadness` → `grief` | low | **REVERSED.** `sadness` becomes its own theme. Grief and sadness are not the same feeling, and this is a browsable lens: someone looking for "sadness" should not be told they are grieving. The stated supporting argument is also factually wrong — see below. |
| 2 | `letting-go` kept separate from `grief` | low | **Separation upheld, and the bridge pose moves.** `grief and letting go` goes to `letting-go`, not `grief` — the author called placing it under grief "arguably the wrong half", and it is. The pose's work is the release. |
| 3 | `anger` kept separate from `frustration` | high | **Upheld.** TCM splits them cleanly (liver vs gallbladder) and so does the practice. |
| 4 | `safety` → `groundedness` | medium | **Upheld.** `grounding and security` literally bridges the two; keeping both would orphan that pose. |
| 5 | `conflict` → `control` | low | **Upheld.** Single occurrence, same organ. Revisit if a second appears. |

Also upheld: **`chronic vigilance` and `stored pelvic emotion` do not become
themes.** One names a clinical nervous-system state, the other a body location.
A browsable theme called "Chronic vigilance" would diagnose the reader on a
catalog page.

### Correction: the two `sadness` poses are not the same shape

Ruling 1's original argument was that the merge is "defensible (lung/liver
overlap, and the two poses reading 'sadness' are both gentle forward folds)".
The second half is wrong, checked against the data:

| Pose | Shape | `energetic_direction` | TCM organ for `sadness` |
|---|---|---|---|
| `supported-fish` | anterior chest and intercostal opening over a prop | `brahmana` | lung |
| `butterfly` | forward drape into the inner groin and hip crease | `langhana` | liver |

They are opposite shapes on opposite meridians — one expands the front body, the
other folds it. So the merge rested partly on a premise that does not hold, which
independently supports the reversal rather than merely permitting it.

What the two actually share is being deep-tissue, long-held and supported. The
subhead below describes that, not a fold.

### Resulting counts after the reversals

| Slug | n | Change from the table below |
|---|---|---|
| `sadness` | 2 | **new** — unmerged from `grief` |
| `grief` | 14 | loses `sadness` (2) and `grief and letting go` (1) |
| `letting-go` | 4 | gains `grief and letting go` (1) |

**Still 101 occurrences across 14 themes. Nothing dropped.** Every other row in
the proposal table stands unchanged.

### Subhead for the new theme

| Slug | Subhead |
|---|---|
| `sadness` | Deep-tissue holds at the chest and inner groin, along the lung and liver lines. |

Written to the same rule as the other thirteen: anatomy and intent, never the
reader's inner state.

---

## Why this document exists

FR-029 says the theme taxonomy "MUST remain the existing curated, closed set and MUST NOT
become an open or ad hoc tag set." There is no closed set. `emotion` is schema-typed as
free text, and the 67 pose files hold **38 distinct values across 101 occurrences**,
including three spellings of grief, three of frustration, and one snake-cased
`tension_and_control`. The theme browser groups on the raw string, so it renders ~38
near-duplicate sections today.

So FR-029 has to be read as *establishing* the closed set. This document proposes it. The
collapse is a judgement about the practice, not about the code — whether
`grief and letting go` belongs under grief or under letting go is exactly the kind of call
that needs you rather than me, which is why every non-obvious merge below is flagged.

Once signed off, the US5 PR is mechanical: write `data/schemas/theme-taxonomy.json`, add
the `enum`, patch the affected pose files, and render the subheads.

---

## Proposal: 38 → 13

TCM organ associations are shown because they were a useful cross-check — where two labels
share an organ they usually belong together, and where they don't, the merge deserves an
argument. They were not treated as decisive, since several emotions legitimately span
organs.

| # | Slug | Label | n | Primary organ(s) | Absorbs |
|---|---|---|---|---|---|
| 1 | `grief` | Grief | 17 | lung, kidney, stomach | `grief and unprocessed loss` (2), `sadness` (2), `grief and letting go` (1), `exhaustion-grief` (1) |
| 2 | `fear` | Fear | 16 | kidney | `fear and survival anxiety` (1), `anxiety` (1), `chronic vigilance` (1) |
| 3 | `frustration` | Frustration | 11 | gallbladder | `frustration and anger` (1), `frustration and burden` (1) |
| 4 | `vulnerability` | Vulnerability | 10 | kidney, heart, liver | `shame` (1), `stored pelvic emotion` (1) |
| 5 | `control` | Control | 9 | liver, gallbladder | `control and release` (1), `tension_and_control` (1), `tension` (1), `rigidity` (1), `conflict` (1) |
| 6 | `courage` | Courage | 8 | heart, kidney | `confidence` (1) |
| 7 | `surrender` | Surrender | 7 | stomach, kidney, lung | — |
| 8 | `groundedness` | Groundedness | 6 | stomach, kidney, spleen | `safety` (3), `grounding and security` (1) |
| 9 | `anger` | Anger | 4 | liver | `suppressed anger` (1) |
| 10 | `openness` | Openness | 4 | heart, lung | `joy` (1), `love and compassion` (1) |
| 11 | `letting-go` | Letting go | 3 | bladder, liver, gallbladder | `release of holding` (1) |
| 12 | `trust` | Trust | 3 | kidney, heart | — |
| 13 | `integration` | Integration | 3 | liver, stomach | `processing and integration` (1), `adaptability` (1) |

**101 occurrences, all accounted for.** No value is dropped.

### The five calls I'd want you to rule on

1. **`sadness` → `grief`.** Defensible (lung/liver overlap, and the two poses reading
   "sadness" are both gentle forward folds), but they are not the same feeling and a case
   exists for a 14th theme. *Merged, with low confidence.*
2. **`letting-go` kept separate from `grief`.** Grief is the feeling; letting go is the
   movement. `grief and letting go` (1) bridges them and I put it under grief, which is
   arguably the wrong half. *Kept separate, with low confidence.*
3. **`anger` kept separate from `frustration`.** TCM distinguishes them cleanly — anger is
   liver (3/4), frustration is gallbladder (7/11) — and the practice does too. *Kept
   separate, with high confidence.*
4. **`safety` → `groundedness`.** `grounding and security` literally bridges the two, so
   keeping both would leave that pose homeless. But safety is kidney and groundedness is
   stomach/spleen, which argues the other way. *Merged, with medium confidence.*
5. **`conflict` → `control`.** Both gallbladder. Gallbladder governs decision, so
   "conflict" here likely means indecision rather than interpersonal conflict — but that is
   an inference from one pose. *Merged, with low confidence.*

Two labels I would flag regardless of where they land. **`chronic vigilance`** reads as a
clinical description of a nervous-system state rather than an emotion, and **`stored
pelvic emotion`** names a body location rather than a feeling. Both are single
occurrences; both are folded into neighbours above rather than becoming themes, which I
think is right — a browsable theme called "Chronic vigilance" would diagnose the reader
on a catalog page.

---

## Drafted subheads

One per theme, rendered under the `<h2>` in the theme view. Written to describe what this
family of poses does in the body — not what the reader feels, and not what they should do
about it. No second-person imperative, no clinical claim, no urgency.

| Slug | Subhead |
|---|---|
| `grief` | Poses that open the chest and ribs, where held breath tends to gather. |
| `fear` | Poses working the low back, kidneys, and inner legs — the body's deepest reserves. |
| `frustration` | Side-body and outer-hip work, along the channels associated with stalled momentum. |
| `vulnerability` | Front-body opening. Exposing the soft surfaces is the whole of the shape. |
| `control` | Poses that ask the grip to soften rather than the range to increase. |
| `courage` | Heart-opening shapes that widen the chest without bracing it. |
| `surrender` | Supported, long-held shapes where the work is in stopping. |
| `groundedness` | Weight low and wide, with the belly and legs taking the load. |
| `anger` | Liver-channel work through the inner thigh and side waist. |
| `openness` | Shapes that widen across the collarbones and the front of the shoulders. |
| `letting-go` | Passive spinal work along the back line, where holding is habitual. |
| `trust` | Shapes that need support to enter, and settle once it is there. |
| `integration` | Neutral, quieting shapes for the space after stronger work. |

**On tone.** These describe anatomy and intent, not the reader's inner state. "Poses that
open the chest and ribs, where held breath tends to gather" says where the work is;
"Release your grief here" would tell someone what they are carrying. The theme labels are
already emotionally named — the subheads' job is to ground them in the body, which is also
what keeps the browser a *lens* rather than an assessment (FR-030).

---

## What sign-off unblocks

- `data/schemas/theme-taxonomy.json` — 13 entries with `slug`, `label`, `subhead`,
  `tcm_organs[]`.
- An `enum` on `emotional_release_potential[].emotion` in `data/schemas/pose.schema.json`.
  The field stays in `x-tier2-properties`, so the Tier-1 gate is unchanged.
- A data patch across the pose files carrying non-canonical values, in one attributable
  commit.
- Deleting `slugifyEmotion` (`PosesClient.tsx:57-59`) and grouping on taxonomy slugs, so
  `poses-theme-section-{slug}` becomes stable.
- A validator cross-check: every emotion in the data resolves to a taxonomy entry, and
  every taxonomy entry has a non-empty subhead. That mechanises SC-010 rather than
  asserting it.
