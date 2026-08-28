-- Entitlements & billing (docs/design/002-schema.md §C/§D, data-model.md).
--
-- Tables: plan_features, stripe_customers, subscriptions, seat_assignments,
-- entitlement_grants, stripe_events. Plus app_entitlements() (T014,
-- contracts/entitlements-api.md).
--
-- Ordered BEFORE the cohorts migration (20260826224205) even though tasks.md
-- lists cohorts as T012 and this as T013: app_grant_ytt_completion() (created in
-- the cohorts migration) inserts into entitlement_grants and its return type IS
-- entitlement_grants, so the table must exist first. Migration application order
-- follows dependency, not task-list order.

create table plan_features (
  plan_key text not null,
  feature_key text not null,
  primary key (plan_key, feature_key)
);

alter table plan_features enable row level security;

-- Plan/feature mapping is not tenant data — readable by any authenticated user
-- so the client can render what a plan includes before purchase.
create policy plan_features_select_any_authenticated on plan_features
  for select to authenticated
  using (true);

create table stripe_customers (
  user_id uuid primary key references profiles (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

alter table stripe_customers enable row level security;

create policy stripe_customers_select_own on stripe_customers
  for select to authenticated
  using (user_id = (select auth.uid()));

-- No insert/update/delete policy — written only by server code using the
-- service-role client during checkout/webhook handling.

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  stripe_subscription_id text not null unique,
  plan_key text not null,
  status text not null,
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy subscriptions_select_own on subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- No insert/update/delete policy — written only via the Stripe webhook handler
-- using the service-role client, never directly by a client request.

create table seat_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  plan_key text not null,
  created_at timestamptz not null default now(),
  constraint seat_assignments_org_user_unique unique (org_id, user_id)
);

alter table seat_assignments enable row level security;

create policy seat_assignments_select_org_member on seat_assignments
  for select to authenticated
  using (org_id = any (app_org_ids()));

create policy seat_assignments_manage_authorized_role on seat_assignments
  for all to authenticated
  using (app_has_org_role(org_id, array['owner', 'admin']))
  with check (app_has_org_role(org_id, array['owner', 'admin']));

create table entitlement_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  source text not null,
  source_ref uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint entitlement_grants_source_known check (source in ('cohort_graduation'))
);

alter table entitlement_grants enable row level security;

create policy entitlement_grants_select_own on entitlement_grants
  for select to authenticated
  using (user_id = (select auth.uid()));

-- No insert/update/delete policy for any authenticated role — rows are written
-- only by app_grant_ytt_completion() (SECURITY DEFINER, cohorts migration) or
-- future service-role-driven grant sources.

-- stripe_events — the idempotency ledger (research.md item 8). RLS enabled with
-- ZERO policies rather than RLS disabled: service_role is BYPASSRLS and
-- unaffected; every other role gets zero rows, fail-closed at no cost to the
-- webhook path. Diverges deliberately from the NextMove reference, which
-- disables RLS entirely on the equivalent table.
create table stripe_events (
  stripe_event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table stripe_events enable row level security;

-- ---------------------------------------------------------------------------
-- app_entitlements(user_id) — the single resolver: union of an active
-- subscription, an active seat assignment, and any live entitlement grant.
-- App code never hand-rolls this union.
--
-- The escalation trap: a definer function taking an arbitrary subject uuid is a
-- read-anyone vector unless guarded. Raises insufficient_privilege unless the
-- subject is the caller or the caller is service_role.
-- ---------------------------------------------------------------------------
create or replace function app_entitlements(user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  is_service_role boolean;
  result jsonb;
  -- Local copy of the `user_id` parameter: every table this function queries
  -- also has a `user_id` column, and plpgsql's default
  -- `variable_conflict = error` setting raises "column reference is ambiguous"
  -- at runtime for a bare parameter reference inside such a query. Aliasing
  -- sidesteps it without renaming the parameter, which would break the RPC's
  -- named-argument contract (contracts/entitlements-api.md).
  v_user_id uuid := user_id;
begin
  -- coalesce, not a bare comparison: if the `role` JWT claim is ever unset,
  -- `auth.role()` returns NULL, `NULL = 'service_role'` is NULL (not false),
  -- and `IF NULL THEN` silently skips the guard below in plpgsql — the
  -- escalation check must fail closed, never fail open on an unknown role.
  is_service_role := coalesce((select auth.role()), '') = 'service_role';

  if not is_service_role and v_user_id <> (select auth.uid()) then
    raise exception 'cannot read another user''s entitlements'
      using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'subscriptions', coalesce(
      (
        select jsonb_agg(to_jsonb(s))
        from subscriptions s
        where s.user_id = v_user_id
          and s.status = 'active'
      ),
      '[]'::jsonb
    ),
    'seat_assignments', coalesce(
      (
        select jsonb_agg(to_jsonb(sa))
        from seat_assignments sa
        where sa.user_id = v_user_id
      ),
      '[]'::jsonb
    ),
    'entitlement_grants', coalesce(
      (
        select jsonb_agg(to_jsonb(eg))
        from entitlement_grants eg
        where eg.user_id = v_user_id
          and now() between eg.starts_at and eg.ends_at
      ),
      '[]'::jsonb
    )
  ) into result;

  return result;
end;
$$;

revoke execute on function app_entitlements(uuid) from public;
grant execute on function app_entitlements(uuid) to authenticated;
grant execute on function app_entitlements(uuid) to service_role;
