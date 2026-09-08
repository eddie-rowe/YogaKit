# Phase 0 Research: Sequencing Composer

Eight unknowns, all resolved. Three exist because the spec asserts something about the
codebase that turned out not to be true; those are marked **correction** and the evidence is
cited so the next reader can re-check rather than re-litigate.

The twelve open decisions in `design-input.md` were all ratified at their recommended
defaults in the spec's Assumptions section and need no further work here — except #10, which
US1 inherits, and the breath-glyph quick win, which §1 below overturns.

---

## 1. FR-001's breath glyphs — **correction**

**Decision**: FR-001 and SC-001 are satisfied by rendering the *duration* the teacher
authored in compressed, scannable notation, not by rendering ↑ ↓ ~. The inhale/exhale
vocabulary is deferred to its own story and, when it arrives, it goes on the **seam**, not on
the flow item. `docs/krama-guardrails.md:65` is amended in the US1 PR to describe what
`read-breath-mark` actually carries.

**Rationale**, in three parts.

*The field does not exist, and could not.* `src/lib/flow/types.ts` gives `FlowItem` an `id`,
`poseSlug`, `mode`, `measure`, optional `note`, `phaseId`, and `order`. There is no breath
cue. `breathMark()` at `src/app/read/[id]/ReadView.tsx:17` returns `"{n} breath(s)"`,
`"~{x} min"`, `"~{n}s"`, or `''` — it renders `measure`, which is the only thing there is to
render. Poses carry `breathing_cues` (entering / holding / exiting) in `data/poses/`, but
that is prose at the *pose* level, not a per-placement mark, and rendering it in the read
view would be paragraphs — the exact thing tenet 3 forbids.

*↑ ↓ ~ describe a transition, not a hold.* The glyphs mean inhale, exhale, free breath. That
is a sentence about movement between two shapes — "inhale to upward dog, exhale to down dog"
— and it is why vinyasa notation carries it. A yin hold is timed; there is no inhale to mark,
and marking one would be false. So the missing field is not an oversight in the data model:
a breath-linked cue is a property of the boundary between two items. The composer already
mandates a stable node for exactly that boundary — FR-042 requires a seam element for every
adjacent pose pair, including at the friction floor, and SC-014 fixes the count at
`items − 1`. If authored breath cues ever ship, that node is where they belong, and the
entity already exists to carry them.

*The research that prescribed glyphs also contains the evidence against them.*
`docs/design-research/09-mat-side-read-view.md:46` calls the text rendering a gap and
proposes glyphs because they "would read faster at arm's length." Line 53 of the same
document, writing up the 6am test, names what would actually fail it: *"pose-name type
(`text-2xl`/`text-xl` for stillness, line 141) or muted breath-mark text (`text-lg`,
`var(--muted)`, line 144) rendering too low-contrast or too small in a genuinely dark room."*
That is a contrast-and-size finding, not a text-versus-glyph one. And a glyph the reader has
to learn is strictly worse at low brightness than a word they can read: the number is the
actionable datum, and the failure mode of an unfamiliar symbol is a pause, which is the thing
the whole story exists to prevent.

US1 therefore keeps the count dominant, compresses the unit, and fixes the contrast and size
that line 53 actually indicts. No schema change, no new authoring surface, no migration.

**Alternatives considered**: Adding `FlowItem.breathCue: 'inhale' | 'exhale' | 'free'`. Honest
to the spec's literal words, but it invents an authoring surface in the composer, a migration,
an export-format bump, and a default for every existing item — realistically its own story,
and it would put the field on the wrong entity. Rejected here, deferred as seam work.
Marking FR-001 `[NEEDS CLARIFICATION]` and shipping US1 without it: rejected because the
legibility problem line 53 names is real and US1 is the story that owns it.

## 2. The mechanism for SC-009 is a table split, not a view plus column grants — **correction**

**Decision**: `FlowItem.note` does not become a `note` column on `flow_items`. It becomes a
row in `flow_item_notes`, a separate table with no org, cohort, role, or visibility column.

**Rationale**: An earlier draft of this feature's approach proposed "a view without a `note`
column plus column grants." `docs/design/002-schema.md` §B rejects that reasoning in terms
that apply here verbatim:

> **Why not column-level grants**: RLS is row-level only; Postgres column grants are
> role-level, so "teacher may read two columns of these rows" is inexpressible without also
> blocking the owner from their own columns. The table split makes widening the boundary
> require a schema migration a reviewer will see.

Both halves matter. The first is a correctness argument — the grant that hides the note from
a colleague hides it from its author too, because both are `authenticated`. The second is the
argument SC-009 is actually making: a reviewer must be able to confirm the exclusion "by
reading the schema and query alone." A share query that joins `flows → phases → flow_items`
and stops there cannot return a note, because there is nothing in those three tables to
return. That is a property of the query's shape, not of a condition someone remembered to
write.

`003` reached the same place independently for `pose_notes`
(`contracts/pose-personalization.md`, "Three deliberate absences"). Reuse the reasoning
rather than re-deriving it.

**Alternatives considered**: a `note` column plus a `security_barrier` view. Rejected — the
view is application-shaped policy under another name, and the column still exists for the
next caller to select.

## 3. FR-020 and scenario 10 are already built, and deliberately do less — **correction**

**Decision**: C2 inherits `clearSyncedFlows()` unchanged and extends the same rule to the new
outbox store. It does not rewrite sign-out, and FR-020's literal wording is not implemented.

**Rationale**: `src/lib/storage/flow-store.ts` exports `clearSyncedFlows()`, and
`src/components/layout/AccountMenu.tsx:93` already calls it on sign-out. FR-020 says signing
out "MUST clear the flow cache and the outbox from local storage." Taken literally that is
what `clearAllFlows()` does, and it is what shipped first — and it was wrong. The function's
own comment records why:

> Only `synced` records came from the server, so only those can leak to the next person on a
> shared device. `pending` and `failed` were authored here and have no other copy anywhere —
> deleting them destroys the only one.

An unconditional wipe satisfies UX-011's shared-device half by violating RULE-L4 and
`docs/design-research/16-auth-onboarding-claim.md`, which is explicit: *"signing out must
never clear or hide the IndexedDB-cached flows that were working offline before any account
existed."* FR-021 ("signing out with a non-empty outbox MUST NOT silently destroy unsynced
work") is the spec contradicting FR-020 within two lines, and FR-021 is the one that agrees
with the constitution. `design-input.md` UX-011 was amended for the same reason; the
reconciliation is in `DECISIONS.md`.

The extension C2 owes: outbox entries targeting `synced` flows are dropped on sign-out
alongside their flows; entries for locally-authored flows survive, because their flow does.

## 4. `claimed_flows` — keep it, as a write-once audit trail

**Decision**: Keep the table. Do not retire it. The claim path writes normalized `flows` rows
in addition to the payload snapshot; a one-time backfill materializes rows for existing
`claimed_flows`; the raw `payload` column is never read again after that.

**Rationale**: `supabase/migrations/20260826224207_claimed_flows.sql` hands this decision to
this feature by name — *"004 reads straight out of `payload` when it builds the real
normalized rows, and may then retire this table or keep it as an audit trail — that decision
belongs to 004, not here."*

A claimed flow is a teacher's irreplaceable work arriving from a store the server has never
seen. The shred from `payload` into four tables is the single riskiest write in this feature,
and it runs exactly once per flow. Keeping the source snapshot means a bad backfill is
recoverable by re-running it; retiring the table means it is not. The cost is one dormant
table no user ever sees and no query ever joins.

The one thing the decision forbids is leaving it *ambiguous*: after C1, a flow lives in
`flows`/`phases`/`flow_items`, and `claimed_flows` is provenance. Nothing reads `payload` to
render anything.

**Alternatives considered**: retiring it in this feature — rejected, discards the recovery
path at the exact moment it is most needed. Leaving it untouched with no backfill — rejected,
that leaves two places a flow can live, which is the ambiguity this feature exists to end.

## 5. The write path: one RPC, not four round-trips

**Decision**: `app_save_flow(payload jsonb)`, `SECURITY INVOKER`, shredding a whole flow into
`flows`, `phases`, `flow_items`, and `flow_item_notes` inside one transaction. The browser
client (`src/lib/supabase/client.ts`) calls it directly. Ids are client-generated UUIDs.

**Rationale**: A flow save spans four tables. Four `upsert` calls from the browser is four
transactions, and a half-written flow — items landed, phases not — is worse than an unsaved
one, because the local copy will be marked `synced` on a partial success. One function call
is one transaction.

`SECURITY INVOKER` rather than `SECURITY DEFINER` is the load-bearing detail: the function
runs as the caller, so every RLS policy on all four tables still applies to every statement
inside it. It is a transaction boundary, not a privilege boundary. The `SECURITY DEFINER`
helpers in `20260826224202_helper_functions.sql` exist to break policy recursion; nothing here
needs that, and reaching for it would silently remove the protection this feature is about.

Client-generated ids mean an offline write already has its final identity, so the outbox
entry, the local record, and the eventual server row all agree without a post-hoc id
rewrite — and a replayed flush is an idempotent upsert rather than a duplicate insert
(FR-017).

**No route handler.** RLS is the guarantee; a `/api/flows` route would add a second place the
authorization story lives and a server hop the offline path cannot use.

## 6. SC-013 asserted, not reviewed

**Decision**: A Vitest test walks the static import graph of `src/lib/friction/` and
`src/lib/validator/` transitively and fails on any import resolving into `src/lib/supabase/`,
`@supabase/*`, `src/lib/storage/`, or a bare `fetch`.

**Rationale**: SC-013 asks for "zero database or network references... asserted
automatically." Today RULE-H6 holds by inspection, which is exactly the state that decays
when a feature adds a server underneath the storage layer. The assertion is cheap, it fails
on the import rather than at runtime, and it turns a review habit into a gate. Both modules
also keep 100% line coverage under `vitest run --coverage`, which this feature must not drop
as a side effect of adding files to `coverage.include`.

## 7. Anonymous writes stay local, and the outbox is for authenticated sessions only

**Decision**: A signed-out edit writes to IndexedDB and enqueues nothing. The outbox is
created, flushed, and swept only for an authenticated session.
`src/app/onboarding/ClaimFlowsPrompt.tsx` remains the single handoff at sign-in.

**Rationale**: This is what already ships, and RULE-L3/L4 require the write path to work with
no account at all. Enqueuing for a session that may never exist would create a second claim
mechanism competing with the prompt, and a queue whose entries can never flush is
indistinguishable, to the sync label, from a queue that is failing — which would put a
standing "not synced" state in front of a user who never asked for an account. FR-011's
"nothing at all when settled" is only honest if a signed-out session is settled by
definition.

## 8. Scenario 9 is deferred, and the deferral is a scope decision, not a design gap

**Decision**: FR-018 (two devices edited offline, later write wins with a plain disclosure) is
not built in C2. The schema supports it — `flows.updated_at` is the client-clock ordering key
and `synced_at` is the server clock — so it is additive when it lands.

**Rationale**: A single-author object edited on two devices while both were offline is a real
but rare case, and `design-input.md` #8 already settled the *shape* of the answer
(last-writer-wins with disclosure, not a merge UI). What C2 defers is only the disclosure
notice and the detection that drives it. Recording both clocks now is what keeps that
additive: without `synced_at` there is no way to notice, later, that an older write landed
after a newer one.

`updated_at` is a client clock and is trusted only for ordering one user's own writes to one
of their own flows. It is never an authorization input.
