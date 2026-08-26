-- Two escalation holes RLS cannot close (docs/design/002-schema.md §C, FR-008):
-- an admin promoting themselves to owner, and removing an org's last owner.
-- Both are trigger-enforced, not policy-enforced, since a policy can't easily
-- express "unless this is the last row matching X" or "unless it's my own row".

-- trg_prevent_last_owner_removal — BEFORE UPDATE OR DELETE on memberships: raises
-- restrict_violation if the change would leave the org with zero 'owner' memberships.
create or replace function app_prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_org_id uuid;
  losing_owner boolean;
  remaining_owners int;
begin
  target_org_id := old.org_id;
  losing_owner := (
    'owner' = any (old.roles)
    and old.status = 'active'
    and (
      tg_op = 'DELETE'
      or new.status <> 'active'
      or not ('owner' = any (new.roles))
    )
  );

  if not losing_owner then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select count(*) into remaining_owners
  from memberships
  where org_id = target_org_id
    and status = 'active'
    and 'owner' = any (roles)
    and id <> old.id;

  if remaining_owners = 0 then
    raise exception 'cannot remove the last owner of an organization'
      using errcode = 'restrict_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function app_prevent_last_owner_removal() from public;

create trigger trg_prevent_last_owner_removal
  before update or delete on memberships
  for each row
  execute function app_prevent_last_owner_removal();

-- trg_prevent_self_escalation — BEFORE UPDATE on memberships: raises
-- insufficient_privilege if the caller is adding 'owner' to their own row. An
-- existing owner (or a service-role-driven process) may still grant ownership to
-- others; only granting it to *oneself* via this path is blocked.
create or replace function app_prevent_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id = (select auth.uid())
    and not ('owner' = any (old.roles))
    and 'owner' = any (new.roles)
  then
    raise exception 'cannot grant yourself the owner role'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

revoke execute on function app_prevent_self_escalation() from public;

create trigger trg_prevent_self_escalation
  before update on memberships
  for each row
  execute function app_prevent_self_escalation();
