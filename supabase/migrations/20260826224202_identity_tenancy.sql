-- Identity & tenancy schema (docs/design/002-schema.md §C, data-model.md).
--
-- Tables: profiles, profile_cards, organizations, memberships, invitations,
-- integration_connections. Plus the app_create_organization / app_accept_invitation
-- RPCs (contracts/org-membership-api.md) — grouped here per tasks.md T010/T011 since
-- both need the tables this migration creates.

-- ---------------------------------------------------------------------------
-- profiles — 1:1 with auth.users. Self-only.
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy profiles_select_own on profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_own on profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_delete_own on profiles
  for delete to authenticated
  using (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- profile_cards — the ONLY identity data a co-member may read. A physical table,
-- not a view: Postgres 15+ defaults views to security_invoker = false, which would
-- run a view over `profiles` as owner with RLS bypassed, silently exposing every
-- `profiles` column. Kept in sync by a trigger on `profiles` writes.
-- ---------------------------------------------------------------------------
create table profile_cards (
  user_id uuid primary key references profiles (id) on delete cascade,
  display_name text not null
);

alter table profile_cards enable row level security;

create policy profile_cards_select_self_or_co_member on profile_cards
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or user_id = any (app_co_member_ids())
  );

-- No insert/update/delete policy for any role — this table is written only by the
-- sync trigger below, which runs as the trigger owner (bypasses RLS on this table).

create or replace function app_sync_profile_card()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into profile_cards (user_id, display_name)
  values (new.id, new.display_name)
  on conflict (user_id) do update
    set display_name = excluded.display_name;
  return new;
end;
$$;

revoke execute on function app_sync_profile_card() from public;

create trigger trg_sync_profile_card
  after insert or update of display_name on profiles
  for each row
  execute function app_sync_profile_card();

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_types text[] not null,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  -- cardinality(), not array_length(x,1): array_length() returns NULL (not 0)
  -- for an empty array, and a CHECK constraint passes on NULL — '{}' would
  -- silently satisfy `array_length(org_types,1) > 0`. cardinality() returns 0.
  constraint organizations_org_types_nonempty check (cardinality(org_types) > 0),
  constraint organizations_org_types_known check (
    org_types <@ array['school', 'studio', 'certifying_body']::text[]
  )
);

alter table organizations enable row level security;

create policy organizations_select_member on organizations
  for select to authenticated
  using (id = any (app_org_ids()));

-- No direct insert/update/delete policy — organization creation goes through
-- app_create_organization() below; type widening/renaming is deferred to a later
-- feature's authorized-role RPC, not a blanket policy.

-- ---------------------------------------------------------------------------
-- memberships — one relationship, one lifecycle. A second invite unions roles
-- onto the existing row rather than duplicating (FR-007).
-- ---------------------------------------------------------------------------
create table memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  roles text[] not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint memberships_org_user_unique unique (org_id, user_id),
  -- cardinality(), not array_length() — see organizations_org_types_nonempty comment above.
  constraint memberships_roles_nonempty check (cardinality(roles) > 0),
  constraint memberships_status_known check (status in ('active', 'suspended'))
);

comment on table memberships is
  'Never ALTER TABLE memberships FORCE ROW LEVEL SECURITY. Every app_* SECURITY '
  'DEFINER helper (app_org_ids, app_is_org_member, app_has_org_role, '
  'app_co_member_ids, app_visible_student_ids) reads this table with RLS bypassed '
  'by design (docs/design/002-schema.md §A) — FORCE RLS would break all of them.';

alter table memberships enable row level security;

create policy memberships_select_co_member on memberships
  for select to authenticated
  using (org_id = any (app_org_ids()));

create policy memberships_update_authorized_role on memberships
  for update to authenticated
  using (app_has_org_role(org_id, array['owner', 'admin']))
  with check (app_has_org_role(org_id, array['owner', 'admin']));

-- No delete policy — membership removal is a status change (suspended), not a row
-- delete, so history and the last-owner trigger guard stay meaningful. No direct
-- insert policy — rows are created by app_create_organization() and
-- app_accept_invitation() below, both SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- invitations — no SELECT policy for any role, including the invitee (FR-005:
-- not discoverable, listable, or guessable). Acceptance is a definer RPC keyed on
-- the raw token, not a row read.
-- ---------------------------------------------------------------------------
create table invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  roles text[] not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  accepted_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  -- cardinality(), not array_length() — see organizations_org_types_nonempty comment above.
  constraint invitations_roles_nonempty check (cardinality(roles) > 0)
);

alter table invitations enable row level security;

-- Deliberately no policies at all: RLS enabled with zero policies means every
-- role, including the invitee, gets zero rows. Creation/acceptance both go
-- through SECURITY DEFINER RPCs below.

-- ---------------------------------------------------------------------------
-- integration_connections — modeled only, no live API calls in this feature.
-- Ciphertext column gets a column-level REVOKE so it can never reach the browser
-- even via a misconfigured client query.
-- ---------------------------------------------------------------------------
create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  provider text not null,
  encrypted_credentials text not null,
  status text not null default 'disconnected',
  created_at timestamptz not null default now(),
  constraint integration_connections_status_known check (status = 'disconnected')
);

alter table integration_connections enable row level security;

create policy integration_connections_select_authorized on integration_connections
  for select to authenticated
  using (app_has_org_role(org_id, array['owner', 'admin']));

revoke select (encrypted_credentials) on integration_connections from authenticated;

-- ---------------------------------------------------------------------------
-- app_create_organization(name, org_types) — creating an org requires an owner
-- membership that cannot yet exist; this RPC inserts both rows transactionally.
-- ---------------------------------------------------------------------------
create or replace function app_create_organization(name text, org_types text[])
returns organizations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_org organizations;
begin
  insert into organizations (name, org_types, created_by)
  values (name, org_types, (select auth.uid()))
  returning * into new_org;

  insert into memberships (org_id, user_id, roles, status)
  values (new_org.id, (select auth.uid()), array['owner'], 'active');

  return new_org;
end;
$$;

revoke execute on function app_create_organization(text, text[]) from public;
grant execute on function app_create_organization(text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- app_accept_invitation(raw_token) — SECURITY DEFINER since `invitations` has no
-- SELECT policy for anyone. A single generic error for every rejection branch,
-- deliberately not distinguishing why (FR-005's existence-leak guard).
-- ---------------------------------------------------------------------------
create or replace function app_accept_invitation(raw_token text)
returns memberships
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv invitations;
  caller_email text;
  existing memberships;
  result memberships;
begin
  select * into inv
  from invitations
  where token_hash = encode(digest(raw_token, 'sha256'), 'hex');

  if not found
    or inv.revoked_at is not null
    or inv.accepted_at is not null
    or now() > inv.expires_at
  then
    raise exception 'invitation_invalid_or_expired'
      using errcode = 'insufficient_privilege';
  end if;

  select email into caller_email
  from auth.users
  where id = (select auth.uid())
    and email_confirmed_at is not null;

  if caller_email is null or lower(caller_email) <> lower(inv.email) then
    raise exception 'invitation_invalid_or_expired'
      using errcode = 'insufficient_privilege';
  end if;

  select * into existing
  from memberships
  where org_id = inv.org_id
    and user_id = (select auth.uid());

  if found then
    update memberships
      set roles = (
        select coalesce(array_agg(distinct r), '{}'::text[])
        from unnest(existing.roles || inv.roles) as r
      )
      where id = existing.id
      returning * into result;
  else
    insert into memberships (org_id, user_id, roles, status)
    values (inv.org_id, (select auth.uid()), inv.roles, 'active')
    returning * into result;
  end if;

  update invitations set accepted_at = now() where id = inv.id;

  return result;
end;
$$;

revoke execute on function app_accept_invitation(text) from public;
grant execute on function app_accept_invitation(text) to authenticated;
