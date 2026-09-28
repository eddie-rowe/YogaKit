-- ---------------------------------------------------------------------------
-- Fix app_entitlements(): the subscriptions branch filtered only
-- `s.status = 'active'`, never `s.current_period_end`. contracts/billing-
-- webhooks.md's cancellation semantics (FR-015) are explicit that this
-- function "reads this column directly, so there is no separate 'is still
-- within paid period' branch to keep in sync" — but the shipped body never
-- read it. A `subscriptions` row stuck at status='active' with a past
-- current_period_end (a dropped `customer.subscription.deleted`, a Stripe
-- outage, a webhook bug) granted access forever: fail-open on the function
-- docs/design/002-schema.md calls the single most safety-critical line in
-- this feature's schema.
--
-- `create or replace`, not an edit to 20260826224205 in place — the
-- signature is unchanged, only the subscriptions predicate gains a second
-- condition mirroring the time-window idiom already used for
-- entitlement_grants twelve lines below it in the original.
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
  v_user_id uuid := user_id;
begin
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
          and s.current_period_end > now()
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

-- Grants are per-function-signature, not per-definition — `create or
-- replace` above keeps them, but restating is cheap insurance against a
-- future migration that drops and recreates instead of replacing.
revoke execute on function app_entitlements(uuid) from public;
grant execute on function app_entitlements(uuid) to authenticated;
grant execute on function app_entitlements(uuid) to service_role;
