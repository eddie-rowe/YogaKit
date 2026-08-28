-- Identity & tenancy RLS policies that depend on the SECURITY DEFINER helpers
-- (docs/design/002-schema.md §A). Split out of 20260826224201_identity_tenancy.sql
-- because these helpers (app_org_ids, app_has_org_role, app_co_member_ids) are
-- LANGUAGE SQL functions whose bodies are parse-analyzed at CREATE FUNCTION time —
-- they cannot be created until `memberships` exists, but `memberships` is created in
-- 20260826224201, before 20260826224202_helper_functions.sql defines them. This file
-- runs last, once both the tables and the helpers exist.

create policy profile_cards_select_self_or_co_member on profile_cards
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or user_id = any (app_co_member_ids())
  );

create policy organizations_select_member on organizations
  for select to authenticated
  using (id = any (app_org_ids()));

create policy memberships_select_co_member on memberships
  for select to authenticated
  using (org_id = any (app_org_ids()));

create policy memberships_update_authorized_role on memberships
  for update to authenticated
  using (app_has_org_role(org_id, array['owner', 'admin']))
  with check (app_has_org_role(org_id, array['owner', 'admin']));

create policy integration_connections_select_authorized on integration_connections
  for select to authenticated
  using (app_has_org_role(org_id, array['owner', 'admin']));
