-- RLS helper functions (docs/design/002-schema.md §A).
--
-- NextMove's get_user_business_id() assumes one org per user and does not transfer to
-- Krama's many-to-many org graph. A naive policy on `memberships` that queries
-- `memberships` directly raises `42P17 infinite recursion detected in policy`. The fix:
-- every helper here is SECURITY DEFINER, so it reads `memberships` with RLS bypassed
-- (migrations run as `postgres`); a policy whose body is only a function call never
-- references `memberships` directly, so the planner never re-enters the policy.
--
-- Three rules every helper below follows (violating any one reopens the hole):
--   1. Never `ALTER TABLE memberships FORCE ROW LEVEL SECURITY` — see the COMMENT ON
--      TABLE warning added in the identity/tenancy migration.
--   2. `SET search_path = public, pg_temp` on every definer function, or a caller able
--      to create objects earlier on the search path hijacks the definer's privileges.
--   3. `REVOKE EXECUTE ... FROM public; GRANT EXECUTE ... TO authenticated;` on every
--      helper — granted to `public` means granted to `anon` too.
--
-- Helpers return `uuid[]`/`boolean`, never `SETOF uuid`, so `org_id = ANY(app_org_ids())`
-- evaluates once per query as an InitPlan rather than once per row. Every `auth.uid()`
-- reference is wrapped `(SELECT auth.uid())` for the same planner reason.

-- Orgs the caller belongs to (active memberships only).
create or replace function app_org_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(org_id), '{}'::uuid[])
  from memberships
  where user_id = (select auth.uid())
    and status = 'active'
$$;

revoke execute on function app_org_ids() from public;
grant execute on function app_org_ids() to authenticated;

-- Orgs where the caller holds at least one of the given roles.
create or replace function app_org_ids_with_role(target_roles text[])
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(org_id), '{}'::uuid[])
  from memberships
  where user_id = (select auth.uid())
    and status = 'active'
    and roles && target_roles
$$;

revoke execute on function app_org_ids_with_role(text[]) from public;
grant execute on function app_org_ids_with_role(text[]) to authenticated;

-- Membership check for a specific org.
create or replace function app_is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from memberships
    where org_id = target_org_id
      and user_id = (select auth.uid())
      and status = 'active'
  )
$$;

revoke execute on function app_is_org_member(uuid) from public;
grant execute on function app_is_org_member(uuid) to authenticated;

-- Role check for a specific org.
create or replace function app_has_org_role(target_org_id uuid, target_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from memberships
    where org_id = target_org_id
      and user_id = (select auth.uid())
      and status = 'active'
      and roles && target_roles
  )
$$;

revoke execute on function app_has_org_role(uuid, text[]) from public;
grant execute on function app_has_org_role(uuid, text[]) to authenticated;

-- User IDs sharing any active org membership with the caller — used by profile_cards'
-- read policy so co-members can see each other's display name/avatar.
create or replace function app_co_member_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(distinct m2.user_id), '{}'::uuid[])
  from memberships m1
  join memberships m2 on m2.org_id = m1.org_id and m2.status = 'active'
  where m1.user_id = (select auth.uid())
    and m1.status = 'active'
$$;

revoke execute on function app_co_member_ids() from public;
grant execute on function app_co_member_ids() to authenticated;

-- Students whose *signals* (never content — see docs/design/002-schema.md §B) the
-- caller may read as a cohort teacher, respecting `cohort_enrollments.share_signals`.
--
-- STUB: `cohort_enrollments` and `cohort_teachers` do not exist until the cohorts
-- migration (T012, supabase/migrations/<later-ts>_cohorts.sql). This stub always
-- returns an empty array so nothing is visible until that migration lands, and is
-- replaced there via CREATE OR REPLACE with the real join once those tables exist.
-- Forward-referencing tables here would fail at CREATE FUNCTION time even for
-- LANGUAGE SQL, since Postgres resolves catalog references at definition time.
create or replace function app_visible_student_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select '{}'::uuid[]
$$;

revoke execute on function app_visible_student_ids() from public;
grant execute on function app_visible_student_ids() to authenticated;
