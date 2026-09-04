# Data Model: Sequencing Composer

Four new tables in C1, one added column in US3, one new IndexedDB store in C2. The domain
types in `src/lib/flow/types.ts` do not change shape — the schema is a normalization of the
`Flow` that already exists, not a redesign of it, so `exportKramaFile` keeps round-tripping
the same document.

---

## 1. What the existing types say

`src/lib/flow/types.ts`:

| Type | Fields |
|---|---|
| `Flow` | `id`, `title`, `items[]`, `phases[]`, `createdAt`, `updatedAt`, `isBuiltIn`, `schema_version` |
| `FlowItem` | `id`, `poseSlug`, `mode: 'yin' \| 'yang' \| 'both'`, `measure: DefaultMeasure`, `note?`, `phaseId: string \| null`, `order` |
| `Phase` | `id`, `name`, `intentTag: 'brahmana' \| 'langhana' \| 'samana'`, `order` |
| `DefaultMeasure` | `breaths?`, `seconds?` — *"exactly one of breaths/seconds is set"* |

Two consequences the schema has to respect:

- **`FlowItem.note` is the only author-only field on the whole document.** That is what makes
  the table split in §3 a small change rather than a restructuring.
- **`measure` may legitimately be empty.** `breathMark()` returns `''` for it. So the
  constraint is *at most one* of the two, not exactly one.

`isBuiltIn` has no column. The three shipped templates live in `data/flows/` and are read from
the repo; `flows` holds user-authored records only. A built-in that a teacher claims or
duplicates becomes a user-authored row with `isBuiltIn: false`, which is already what
`importKramaFile` does.

---

## 2. Tables — C1

Modelled on `supabase/migrations/20260826224207_claimed_flows.sql`, which is the canonical
four-policy shape in this codebase: RLS enabled, and `select` / `insert` / `update` / `delete`
each keyed on `user_id = (select auth.uid())`, with the update policy carrying **both**
`using` and `with check` so a row cannot be updated into someone else's ownership.

```sql
create table flows (
  id             uuid primary key,                                   -- client-generated
  user_id        uuid not null references auth.users (id) on delete cascade,
  title          text not null,
  schema_version text not null,
  created_at     timestamptz not null,
  updated_at     timestamptz not null,        -- client clock; sync ordering key
  synced_at      timestamptz not null default now(),   -- server clock; audit
  deleted_at     timestamptz                  -- soft delete: a delete has to replicate too
);

create table phases (
  id         uuid primary key,
  flow_id    uuid not null references flows (id) on delete cascade,
  name       text not null,
  intent_tag text not null,
  position   integer not null
);

create table flow_items (
  id               uuid primary key,
  flow_id          uuid not null references flows (id) on delete cascade,
  phase_id         uuid references phases (id) on delete set null,
  pose_slug        text not null,
  mode             text not null,
  measure_breaths  integer,
  measure_seconds  integer,
  position         integer not null,
  constraint flow_items_one_measure check (num_nonnulls(measure_breaths, measure_seconds) <= 1)
);

create table flow_item_notes (
  flow_item_id uuid primary key references flow_items (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  note         text not null,
  updated_at   timestamptz not null default now()
);

create index on phases (flow_id);
create index on flow_items (flow_id);
create index on flows (user_id) where deleted_at is null;
```

### Ownership reaches down, not sideways

`phases` and `flow_items` carry no `user_id`. Their policies reach it through `flow_id`:

```sql
create policy flow_items_select_own on flow_items
  for select to authenticated
  using (exists (
    select 1 from flows f
     where f.id = flow_items.flow_id
       and f.user_id = (select auth.uid())
  ));
```

A denormalized `user_id` on the child tables would be faster and would be a second place
ownership is recorded — two places that can disagree, on the tables whose disagreement would
be a leak. `flow_item_notes` is the exception and carries its own `user_id`, because in US3
its parent `flow_items` row may belong to a flow the note's author does not own.

### Deliberate absences

**`flow_item_notes` has no `org_id`, no cohort column, no role column, no visibility column.**
RULE-V2 asks whether practice content can leak to a teacher. With no organization column on
the table, that question is answerable from `information_schema` alone: there is no join path
to a cohort, so no policy can open one. Adding such a column later would be a deliberate,
reviewable act. That is the point, and it is the whole of SC-009.

**No foreign key and no `CHECK` on `flow_items.pose_slug`.** Pose identity lives in
`data/poses/*.json` (RULE-O6). Enumerating valid slugs in Postgres would make the database a
second authority over it, and the two would drift the first time a pose is renamed. FR-031's
"degrade legibly" then falls out of the client-side join for free: an item whose slug no
longer resolves renders as an unknown pose rather than failing the flow.

**No entitlement reference anywhere.** A user's own flows are their own records (RULE-O7).
Flow-count caps, if they ever exist, are `002`'s and will reference `flows.user_id` from the
entitlements side.

**`flows.shared_org_id` is not in this migration.** It lands in US3's own migration with its
own policies, so widening the author boundary is a diff a reviewer sees — `002` §B's stated
reason for preferring a table split in the first place. A column with no policy is an
attractive nuisance.

### `intent_tag` is stored, not derived — for now

`Phase.intentTag` is a persisted field today, so it gets a column and the document
round-trips unchanged. FR-050 (US7, P2) asks for it to be *derived* from the items' pose
`energetic_direction`. When US7 lands, the column becomes a cache of a client-side
derivation, or is dropped. Recording the tension here so US7 does not read the column's
existence as a decision against FR-050.

---

## 3. `app_save_flow(payload jsonb)` — C1

One function, `SECURITY INVOKER`, one transaction, four tables. See `research.md` §5 for why
this is not four round-trips and not `SECURITY DEFINER`.

```
app_save_flow(payload jsonb) returns void
  language plpgsql
  security invoker
  set search_path = public, pg_temp
```

Behaviour:

1. Upsert `flows` from `payload->>'id'`, `title`, `schema_version`, `createdAt`, `updatedAt`,
   with `user_id = auth.uid()` on insert and untouched on update. `synced_at = now()`.
2. Delete `phases` and `flow_items` for that `flow_id` that are absent from the payload;
   upsert the rest by their client-generated ids. Reordering is a `position` update, never a
   delete-and-reinsert, so a `flow_item_notes` row survives its item moving.
3. Upsert `flow_item_notes` for every item carrying a note; delete the row for every item
   whose note was cleared.

Every statement runs under the caller's RLS, so a payload naming another user's flow id
writes nothing rather than writing something wrong. The function is idempotent: a replayed
flush produces the same rows, which is what makes FR-017's convergence true.

`REVOKE EXECUTE ... FROM public; GRANT EXECUTE ... TO authenticated;` — the pattern the
`002` helpers already use.

---

## 4. `flows.shared_org_id` — US3

```sql
alter table flows add column shared_org_id uuid references organizations (id);
create index on flows (shared_org_id) where shared_org_id is not null;

create policy flows_select_shared_in_org on flows
  for select to authenticated
  using (shared_org_id is not null and app_is_org_member(shared_org_id));
```

`app_is_org_member` is the existing `SECURITY DEFINER` helper from
`20260826224202_helper_functions.sql`. Matching read policies go on `phases` and `flow_items`
via their `flow_id`.

**No such policy is added to `flow_item_notes`, and that is the guarantee.** A recipient's
`select` on that table returns their own notes and nothing else, because the only policy on it
is `user_id = (select auth.uid())`. The share read path is
`flows → phases → flow_items` and stops. Scenario 6 — a recipient's own notes on their
duplicate, invisible to the original author — is true by the same single policy, with nothing
added for it.

Duplication (FR-025, FR-026) is a client-side read of the shared structure followed by a fresh
`app_save_flow` under new ids. Independence in both directions falls out of that: there is no
link between the copies to break.

---

## 5. The `outbox` store — C2

`src/lib/storage/flow-store.ts` opens IndexedDB `krama` at `DB_VERSION = 1` with one store,
`flows`. C2 bumps to `2` and adds `outbox`, `keyPath: 'flowId'`.

```ts
export interface OutboxEntry {
  flowId: string                       // the key: one entry per flow, replaced on each write
  op: 'upsert' | 'delete'
  payload: Flow | null                 // null for a delete
  queuedAt: string
  attempts: number
  lastError: string | null
  state: 'queued' | 'dead'
}
```

**One entry per flow, replaced on every write.** Keying on `flowId` is what makes FR-017's
"converge on the final intended state" structural rather than a replay-collapsing algorithm:
there is never a sequence to replay. It also makes the queue's size bounded by the number of
flows a teacher has, not by how much they typed.

`state: 'dead'` is FR-016's dead letter — an entry that can never succeed (a rejected payload,
not a connectivity problem) stops being retried and surfaces once, via FR-015's single banner.
`attempts` distinguishes "not yet" from "never".

`SyncState` on the flow record is derived from the outbox on read, not written twice: a flow
with no entry is `synced`, with a `queued` entry is `pending`, with a `dead` entry is
`failed`. Two fields that can disagree about the same fact is the bug this avoids.

### Flush and sweep

- Triggers: `online`, `visibilitychange`, and a 60s interval (FR-010, UX-009). Authenticated
  sessions only (`research.md` §7).
- A flush is one `app_save_flow` call per queued entry, then a delete of the entry. A failure
  increments `attempts` and records `lastError`; a rejection moves the entry to `dead`.
- Sign-out drops entries whose flow is `synced`, alongside `clearSyncedFlows()`. Entries for
  locally-authored flows survive, because their flow does (`research.md` §3).

---

## 6. `stripAuthorOnly(flow: Flow): Flow` — US3

A pure function in `src/lib/flow/share.ts` returning the flow with `note` removed from every
item. It is used for **file export produced for sharing** (FR-029) and nowhere else.

It is explicitly *not* the mechanism for FR-022. The server path does not call it and must not
need to: if a reviewer can find an application-layer function that is load-bearing for the
author boundary, SC-009 has already failed. The file path has no RLS to lean on, so it gets a
function; the data path has RLS, so it gets nothing.
