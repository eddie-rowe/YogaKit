-- pose_favourites and pose_notes (003 US6a, specs/003-pose-library/data-model.md §5,
-- contracts/pose-personalization.md). Modelled on
-- supabase/migrations/20260826224207_claimed_flows.sql:11-36.
--
-- Deliberately absent from both tables (contracts/pose-personalization.md, "Three
-- deliberate absences"): no org_id/cohort_id/visibility column (RULE-V2 — the absence
-- is the guarantee that a private pose note is practice content, never a signal); no FK
-- or CHECK on pose_slug (RULE-O6 — the pose library JSON stays the sole authority over
-- pose identity, Postgres must not become a second one); no deleted_at (a favourite or
-- note is deleted outright, cascading from auth.users on account deletion, FR-038).

create table pose_favourites (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  pose_slug  text        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, pose_slug)
);

alter table pose_favourites enable row level security;

create policy pose_favourites_select_own on pose_favourites
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy pose_favourites_insert_own on pose_favourites
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy pose_favourites_update_own on pose_favourites
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy pose_favourites_delete_own on pose_favourites
  for delete to authenticated
  using (user_id = (select auth.uid()));

create table pose_notes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  pose_slug  text        not null,
  body       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pose_slug)
);

alter table pose_notes enable row level security;

create policy pose_notes_select_own on pose_notes
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy pose_notes_insert_own on pose_notes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy pose_notes_update_own on pose_notes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy pose_notes_delete_own on pose_notes
  for delete to authenticated
  using (user_id = (select auth.uid()));
