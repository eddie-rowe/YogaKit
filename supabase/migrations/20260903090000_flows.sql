-- The normalized flow schema — feature 004 US2 (specs/004-sequencing-composer/data-model.md
-- §2 and §3). This is the table 20260826224207_claimed_flows.sql said "belongs to feature
-- 004"; that table stays as write-once provenance, and nothing reads its `payload` once the
-- one-time backfill has run.
--
-- Until this migration, flows lived only in the browser's IndexedDB. `002` shipped
-- organizations, entitlements, seats and Stripe on top of a product where clearing a browser
-- deleted everything the teacher had ever made.
--
-- The shape is a normalization of src/lib/flow/types.ts, not a redesign of it: Flow →
-- flows, Phase → phases, FlowItem → flow_items. The one deliberate departure is
-- FlowItem.note, which does NOT become a column here — see flow_item_notes below.
--
-- Ids are client-generated so an offline write already carries its final identity: the
-- outbox entry, the local record and the server row agree with no post-hoc rewrite, and a
-- replayed flush is an idempotent upsert rather than a duplicate insert (FR-017).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table flows (
  id             uuid primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  title          text not null,
  schema_version text not null,
  created_at     timestamptz not null,
  -- The client clock. This is the sync ordering key, and it is trusted for exactly one
  -- thing: ordering one user's own writes to one of their own flows. It is never an
  -- authorization input.
  updated_at     timestamptz not null,
  -- The server clock. Recorded now so that FR-018 (an older write landing after a newer
  -- one) is detectable when that story ships; without it there is nothing to compare.
  synced_at      timestamptz not null default now(),
  -- Soft delete, because a delete has to replicate too. A hard delete on one device is
  -- indistinguishable, from another device, from a flow that has not synced yet.
  deleted_at     timestamptz
);

create table phases (
  id         uuid primary key,
  flow_id    uuid not null references flows (id) on delete cascade,
  name       text not null,
  -- Phase.intentTag is a persisted field today, so it round-trips as one. FR-050 (US7, P2)
  -- asks for it to be derived from the items' energetic_direction instead; when that lands
  -- this column becomes a cache of a client-side derivation, or is dropped. Its existence
  -- is not a decision against FR-050.
  intent_tag text not null,
  position   integer not null
);

create table flow_items (
  id              uuid primary key,
  flow_id         uuid not null references flows (id) on delete cascade,
  phase_id        uuid references phases (id) on delete set null,
  -- text, with no foreign key and no CHECK. Pose identity lives in data/poses/*.json
  -- (RULE-O6); enumerating valid slugs here would make Postgres a second authority over it
  -- and the two would drift the first time a pose was renamed. FR-031's "degrade legibly"
  -- then falls out of the client-side join for free.
  pose_slug       text not null,
  mode            text not null,
  measure_breaths integer,
  measure_seconds integer,
  position        integer not null,
  -- DefaultMeasure documents "exactly one of breaths/seconds is set", but breathMark()
  -- returns '' for neither, so an item with no measure is legal. At most one, not exactly.
  constraint flow_items_one_measure check (num_nonnulls(measure_breaths, measure_seconds) <= 1)
);

-- FlowItem.note is practice content (Principle VIII), and it is the only author-only field
-- on the whole document. It lives here rather than as a column on flow_items so that the
-- share query — flows → phases → flow_items, and stop — cannot return one. Not because it
-- filters the note out, but because those three tables have no column that holds it.
--
-- docs/design/002-schema.md §B is why this is a table and not a column grant: "RLS is
-- row-level only; Postgres column grants are role-level, so 'teacher may read two columns
-- of these rows' is inexpressible without also blocking the owner from their own columns.
-- The table split makes widening the boundary require a schema migration a reviewer will
-- see." A grant that hid this from a colleague would hide it from its author too — both are
-- `authenticated`.
--
-- Three deliberate absences: no org_id, no cohort column, no role or visibility column.
-- RULE-V2 asks whether practice content can leak to a teacher; with no organization column
-- that question is answerable from information_schema alone, because there is no join path
-- to a cohort for a policy to open. The absence IS the guarantee, which is why
-- scripts/verify-migrations.sh asserts it structurally rather than behaviourally.
create table flow_item_notes (
  flow_item_id uuid primary key references flow_items (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  note         text not null,
  updated_at   timestamptz not null default now()
);

create index flows_user_id_live_idx on flows (user_id) where deleted_at is null;
create index phases_flow_id_idx on phases (flow_id);
create index flow_items_flow_id_idx on flow_items (flow_id);
create index flow_items_phase_id_idx on flow_items (phase_id);

-- ---------------------------------------------------------------------------
-- RLS — the canonical four-policy shape from 20260826224207_claimed_flows.sql.
-- Every update policy carries both `using` and `with check`, so a row cannot be
-- updated into someone else's ownership.
--
-- phases and flow_items carry no user_id of their own and reach it through flow_id. A
-- denormalized copy would be faster and would be a second place ownership is recorded —
-- two places that can disagree, on the tables whose disagreement would be a leak.
-- ---------------------------------------------------------------------------

alter table flows enable row level security;

create policy flows_select_own on flows
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy flows_insert_own on flows
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy flows_update_own on flows
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy flows_delete_own on flows
  for delete to authenticated
  using (user_id = (select auth.uid()));

alter table phases enable row level security;

create policy phases_select_own on phases
  for select to authenticated
  using (exists (select 1 from flows f
                  where f.id = phases.flow_id and f.user_id = (select auth.uid())));

create policy phases_insert_own on phases
  for insert to authenticated
  with check (exists (select 1 from flows f
                       where f.id = phases.flow_id and f.user_id = (select auth.uid())));

create policy phases_update_own on phases
  for update to authenticated
  using (exists (select 1 from flows f
                  where f.id = phases.flow_id and f.user_id = (select auth.uid())))
  with check (exists (select 1 from flows f
                       where f.id = phases.flow_id and f.user_id = (select auth.uid())));

create policy phases_delete_own on phases
  for delete to authenticated
  using (exists (select 1 from flows f
                  where f.id = phases.flow_id and f.user_id = (select auth.uid())));

alter table flow_items enable row level security;

create policy flow_items_select_own on flow_items
  for select to authenticated
  using (exists (select 1 from flows f
                  where f.id = flow_items.flow_id and f.user_id = (select auth.uid())));

create policy flow_items_insert_own on flow_items
  for insert to authenticated
  with check (exists (select 1 from flows f
                       where f.id = flow_items.flow_id and f.user_id = (select auth.uid())));

create policy flow_items_update_own on flow_items
  for update to authenticated
  using (exists (select 1 from flows f
                  where f.id = flow_items.flow_id and f.user_id = (select auth.uid())))
  with check (exists (select 1 from flows f
                       where f.id = flow_items.flow_id and f.user_id = (select auth.uid())));

create policy flow_items_delete_own on flow_items
  for delete to authenticated
  using (exists (select 1 from flows f
                  where f.id = flow_items.flow_id and f.user_id = (select auth.uid())));

alter table flow_item_notes enable row level security;

-- SELECT is `user_id = auth.uid()` and nothing else. That single expression is what makes
-- scenario 6 (a recipient's own notes on their duplicate, invisible to the original author)
-- true with nothing written for it, and what makes a direct PostgREST request from a
-- recipient return zero of the author's rows.
create policy flow_item_notes_select_own on flow_item_notes
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Write additionally requires that the item belongs to a flow the caller owns. flow_item_id
-- is the primary key, so without this a user could squat the key of someone else's item and
-- block its owner from ever writing their own note. The extra clause reaches flows.user_id,
-- never an org, cohort or role — so it does not weaken the structural claim above.
create policy flow_item_notes_insert_own on flow_item_notes
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from flow_items i join flows f on f.id = i.flow_id
                           where i.id = flow_item_notes.flow_item_id
                             and f.user_id = (select auth.uid())));

create policy flow_item_notes_update_own on flow_item_notes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy flow_item_notes_delete_own on flow_item_notes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- app_save_flow(payload jsonb) — one flow, four tables, one transaction.
--
-- SECURITY INVOKER, not DEFINER, and that is the load-bearing detail: the function runs as
-- the caller, so every policy above still applies to every statement inside it. This is a
-- transaction boundary, not a privilege boundary. The SECURITY DEFINER helpers in
-- 20260826224202_helper_functions.sql exist to break policy recursion; nothing here needs
-- that, and reaching for it would silently remove the protection this feature is about.
--
-- Four upserts from the browser would be four transactions, and a half-written flow — items
-- landed, phases not — is worse than an unsaved one, because the local copy gets marked
-- synced on the partial success.
--
-- `payload` is the Flow document from src/lib/flow/types.ts, camelCase as the client has it.
-- ---------------------------------------------------------------------------

create or replace function app_save_flow(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_flow  uuid := (payload->>'id')::uuid;
  v_items jsonb := coalesce(payload->'items', '[]'::jsonb);
  v_phases jsonb := coalesce(payload->'phases', '[]'::jsonb);
begin
  if v_uid is null then
    raise exception 'app_save_flow requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;
  if v_flow is null then
    raise exception 'app_save_flow payload has no id' using errcode = 'invalid_parameter_value';
  end if;

  -- A save on a soft-deleted flow revives it: the teacher edited it, so they have it.
  insert into flows (id, user_id, title, schema_version, created_at, updated_at, synced_at)
  values (v_flow, v_uid,
          payload->>'title',
          coalesce(payload->>'schema_version', '0.1.0'),
          coalesce((payload->>'createdAt')::timestamptz, now()),
          coalesce((payload->>'updatedAt')::timestamptz, now()),
          now())
  on conflict (id) do update
     set title          = excluded.title,
         schema_version = excluded.schema_version,
         updated_at     = excluded.updated_at,
         synced_at      = now(),
         deleted_at     = null;

  -- Phases before items, because flow_items.phase_id references them.
  delete from phases p
   where p.flow_id = v_flow
     and not exists (select 1 from jsonb_array_elements(v_phases) e
                      where (e->>'id')::uuid = p.id);

  insert into phases (id, flow_id, name, intent_tag, position)
  select (e->>'id')::uuid, v_flow, e->>'name', e->>'intentTag', (e->>'order')::integer
    from jsonb_array_elements(v_phases) e
  on conflict (id) do update
     set name       = excluded.name,
         intent_tag = excluded.intent_tag,
         position   = excluded.position;

  -- Reordering is a position update, never a delete-and-reinsert, so an item's note
  -- survives the item moving.
  delete from flow_items i
   where i.flow_id = v_flow
     and not exists (select 1 from jsonb_array_elements(v_items) e
                      where (e->>'id')::uuid = i.id);

  insert into flow_items (id, flow_id, phase_id, pose_slug, mode,
                          measure_breaths, measure_seconds, position)
  select (e->>'id')::uuid, v_flow,
         nullif(e->>'phaseId', '')::uuid,
         e->>'poseSlug',
         e->>'mode',
         (e->'measure'->>'breaths')::integer,
         (e->'measure'->>'seconds')::integer,
         (e->>'order')::integer
    from jsonb_array_elements(v_items) e
  on conflict (id) do update
     set phase_id        = excluded.phase_id,
         pose_slug       = excluded.pose_slug,
         mode            = excluded.mode,
         measure_breaths = excluded.measure_breaths,
         measure_seconds = excluded.measure_seconds,
         position        = excluded.position;

  -- A cleared note is a deleted row, not an empty string: the absence of the row is the
  -- thing the share query relies on.
  delete from flow_item_notes n
   using flow_items i
   where n.flow_item_id = i.id
     and i.flow_id = v_flow
     and not exists (select 1 from jsonb_array_elements(v_items) e
                      where (e->>'id')::uuid = n.flow_item_id
                        and coalesce(e->>'note', '') <> '');

  insert into flow_item_notes (flow_item_id, user_id, note, updated_at)
  select (e->>'id')::uuid, v_uid, e->>'note', now()
    from jsonb_array_elements(v_items) e
   where coalesce(e->>'note', '') <> ''
  on conflict (flow_item_id) do update
     set note       = excluded.note,
         updated_at = now();
end;
$$;

revoke execute on function app_save_flow(jsonb) from public;
grant execute on function app_save_flow(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- app_delete_flow(flow_id uuid) — the soft delete, in one place.
--
-- The children are left alone: reads filter on the parent's deleted_at, and keeping the
-- rows is what makes an undelete a one-column update rather than a restore.
-- ---------------------------------------------------------------------------

create or replace function app_delete_flow(flow_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update flows set deleted_at = now(), synced_at = now()
   where id = flow_id and deleted_at is null;
end;
$$;

revoke execute on function app_delete_flow(uuid) from public;
grant execute on function app_delete_flow(uuid) to authenticated;
