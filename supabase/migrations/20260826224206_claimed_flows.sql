-- claimed_flows — landing table for IndexedDB v1 flows claimed at sign-up (T030,
-- docs/design/002-schema.md appendix §E "Migrating existing local data").
--
-- Deliberately NOT the normalized flows/flow_items/phases schema — that belongs to
-- feature 004. This table exists only so a "claim your existing flows?" prompt has
-- somewhere to land the whole Flow payload immediately, without designing 004's
-- document-write schema early. 004 reads straight out of `payload` when it builds the
-- real normalized rows, and may then retire this table or keep it as an audit trail —
-- that decision belongs to 004, not here.

create table claimed_flows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_flow_id text not null,
  payload jsonb not null,
  claimed_at timestamptz not null default now()
);

alter table claimed_flows enable row level security;

create policy claimed_flows_select_own on claimed_flows
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy claimed_flows_insert_own on claimed_flows
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy claimed_flows_update_own on claimed_flows
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy claimed_flows_delete_own on claimed_flows
  for delete to authenticated
  using (user_id = (select auth.uid()));
