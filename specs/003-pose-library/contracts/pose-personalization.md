# Contract: Pose Personalization (favourites + private notes)

**Status**: Design, reviewed here so the US6 PR starts from an agreed shape.
**Consumed by**: US6 (FR-031 – FR-039, SC-011 – SC-013), deferred to its own PR.
**Companion**: the SQL lives in `data-model.md` §5; this document is the read/write
contract and the invariants a reviewer can check.

---

## What makes this the smallest safe first per-user write

US6 is the first cloud-resident, per-user data in the pose surface. Two properties make it
a good place to establish the pattern rather than a risk:

- The payloads are trivial — a slug and a timestamp; a slug and a text body.
- Neither is ever a precondition for reading. The whole library renders for a signed-out
  reader with no network (FR-035, FR-036), so a total failure of this surface degrades to
  "no favourites shown", never to "no library".

That second property is the design constraint, not a happy accident. It is what the
sections below are built to keep true.

---

## Tables

`pose_favourites` and `pose_notes`, both modelled directly on
`supabase/migrations/20260826224207_claimed_flows.sql:11-36`, which is a near-exact
template: a `user_id uuid not null references auth.users (id) on delete cascade`, RLS
enabled, and four policies each keyed on `user_id = (select auth.uid())` — with the update
policy carrying **both** `using` and `with check`, so a row cannot be updated into someone
else's ownership.

### Three deliberate absences

**No `org_id`, no cohort column, no role column.** RULE-V2 asks whether practice content
can leak to a teacher. With no organization column on either table, that question is
answerable from `information_schema` alone — there is no join path to a cohort, so no
policy can accidentally open one. Principle VIII's boundary is *structural* here, not
policy-dependent. Adding an org column later would be a deliberate, reviewable act; that is
the point.

**No foreign key and no `CHECK` on `pose_slug`.** Pose identity lives in `data/poses/*.json`
(FR-001, RULE-O6), and enumerating valid slugs in Postgres would make the database a second
authority over it — the two would drift the first time a pose is renamed, and CI validates
the JSON, not the table. So `pose_slug` is `text not null` with no referential constraint.
FR-039's "degrade quietly" then falls out of the client-side join for free: a favourite
whose slug no longer resolves simply produces no card. No cleanup job, no orphan sweep, no
migration coupled to a data edit.

**No `deleted_at`.** FR-038 requires account deletion to remove notes and favourites, and
`on delete cascade` from `auth.users` does exactly that. A soft-delete column would leave
the rows behind and quietly break SC-013.

### Uniqueness

- `pose_favourites`: `unique (user_id, pose_slug)`. Favouriting is idempotent — the write
  is an upsert, so a double-tap or an offline replay cannot produce two rows.
- `pose_notes`: `unique (user_id, pose_slug)`. One note per pose per practitioner. FR-032
  says "write, edit, and delete their own", which is a single mutable note, not a thread.
  If a thread is ever wanted, that is an additive change; starting with many would make the
  UI ambiguous now for a need nobody has stated.

---

## Invariants, written as assertions

These are the statements the US6 PR must prove in tests, not describe in prose.

| # | Invariant | Source | How it is proven |
|---|---|---|---|
| I1 | A second account reading another's note by any means receives zero rows | FR-033, SC-011 | Integration test with two accounts: select, and select by explicit `id`. Both return empty. |
| I2 | An org admin sharing an organization with the author is not an exception to I1 | FR-034, SC-011 | Same test, with both accounts in one org and one as admin. |
| I3 | An update cannot move a row to another `user_id` | Principle VIII | Update attempt setting `user_id` to the other account fails the `with check`. |
| I4 | Neither table has a column referencing an org, cohort, or role | RULE-V2 | Assertion over `information_schema.columns` — mechanical, and survives future migrations. |
| I5 | Deleting an account leaves zero rows in either table | FR-038, SC-013 | Delete the `auth.users` row, count both tables. |
| I6 | A favourite whose slug is absent from the library renders nothing and throws nothing | FR-039 | Unit test on the join helper with a fabricated slug. |
| I7 | The signed-out pose read path issues no Supabase call | FR-035, SC-012 | The existing offline read test, extended to assert on the client. |

I4 and I7 are the two worth writing first. I4 because it is the only invariant that
protects itself against a *later* change, and I7 because it is the one a well-meaning
refactor breaks by accident.

---

## Read/write contract

**Reads.** Personalization is fetched separately from the pose data, never joined into it.
`getPose(slug)` and the catalog loader stay pure functions over JSON, with no `user_id`
parameter and no Supabase client in their signature — that is what keeps FR-035 checkable
by reading the function type. Favourites and notes arrive from their own client-side fetch
and are merged in the component.

**Writes.** Authenticated only, and the auth check is the RLS policy — the client-side
check exists to avoid a pointless round trip, never as the boundary (Principle VIII: "never
by application code").

**Degradation rules, in order of what the reader sees:**

| Condition | Pose data | Favourite / note UI |
|---|---|---|
| Signed out | Renders in full, no sign-in prompt (FR-035, AS4) | Controls absent — not disabled-with-a-tooltip, which would advertise a wall |
| Signed in, offline | Renders from cache (FR-036, AS5) | Controls visible; a write fails with a plain retry, no data loss |
| Entitlement lapsed | Renders in full | Existing notes and favourites remain **readable and deletable** (FR-037, AS6) |
| Slug no longer in library | — | The entry is skipped silently (FR-039, I6) |

The lapsed-entitlement row is the one to be careful with. FR-037 says a lapse must not
revoke the ability to read. It is silent on writing, and "read-only after lapse" is the
defensible reading — but *deleting* must stay available regardless, because a practitioner
locked out of removing their own note is a data-rights problem, not a billing lever. And no
copy on this path may use urgency or a countdown (RULE-C2).

---

## Testids

`poses-detail-favourite`, `poses-detail-favourite-active`, `poses-detail-note-editor`,
`poses-detail-note-save`, `poses-detail-note-delete`. To be added to
`docs/krama-guardrails.md` §1.3 in the US6 PR, not this one — §1.3 requires the table move
in the same change as the code, so registering them early would make the table claim
something the source does not yet contain.
