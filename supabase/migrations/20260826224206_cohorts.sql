-- Cohorts (docs/design/002-schema.md §C, data-model.md).
--
-- Tables: cohorts, cohort_enrollments (carries share_signals — the Principle VIII
-- revocation row, created here ahead of 005's content tables), cohort_teachers.
-- Plus app_grant_ytt_completion() (contracts/org-membership-api.md, T012).
--
-- Also redefines app_visible_student_ids() (stubbed in the helper-functions
-- migration, 20260826224201) now that cohort_enrollments/cohort_teachers exist.

create table cohorts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  kind text not null,
  grant_days_on_completion int not null default 90,
  created_at timestamptz not null default now()
);

alter table cohorts enable row level security;

create policy cohorts_select_org_member on cohorts
  for select to authenticated
  using (org_id = any (app_org_ids()));

create policy cohorts_insert_authorized_role on cohorts
  for insert to authenticated
  with check (app_has_org_role(org_id, array['owner', 'admin', 'teacher']));

create policy cohorts_update_authorized_role on cohorts
  for update to authenticated
  using (app_has_org_role(org_id, array['owner', 'admin', 'teacher']))
  with check (app_has_org_role(org_id, array['owner', 'admin', 'teacher']));

create table cohort_enrollments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'enrolled',
  graduated_at timestamptz,
  share_signals boolean not null default true,
  created_at timestamptz not null default now(),
  constraint cohort_enrollments_cohort_user_unique unique (cohort_id, user_id),
  constraint cohort_enrollments_status_known check (status in ('enrolled', 'graduated'))
);

alter table cohort_enrollments enable row level security;

-- The enrolled student can always see and manage their own enrollment row,
-- including flipping share_signals — the one-interaction revocation Principle
-- VIII requires.
create policy cohort_enrollments_select_self on cohort_enrollments
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy cohort_enrollments_update_self on cohort_enrollments
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A cohort's teachers/admins/owners can see enrollment status (signal, not
-- content) for cohorts in their org.
create policy cohort_enrollments_select_org_role on cohort_enrollments
  for select to authenticated
  using (
    exists (
      select 1
      from cohorts c
      where c.id = cohort_enrollments.cohort_id
        and app_has_org_role(c.org_id, array['owner', 'admin', 'teacher'])
    )
  );

create policy cohort_enrollments_insert_authorized_role on cohort_enrollments
  for insert to authenticated
  with check (
    exists (
      select 1
      from cohorts c
      where c.id = cohort_enrollments.cohort_id
        and app_has_org_role(c.org_id, array['owner', 'admin', 'teacher'])
    )
  );

create table cohort_teachers (
  cohort_id uuid not null references cohorts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  primary key (cohort_id, user_id)
);

alter table cohort_teachers enable row level security;

create policy cohort_teachers_select_org_member on cohort_teachers
  for select to authenticated
  using (
    exists (
      select 1
      from cohorts c
      where c.id = cohort_teachers.cohort_id
        and c.org_id = any (app_org_ids())
    )
  );

create policy cohort_teachers_insert_authorized_role on cohort_teachers
  for insert to authenticated
  with check (
    exists (
      select 1
      from cohorts c
      where c.id = cohort_teachers.cohort_id
        and app_has_org_role(c.org_id, array['owner', 'admin'])
    )
  );

-- ---------------------------------------------------------------------------
-- Redefine app_visible_student_ids() now that cohort_enrollments/cohort_teachers
-- exist. Respects share_signals: a student who revokes disappears from every
-- teacher's query immediately (Principle VIII, one-interaction revocation).
--
-- "Teacher" here means: holds an org-wide teacher/admin/owner role for the
-- cohort's org, OR is explicitly listed in cohort_teachers for that cohort.
-- ---------------------------------------------------------------------------
create or replace function app_visible_student_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(distinct ce.user_id), '{}'::uuid[])
  from cohort_enrollments ce
  join cohorts c on c.id = ce.cohort_id
  where ce.share_signals = true
    and (
      c.org_id = any (app_org_ids_with_role(array['owner', 'admin', 'teacher']))
      or exists (
        select 1
        from cohort_teachers ct
        where ct.cohort_id = ce.cohort_id
          and ct.user_id = (select auth.uid())
      )
    )
$$;

-- ---------------------------------------------------------------------------
-- app_grant_ytt_completion(cohort_id, user_id) — idempotent (FR-011): a second
-- call on an already-graduated enrollment is a no-op, no re-grant, no window
-- extension.
-- ---------------------------------------------------------------------------
create or replace function app_grant_ytt_completion(cohort_id uuid, user_id uuid)
returns entitlement_grants
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_cohort cohorts;
  enrollment cohort_enrollments;
  existing_grant entitlement_grants;
  new_grant entitlement_grants;
  authorized boolean;
  -- Local copies of the parameters: `cohort_id`/`user_id` are also column names
  -- on every table this function queries, and plpgsql's default
  -- `variable_conflict = error` setting raises "column reference is ambiguous"
  -- at runtime if the bare parameter name is used inside a SQL statement that
  -- also has a same-named column in scope. Aliasing sidesteps it without
  -- renaming the parameters themselves, which would break the RPC's named-
  -- argument contract (contracts/org-membership-api.md).
  v_cohort_id uuid := cohort_id;
  v_user_id uuid := user_id;
begin
  select * into target_cohort from cohorts where id = v_cohort_id;
  if not found then
    raise exception 'cohort not found' using errcode = 'insufficient_privilege';
  end if;

  authorized := app_has_org_role(target_cohort.org_id, array['owner', 'admin', 'teacher'])
    or exists (
      select 1
      from cohort_teachers ct
      where ct.cohort_id = v_cohort_id
        and ct.user_id = (select auth.uid())
    );

  if not authorized then
    raise exception 'not authorized for this cohort' using errcode = 'insufficient_privilege';
  end if;

  select * into enrollment
  from cohort_enrollments ce
  where ce.cohort_id = v_cohort_id
    and ce.user_id = v_user_id;

  if not found then
    raise exception 'enrollment not found' using errcode = 'insufficient_privilege';
  end if;

  if enrollment.status = 'graduated' then
    select * into existing_grant
    from entitlement_grants
    where source = 'cohort_graduation'
      and source_ref = enrollment.id
    order by created_at desc
    limit 1;
    return existing_grant;
  end if;

  update cohort_enrollments
    set status = 'graduated', graduated_at = now()
    where id = enrollment.id
    returning * into enrollment;

  insert into entitlement_grants (user_id, source, source_ref, starts_at, ends_at)
  values (
    v_user_id,
    'cohort_graduation',
    enrollment.id,
    now(),
    now() + make_interval(days => target_cohort.grant_days_on_completion)
  )
  returning * into new_grant;

  return new_grant;
end;
$$;

revoke execute on function app_grant_ytt_completion(uuid, uuid) from public;
grant execute on function app_grant_ytt_completion(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- app_revoke_signal_sharing(enrollment_id) — toggles share_signals; the student
-- must own the enrollment. Immediately changes app_visible_student_ids() output.
-- ---------------------------------------------------------------------------
create or replace function app_revoke_signal_sharing(enrollment_id uuid)
returns cohort_enrollments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result cohort_enrollments;
begin
  update cohort_enrollments
    set share_signals = not share_signals
    where id = enrollment_id
      and user_id = (select auth.uid())
    returning * into result;

  if not found then
    raise exception 'enrollment not found' using errcode = 'insufficient_privilege';
  end if;

  return result;
end;
$$;

revoke execute on function app_revoke_signal_sharing(uuid) from public;
grant execute on function app_revoke_signal_sharing(uuid) to authenticated;
