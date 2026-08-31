-- Profile bootstrap.
--
-- 20260826224201_identity_tenancy.sql gave `profiles` two NOT NULL columns with no
-- defaults and left nothing to populate the row, while `memberships.user_id` and
-- `profile_cards.user_id` both reference `profiles (id)`. The result: every freshly
-- signed-in user had an auth.users row and no profiles row, so
-- app_create_organization() raised foreign_key_violation for 100% of new accounts —
-- surfaced to the user as OrgNewClient's generic "Could not create that organization".
--
-- A trigger on auth.users rather than an upsert in /auth/callback: OAuth, email OTP,
-- admin-created and dashboard-created users all pass through exactly one
-- INSERT INTO auth.users, so one trigger covers every entry path, including the ones
-- added later. A callback-side upsert needs two call sites today and silently misses
-- the next provider someone wires up.
--
-- SECURITY DEFINER is load-bearing, not decoration: at insert time the acting role is
-- supabase_auth_admin and there is no auth.uid() yet, so the profiles_insert_own policy
-- cannot be satisfied by any caller. The function runs as the profiles owner instead.

create or replace function app_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into profiles (id, display_name, timezone)
  values (
    new.id,
    -- Google supplies full_name (and name); email OTP supplies neither, so fall
    -- through to the email local part. Each candidate is nullif(btrim(...))'d so a
    -- whitespace-only metadata value can't satisfy the NOT NULL with a blank name.
    coalesce(
      nullif(btrim(coalesce(meta ->> 'full_name', '')), ''),
      nullif(btrim(coalesce(meta ->> 'name', '')), ''),
      nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
      'Practitioner'
    ),
    -- The browser's IANA zone isn't knowable server-side at signup. UTC is the honest
    -- placeholder; /account lets the person correct it.
    coalesce(nullif(btrim(coalesce(meta ->> 'timezone', '')), ''), 'UTC')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function app_handle_new_user() from public;

-- Postgres checks EXECUTE on a trigger function at CREATE TRIGGER time, not at fire
-- time, so the revoke above does not stop the trigger from running.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_handle_new_user();

-- Backfill anyone who signed up before this migration. A no-op on a project with zero
-- users, but not a no-op if someone signs in during the rollout window. The insert
-- cascades into profile_cards via the existing trg_sync_profile_card.
insert into profiles (id, display_name, timezone)
select
  u.id,
  coalesce(
    nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(btrim(coalesce(u.raw_user_meta_data ->> 'name', '')), ''),
    nullif(btrim(split_part(coalesce(u.email, ''), '@', 1)), ''),
    'Practitioner'
  ),
  'UTC'
from auth.users u
left join profiles p on p.id = u.id
where p.id is null;
