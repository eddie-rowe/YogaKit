# 003 — Tier-1 geometry review record

**Status**: The record exists; the reviews do not. Every row below is unsigned.

## What this file is, and what it is not

`003`'s FR-009 asks for a human verification that the Tier-1 geometry on each pose is
correct — not schema-valid, which CI already proves, but *right*: that `base_of_support`
names what actually carries the weight, that `spinal_action` matches what the spine does,
that `cog_height` is honest. No script can do that. It is `001`'s T027, marked there as
"External step (not performable by this agent)", and it is Gioconda & Tavo's to perform.

What code can build is the **record** — a place where a review is written down, made
attributable by commit authorship, and noticed when it goes stale. That is this file.

It is deliberately not a gate. `npm run validate:poses` **warns** on a stale row and never
fails on one. A missing or unsigned review is a known gap in the library's provenance, not
a broken build, and turning it into a red CI run would only teach everyone to ignore red.

## How staleness is detected

Each row carries a **geometry fingerprint**: a short hash over the eight Tier-1 fields that
describe the shape rather than the teaching — `base_of_support`, `bilateral`,
`body_position`, `cog_height`, `orientation`, `plane`, `spinal_action`, `zone`
(`GEOMETRY_FIELDS` in `scripts/lib/tier1-report.mjs`).

Those eight are the fields the friction engine reads, which is why they are the ones under
review. Rewording `breathing_cues` does not invalidate a geometry sign-off; changing
`spinal_action` silently does. The fingerprint is computed over the fields in a fixed
order, so reformatting a pose file does not read as a change.

When a pose's current fingerprint no longer matches the one recorded here, the validator
prints:

```
⚠️  Tier-1 review stale: butterfly — geometry changed since review on 2026-09-01
```

The fix is a re-review, then a new fingerprint in the row. Not a fingerprint update on its
own — that is how a provenance record becomes a rubber stamp.

## Filling in a row

1. Read the pose file's eight geometry fields against the shape as you would teach it.
2. Put your name in **Reviewer** and the date in **Date** (ISO, `YYYY-MM-DD`).
3. **Verdict**: `correct`, or `corrected` if you changed the data in the same commit.
4. **Corrections**: what you changed and why, or `—`.
5. If you corrected the data, recompute the fingerprint:
   `node -e "…"` is awkward for this, so use
   `npm run validate:poses` — the warning line prints the current fingerprint.

## The ten-pose review set

Ten, not sixty-seven, on purpose: this set spans the modes and the geometry range
(supine/prone/seated/standing/kneeling, yin and yang, low and high centre of gravity), so
it is a proof that the field dictionary holds up in practice rather than an audit of the
whole library. The remaining 57 are backfilled as they are touched.

| Pose | Reviewer | Date | Verdict | Geometry | Corrections |
|---|---|---|---|---|---|
| `butterfly` | — | — | unreviewed | `85fbe2797d83` | — |
| `savasana` | — | — | unreviewed | `4dae9c3223a4` | — |
| `child-pose` | — | — | unreviewed | `0844df885f74` | — |
| `sphinx` | — | — | unreviewed | `780bf370c902` | — |
| `dragon-low-lunge` | — | — | unreviewed | `89d8fee09d56` | — |
| `camel` | — | — | unreviewed | `da842048f3e7` | — |
| `shoelace` | — | — | unreviewed | `ec6bb98e5a74` | — |
| `saddle` | — | — | unreviewed | `7b32673f2b70` | — |
| `caterpillar` | — | — | unreviewed | `3d9de346db98` | — |
| `half-butterfly` | — | — | unreviewed | `21a377c3a114` | — |

The fingerprints above were computed from the data as it stands on this commit, so the
staleness warning is armed from now on even though no row is signed: if a geometry field
changes before the review happens, the record says so rather than quietly presenting
pre-review data as reviewed.

## Related

- `001`'s T027 — the blocked review task this record serves
- `specs/003-pose-library/tasks.md` T015/T016 — the tasks that built it
- `docs/krama-atlas.md` — the field dictionary and the Tier-1/Tier-2 rule
