-- Sharing a flow inside an organization — feature 004 US3
-- (specs/004-sequencing-composer/data-model.md §4, and the read/write contract in
-- specs/004-sequencing-composer/contracts/flow-sharing.md).
--
-- The whole of this migration is one column and four read policies. What it deliberately
-- does NOT contain is the point: there is no policy here for flow_item_notes, and no column
-- added to it. The share read path is flows → phases → flow_items, and it stops. A recipient
-- cannot obtain the author's notes by any route because none of the three tables the share
-- query reads has a column that holds one.
--
-- 20260903090000_flows.sql kept shared_org_id out on purpose, so that widening the author
-- boundary would be a diff a reviewer sees (docs/design/002-schema.md §B). This is that diff.

-- ---------------------------------------------------------------------------
-- The column
-- ---------------------------------------------------------------------------

alter table flows add column shared_org_id uuid references organizations (id);

comment on column flows.shared_org_id is
  'The organization this flow is shared with, or null. Structure only: title, phases and '
  'items cross this boundary; flow_item_notes never does, because no policy on that table '
  'mentions an org (004 US3, Principle VIII).';

-- Partial, because the overwhelming majority of rows are null: an unshared flow should cost
-- nothing to index, and the only query that uses this is "what is shared with my org".
create index flows_shared_org_id_idx on flows (shared_org_id) where shared_org_id is not null;

-- ---------------------------------------------------------------------------
-- Reading a shared flow
--
-- Policies are OR'd, so each of these is purely additive to the owner-keyed policy of the
-- same name minus `_shared_in_org`. app_is_org_member is the existing SECURITY DEFINER
-- helper from 20260826224202_helper_functions.sql; it is definer to break policy recursion
-- on memberships, and it checks status = 'active', so a removed member stops reading here
-- with nothing written for it.
--
-- `deleted_at is null` is a departure from data-model.md §4, recorded in DECISIONS.md. The
-- owner's own SELECT policy carries no such clause because the client filters its own soft
-- deletes and needs to see the tombstone to converge. A recipient has no such need: a flow
-- its author deleted should leave the org's list, and a soft delete is a delete as far as
-- everyone but its author is concerned.
-- ---------------------------------------------------------------------------

create policy flows_select_shared_in_org on flows
  for select to authenticated
  using (shared_org_id is not null
         and deleted_at is null
         and app_is_org_member(shared_org_id));

-- phases and flow_items reach the share the same way they reach ownership: through
-- flow_id, with no denormalized copy of shared_org_id. One place records who a flow is
-- shared with, so there is nothing to disagree with it.
create policy phases_select_shared_in_org on phases
  for select to authenticated
  using (exists (select 1 from flows f
                  where f.id = phases.flow_id
                    and f.shared_org_id is not null
                    and f.deleted_at is null
                    and app_is_org_member(f.shared_org_id)));

create policy flow_items_select_shared_in_org on flow_items
  for select to authenticated
  using (exists (select 1 from flows f
                  where f.id = flow_items.flow_id
                    and f.shared_org_id is not null
                    and f.deleted_at is null
                    and app_is_org_member(f.shared_org_id)));

-- ---------------------------------------------------------------------------
-- Writing the share
--
-- Sharing is an ordinary update of one column by the flow's owner, so it needs no RPC. It
-- does need one guard the owner-keyed policy did not have to make: `user_id = auth.uid()`
-- alone would let an author set shared_org_id to any organization's id, including one they
-- have never belonged to. That publishes their own work rather than anyone else's, so it is
-- not a leak — but it is not a share either, and an org whose members did not invite the
-- flow should not find it in their list.
--
-- Replacing the two write policies rather than adding a third: WITH CHECK clauses on
-- separate policies are OR'd, so a second permissive policy would widen the boundary
-- instead of narrowing it. This is the one shape where the guard has to be inside the
-- existing expression.
-- ---------------------------------------------------------------------------

drop policy flows_insert_own on flows;
drop policy flows_update_own on flows;

create policy flows_insert_own on flows
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and (shared_org_id is null or app_is_org_member(shared_org_id)));

create policy flows_update_own on flows
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and (shared_org_id is null or app_is_org_member(shared_org_id)));

-- ---------------------------------------------------------------------------
-- Nothing below this line, and that is the guarantee.
--
-- No policy on flow_item_notes. No org_id, cohort, role or visibility column on it. An org
-- admin is not an exception (RULE-V5) because there is no role branch anywhere above to be
-- an exception in. Revoking a share is `shared_org_id = null`, which closes the read path
-- and touches nobody's duplicate: a duplicate is a separate flow, owned by whoever made it,
-- with no link back to the original (FR-026, FR-032).
-- ---------------------------------------------------------------------------
