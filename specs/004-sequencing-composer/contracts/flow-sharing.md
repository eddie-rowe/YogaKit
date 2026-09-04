# Contract: Flow Sharing (author boundary)

**Status**: Design, reviewed here so the US3 PR starts from an agreed shape.
**Consumed by**: US3 (FR-022 – FR-032, SC-008 – SC-010).
**Companion**: the SQL lives in `data-model.md` §4; this document is the read/write contract
and the invariants a reviewer can check.

---

## The claim, in one sentence

A recipient cannot obtain the author's notes, by any route, because there is nothing in the
tables the share query reads that holds one.

Everything below exists to make that sentence checkable rather than believable.

---

## What crosses, and what does not

| Crosses the author boundary | Does not |
|---|---|
| `flows`: title, schema version, timestamps | `flow_item_notes`: every row |
| `phases`: name, intent tag, position | |
| `flow_items`: pose slug, mode, measure, position, phase | |

The left column is *structure*. Principle VIII's split is content versus signal; a flow's
shape is neither private practice content nor a practice signal — it is the artefact a teacher
makes in order to give it to someone. The note attached to one placement is the author writing
to themselves, and it is the whole of the right column.

---

## Why this is a table split and not a filtered column

`docs/design/002-schema.md` §B, which this feature follows rather than re-deriving:

> **Why not column-level grants**: RLS is row-level only; Postgres column grants are
> role-level, so "teacher may read two columns of these rows" is inexpressible without also
> blocking the owner from their own columns. The table split makes widening the boundary
> require a schema migration a reviewer will see.

Two independent reasons, both decisive. A grant that hides `note` from a colleague hides it
from its author too — both are `authenticated`. And SC-009 asks a reviewer to confirm the
exclusion "by reading the schema and query alone": a query over `flows → phases → flow_items`
cannot return a note because those three tables have no column that holds one. That is a
property of the query's shape, not of a condition someone remembered to write.

`003` reached the same conclusion independently for `pose_notes` — see
`specs/003-pose-library/contracts/pose-personalization.md`, "Three deliberate absences".

---

## The read paths, exhaustively

FR-024 says *no route* available to a recipient may expose author-only fields, and SC-008
asks for that to be tested over every recipient-accessible route rather than the sharing
screen. There are exactly three:

1. **The share view.** `select` on `flows` joined to `phases` and `flow_items`, filtered by
   `shared_org_id`. No mention of `flow_item_notes` anywhere in the query.
2. **A direct PostgREST request.** A recipient may `select * from flow_item_notes` with their
   own token. The single policy on the table returns their own rows and nothing else.
3. **The duplicate.** A client-side read of path 1 followed by a fresh `app_save_flow` under
   new ids. It can only write what path 1 returned.

There is no fourth. `app_save_flow` is `SECURITY INVOKER` (`research.md` §5), so it grants no
read a recipient does not already have, and no `SECURITY DEFINER` function in this feature
touches flow data.

The file path (FR-028, FR-029) is outside RLS entirely and is handled separately by
`stripAuthorOnly` — see `data-model.md` §6, and I8 below.

---

## Invariants, written as assertions

These are the statements the US3 PR must prove in tests, not describe in prose.

| # | Invariant | Source | How it is proven |
|---|---|---|---|
| I1 | `flow_item_notes` has no column referencing an org, cohort, role, or visibility | RULE-V1/V2, SC-009 | Assertion over `information_schema.columns` in `verify-migrations.sh`. Mechanical, and survives future migrations. |
| I2 | `flow_item_notes` carries exactly one policy per verb, and every one of them is keyed on the caller alone | Principle VIII | Assertion over `pg_policies`: four rows; no `qual` or `with_check` mentioning `org`, `cohort`, `team`, or `role`; and the SELECT policy is `user_id = (select auth.uid())` with no join. |
| I3 | A recipient in the same org, reading a shared flow by every route in the list above, receives zero note rows | FR-024, SC-008 | Two accounts, one org, one shared flow with notes. Three selects, three empty results. |
| I4 | An org **admin** is not an exception to I3 | RULE-V5 | The same test with the recipient holding the admin role. |
| I5 | A recipient's duplicate contains zero note rows belonging to the original author | FR-025, SC-008 | Duplicate, then count `flow_item_notes` for the new flow's items. |
| I6 | A recipient's own notes on their duplicate are invisible to the original author | FR-027 | The original author selects; receives zero of the recipient's rows. |
| I7 | An edit to a duplicate does not change the original, and vice versa | FR-026 | Edit each, read both. |
| I8 | An export produced for sharing carries no `note` key on any item | FR-029 | Unit test on `stripAuthorOnly`, plus a test that the sharing export path calls it. |
| I9 | Revoking `shared_org_id` leaves existing duplicates readable by their owners | FR-032 | Set to null, recipient reads their duplicate. |
| I10 | A duplicate referencing a pose absent from the library opens and renders that item legibly | FR-031 | Unit test on the render path with a fabricated slug. |

The write policies are the one place the predicate is more than `user_id`: because
`flow_item_id` is the primary key, an insert policy checking only the caller's own
`user_id` would let anyone guess another teacher's item id, claim the row, and lock the
real owner out of writing a note on their own item. Those policies therefore also require
that the item belongs to a flow the caller owns. That reaches `flows.user_id` — still the
caller, still nothing joinable to an org — which is why I2 is stated as "keyed on the
caller alone" rather than as one literal expression.

**I1 and I2 are the two worth writing first**, and both belong in `scripts/verify-migrations.sh`
rather than in Vitest. They are the only invariants that hold against a migration nobody has
written yet: I3–I7 prove today's policies behave, while I1 and I2 prove that tomorrow's
migration cannot quietly stop them behaving. `verify-migrations.sh` already runs against bare
Postgres in the `db-verify` CI job and is explicitly designed to accumulate DO blocks per
phase.

---

## Sharing copy

FR-032 requires the sharing surface to *state* that existing independent duplicates are
unaffected by revoking a share, rather than implying it. That is a promise about what will not
happen to other people's copies, and the honest form of it is a plain sentence next to the
revoke control, not a confirmation dialog.

Every string on this path goes through `009`'s copy-lint, which is CI-gating as of `448ee6a`.
The rule most likely to bite here is the urgency one: a share revocation is not an emergency,
and the copy should not read like one.

**[OWNER SIGN-OFF]** — the sharing and revoke strings, once drafted in the US3 PR.
