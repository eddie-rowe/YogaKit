# Contract: Score Explanation Copy — **[OWNER SIGN-OFF REQUIRED]**

**Status**: Drafted, awaiting sign-off. Nothing is implemented against this yet.
**Consumed by**: US4 (FR-022, FR-023, SC-009), deferred to its own PR.

---

## The premise the spec got wrong

The spec's Derived Score entity says these numbers are "computed from pose geometry", and
FR-023 asks the explanation to "describe contributing geometry factors". That is not what
they are.

`complexity` and `injury_risk` are **hand-authored integers in the pose JSON**. They are in
`data/schemas/pose.schema.json` as `integer 1..10`. The friction engine never reads either
field — grep `src/lib/friction/` and neither name appears. Nothing computes them, so there
are no "contributing factors" to describe and no weighting constants to leak.

Observed distribution across all 67 poses (both fields present on 67/67):

| Value | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| `complexity` | 8 | 8 | 17 | 13 | 12 | 5 | 3 | 1 | 0 | 0 |
| `injury_risk` | 8 | 9 | 18 | 13 | 10 | 6 | 2 | 1 | 0 | 0 |

Neither field is rendered anywhere in the UI today — they surface only as sort options and
two max sliders in `PosesClient.tsx`. So FR-022 is vacuously satisfied and SC-009's
denominator is currently zero. **The US4 work creates the obligation it then satisfies**,
and it must not describe a computation that does not happen.

Writing "this score is calculated from the pose's geometry" would satisfy FR-023's letter
while violating Principle II's "never a black box" — it would invent a mechanism, which is
worse than showing a bare number. The copy below explains an **editorial judgement**
instead, which is what the number honestly is.

Recorded as a correction in `research.md`. Signing this off is also a ruling that FR-023's
"geometry factors" wording is descriptive of intent rather than binding.

---

## Drafted copy

Rendered in place — a popover or disclosure from the number, not a separate page.

### `complexity`

> **Complexity {n}/10**
>
> How much setup and body awareness the shape asks for — finding the edge, arranging props,
> knowing when you have arrived. Set by a contributor reading the pose against the rest of
> the library, not calculated.
>
> Lineage: {pose.source}

### `injury_risk`

> **Injury risk {n}/10**
>
> How much the shape itself can ask of a joint or a passive structure, before accounting
> for who is practising it. A low number is not a promise, and a high one is not a warning
> against the pose — read it alongside the contraindications above.
>
> Lineage: {pose.source}

### Shared footer, both fields

> These are editorial judgements on a 1–10 scale, comparable within this library and not
> against anything outside it. They are not derived from the sequencing engine.

`{pose.source}` is a lineage string, not per-field attribution — the three distinct values
today are *Traditional yin yoga; see Paul Grilley, Bernie Clark, Sarah Powers*,
*Traditional hatha/vinyasa yoga*, and *Traditional vinyasa yoga*. It names where the pose
comes from, not who set the number; the copy above is worded to claim only the former.
Attribution for the number itself is commit authorship plus `docs/design/003-tier1-review.md`.

---

## Rules the copy is written to

1. **No invented mechanism.** No "calculated", "derived", "computed", "the engine".
2. **No weighting constants** (FR-023). There are none to expose, and none may be invented
   to look rigorous.
3. **No instruction.** Neither number tells the reader whether to attempt the pose. That is
   what `contraindications` and `level` are for, and they are already rendered.
4. **No safety claim.** "Injury risk 2/10" must not read as "this is safe for you" — hence
   "a low number is not a promise".
5. **Library-relative, and says so.** A 6 here means nothing about a 6 anywhere else.
6. **No second-person judgement.** Describes the shape, never the reader's capability.

---

## What sign-off unblocks

- A `ScoreExplanation` disclosure in `src/app/poses/`, reachable from wherever the number
  is rendered, with the copy above as one exported constant per field.
- Rendering both fields for the first time: `complexity` unconditionally (Tier-1),
  `injury_risk` behind a `!= null` guard (Tier-2 — see `plan.md` decision 1). Today's 67/67
  coverage on `injury_risk` must not become load-bearing.
- A test asserting SC-009 mechanically: every rendered score node has an adjacent
  explanation trigger, so the ratio cannot silently drop below 100%.
- A copy test rejecting the rule-1 vocabulary above in the explanation strings — the same
  cheap source-scan shape as the motion-budget test, and the thing that keeps this contract
  true after the PR that introduced it.
