-- Phase 4 (US2): membership role/status changes + invitation creation
-- (contracts/org-membership-api.md "Membership role/status changes" + "POST
-- (application-level) — create invitation"). tasks.md T037-T040.
--
-- app_create_invitation is SECURITY DEFINER because `invitations` has zero RLS
-- policies for any role (20260826224201_identity_tenancy.sql) — a plain INSERT
-- from an RLS-scoped client, even the org owner's own, is impossible by design.
-- app_set_membership_roles/app_set_membership_status could in principle rely on
-- the existing memberships_update_authorized_role policy (owner/admin) plus the
-- Phase 2 escalation triggers, but are still exposed as RPCs to match the
-- contract's named operations and keep the "authorized role" check in one place
-- rather than duplicated across every future caller.

-- ---------------------------------------------------------------------------
-- app_set_membership_roles(membership_id, roles) — caller must hold an
-- authorized role (owner) in the target membership's org. The existing
-- trg_prevent_last_owner_removal / trg_prevent_self_escalation triggers
-- (20260826224204_org_escalation_triggers.sql) fire on this UPDATE regardless
-- of caller, so this function only needs its own authorization check.
-- ---------------------------------------------------------------------------
create or replace function app_set_membership_roles(membership_id uuid, new_roles text[])
returns memberships
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_org_id uuid;
  result memberships;
begin
  select org_id into target_org_id from memberships where id = membership_id;

  if target_org_id is null or not app_has_org_role(target_org_id, array['owner']) then
    raise exception 'insufficient_privilege to change membership roles'
      using errcode = 'insufficient_privilege';
  end if;

  update memberships set roles = new_roles
    where id = membership_id
    returning * into result;

  return result;
end;
$$;

revoke execute on function app_set_membership_roles(uuid, text[]) from public;
grant execute on function app_set_membership_roles(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- app_set_membership_status(membership_id, status) — same authorization shape.
-- A suspended membership drops out of app_org_ids()/app_visible_student_ids()
-- immediately (those helpers already filter on status = 'active').
-- ---------------------------------------------------------------------------
create or replace function app_set_membership_status(membership_id uuid, new_status text)
returns memberships
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_org_id uuid;
  result memberships;
begin
  if new_status not in ('active', 'suspended') then
    raise exception 'unknown membership status: %', new_status
      using errcode = 'check_violation';
  end if;

  select org_id into target_org_id from memberships where id = membership_id;

  if target_org_id is null or not app_has_org_role(target_org_id, array['owner']) then
    raise exception 'insufficient_privilege to change membership status'
      using errcode = 'insufficient_privilege';
  end if;

  update memberships set status = new_status
    where id = membership_id
    returning * into result;

  return result;
end;
$$;

revoke execute on function app_set_membership_status(uuid, text) from public;
grant execute on function app_set_membership_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- app_create_invitation(target_org_id, target_email, target_roles) — the raw
-- token is returned once, in the RPC result, and never written to any table
-- (FR-005). Idempotent re-invite: a still-pending invitation for the same
-- (org_id, email) is updated in place instead of duplicated.
-- ---------------------------------------------------------------------------
create or replace function app_create_invitation(
  target_org_id uuid,
  target_email text,
  target_roles text[]
)
returns table (invitation_id uuid, raw_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  generated_token text;
  new_expires_at timestamptz := now() + interval '7 days';
  existing_id uuid;
  result_id uuid;
begin
  if not app_has_org_role(target_org_id, array['owner']) then
    raise exception 'insufficient_privilege to invite to this organization'
      using errcode = 'insufficient_privilege';
  end if;

  if cardinality(target_roles) = 0 then
    raise exception 'roles must not be empty'
      using errcode = 'check_violation';
  end if;

  generated_token := encode(gen_random_bytes(32), 'hex');

  select id into existing_id
  from invitations
  where org_id = target_org_id
    and lower(email) = lower(target_email)
    and revoked_at is null
    and accepted_at is null
    and now() <= invitations.expires_at;

  if existing_id is not null then
    update invitations
      set roles = target_roles,
        expires_at = new_expires_at,
        token_hash = encode(digest(generated_token, 'sha256'), 'hex')
      where id = existing_id
      returning id into result_id;
  else
    insert into invitations (org_id, email, roles, token_hash, expires_at, created_by)
    values (
      target_org_id,
      target_email,
      target_roles,
      encode(digest(generated_token, 'sha256'), 'hex'),
      new_expires_at,
      (select auth.uid())
    )
    returning id into result_id;
  end if;

  return query select result_id, generated_token, new_expires_at;
end;
$$;

revoke execute on function app_create_invitation(uuid, text, text[]) from public;
grant execute on function app_create_invitation(uuid, text, text[]) to authenticated;
