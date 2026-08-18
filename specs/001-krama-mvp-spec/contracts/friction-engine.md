# Contract: Friction Engine

**Module**: `src/lib/friction/index.ts`
**Type**: Pure TypeScript function, no I/O, no async
**Consumed by**: `src/app/compose/` (seam indicator), a build-time script that
precomputes the full pairwise matrix
**Governs**: constitution RULE-H4 (weights live in one exported constant), RULE-E3
(reasons derived only from measured deltas)

---

## Signature

```typescript
function friction(fromPose: Pose, toPose: Pose): FrictionResult;

interface FrictionResult {
  score: number;      // 0–1
  tier: 1 | 2 | 3;     // 1 = low friction (smooth seam), 3 = high friction
  reasons: string[];   // one per term with a non-zero delta, plain language
}
```

`friction` is directional (`fromPose → toPose` may differ from `toPose → fromPose`) only
in its reasoning text, not its score — the score is symmetric because every term below
is a delta between two states, not a directional transform.

## Weights

Exactly one exported constant. Tuning the engine is a data change, never a code change.

```typescript
export const WEIGHTS = {
  contact: 0.35,
  orientation: 0.25,
  cog: 0.20,
  spine: 0.10,
  plane: 0.10,
} as const;
```

`score = Σ (WEIGHTS[term] × delta(term))` across the five terms below, each delta
normalized to `[0, 1]`.

## Terms

| Term | Weight | Source fields | Delta definition |
|---|---|---|---|
| contact | 0.35 | `base_of_support[]` (both poses) | `1 - (|intersection| / |union|)` — Jaccard distance between the two contact-point sets. 0 = identical contact points, 1 = fully disjoint. |
| orientation | 0.25 | `orientation`, `level` (both poses) | 0 if `orientation` unchanged; 0.5 if `level` changes but `orientation` doesn't; 1 if `orientation` changes. |
| cog | 0.20 | `cog_height` (both poses) | Distance between `cog_height` positions on the ordered scale `floor < low < mid < high`, normalized to `[0, 1]` (max distance = 1, i.e. floor↔high). |
| spine | 0.10 | `spinal_action` (both poses) | 0 if unchanged; 1 if changed. (`neutral` counts as a distinct value like any other — no partial credit.) |
| plane | 0.10 | `plane` (both poses) | 0 if unchanged; 0.5 if either pose is `multi`; 1 if both are single planes and they differ. |

Missing Tier-1 fields on either pose contribute `0` to their term (best-effort scoring,
per spec Edge Cases) rather than throwing or excluding the pair from the matrix.

## Tiers

```typescript
function tierFor(score: number): 1 | 2 | 3 {
  if (score < 0.34) return 1;
  if (score < 0.67) return 2;
  return 3;
}
```

Thresholds are provisional for v0.1 and expected to move once `FRICTION.md` accumulates
real observations (see `docs/krama-v0.1-spec.md` §8) — they are not a separate exported
constant yet because there's no usage data to tune them against. When they are tuned,
they join `WEIGHTS` as an export, not a hardcoded literal.

## Reason templates

One template string per term, filled with the specific delta observed. Only terms with
a non-zero delta produce a reason — a pair with identical contact points produces no
contact reason at all.

| Term | Template |
|---|---|
| contact | `"{fromPose} and {toPose} share no contact points"` / `"hands and feet stay planted"` (when intersection is non-empty, name the shared points) |
| orientation | `"flips from {fromPose.orientation} to {toPose.orientation}"` |
| cog | `"center of gravity moves from {fromPose.cog_height} to {toPose.cog_height}"` |
| spine | `"spine shifts from {fromPose.spinal_action} to {toPose.spinal_action}"` |
| plane | `"changes plane from {fromPose.plane} to {toPose.plane}"` |

Reason strings are generated, not authored per-pair — this satisfies RULE-T3/E3 for the
seam indicator without any per-pose "why" data entry.

## Precomputation

```typescript
function buildFrictionMatrix(poses: Pose[]): FrictionMatrix;
// Record<fromSlug, Record<toSlug, FrictionResult>>
```

Runs at build time (invoked from the same build step that validates the pose library),
producing a static JSON artifact consumed by Compose. Compose never calls `friction()`
directly at runtime for the shipped pose library — only the precomputed matrix. Direct
calls remain valid for tests and for scoring any pose added outside the static library
(none exist in v0.1, but the function stays runtime-safe for that reason).

## Test requirements

100% line coverage, mandatory (constitution RULE-S3, carried over from the rules-engine
requirement). Required cases: identical poses (score 0, no reasons), maximally disjoint
poses (score 1, all five reasons), a pose missing one or more Tier-1 geometry fields
(best-effort score, fewer reasons, no throw), and one worked example per tier boundary.
