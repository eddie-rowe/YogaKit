-- 005 C1: the sadhana schema and its RLS (tasks T009-T014).
--
-- Six tables, written out from specs/005-daily-sadhana/data-model.md, which carries the
-- design and every policy body. This file is a translation of that document; the one
-- place it is not a verbatim translation is marked DEVIATION below and listed in the PR.
--
-- THE PRIVACY SPLIT is the whole point of this migration (Principle VIII, RULE-V1/V2/V5):
--
--   signals  practice_checkins, practice_milestones
--            date, kind, duration, threshold. No free text. A cohort teacher may read these,
--            and only through app_visible_student_ids(), which already honours
--            cohort_enrollments.share_signals -- so revoking sharing removes the rows from the
--            very next query with nothing written here.
--
--   content  practice_reflections, intentions, practice_ritual_state,
--            practice_guidance_dismissals
--            mood, energy, notes, intentions. Author only. These tables carry NO org_id,
--            cohort_id or role column, and NO policy mentions an organization, a cohort, a
--            teacher or an admin. The absence is the guarantee: a teacher policy cannot be
--            added later without a schema change a reviewer will see. scripts/verify-migrations.sh
--            asserts the absence structurally, not just behaviourally.
--
-- Decision #3, closed: there is no streak repair, restore or undo -- so there is no table for
-- one (FR-024). Nothing below stores a "broken" streak.
--
-- Modelled on 20260826224207_claimed_flows.sql: RLS on every table, one policy per verb,
-- `user_id = (select auth.uid())`, and every write policy carrying `with check`. Like the
-- rest of this repo it relies on Supabase's default privileges rather than explicit table
-- grants, and it sets no updated_at triggers (the client writes updated_at).

-- ---------------------------------------------------------------------------
-- practice_checkins -- SIGNAL
-- ---------------------------------------------------------------------------
create table practice_checkins (
  id               uuid primary key,                       -- client-generated, so an offline write is idempotent
  user_id          uuid not null references auth.users (id) on delete cascade,
  local_date       date not null,                          -- from resolveLocalDay() at submission; never recomputed
  kind             text not null check (kind in ('practice', 'rest')),
  duration_minutes integer check (duration_minutes between 1 and 600),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- One row per user per day (FR-008): a second check-in the same local day is an upsert on
  -- (user_id, local_date), so no count can advance twice.
  constraint practice_checkins_one_per_day unique (user_id, local_date),
  constraint practice_checkins_rest_has_no_duration
    check (kind = 'practice' or duration_minutes is null),
  -- UTC+14 is the largest offset in use, so a date later than that is in nobody's present.
  -- The server-side backstop for FR-007 (no free-form dates); the UI is the real control.
  constraint practice_checkins_not_future
    check (local_date <= ((now() at time zone 'UTC') + interval '14 hours')::date)
);

alter table practice_checkins enable row level security;

create policy practice_checkins_select_own on practice_checkins
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy practice_checkins_insert_own on practice_checkins
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy practice_checkins_update_own on practice_checkins
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy practice_checkins_delete_own on practice_checkins
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- The only teacher-facing policy on a check-in (T014). app_visible_student_ids() is
-- 002's helper and already respects share_signals; see the PR for what it does and does
-- not include.
create policy practice_checkins_select_visible_student on practice_checkins
  for select to authenticated
  using (user_id = any (app_visible_student_ids()));

-- ---------------------------------------------------------------------------
-- practice_reflections -- CONTENT. One policy per verb. No teacher, org or admin policy.
-- ---------------------------------------------------------------------------
create table practice_reflections (
  checkin_id uuid primary key references practice_checkins (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  mood       smallint check (mood between 1 and 5),         -- 3-5 discrete icons, no slider (FR-001)
  energy     smallint check (energy between 1 and 5),
  note       text check (char_length(note) <= 4000),
  flow_id    uuid references flows (id) on delete set null, -- optional link (FR-003)
  updated_at timestamptz not null default now()
);

alter table practice_reflections enable row level security;

create policy practice_reflections_select_own on practice_reflections
  for select to authenticated
  using (user_id = (select auth.uid()));

-- The insert check ties a reflection to a check-in the caller owns, so a reflection cannot
-- be attached to someone else's row.
create policy practice_reflections_insert_own on practice_reflections
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from practice_checkins c
       where c.id = checkin_id and c.user_id = (select auth.uid())
    )
  );

-- DEVIATION 1 (hardening): data-model.md gives this policy only `user_id = auth.uid()` in its
-- `with check`. That leaves a hole in the guarantee the insert policy states: checkin_id is
-- the primary key and is updatable, and a foreign-key check bypasses RLS, so a caller could
-- `update practice_reflections set checkin_id = <another user's check-in>` and re-point their
-- own reflection at it. No content leaks -- the row stays user_id = caller and no one else can
-- read it -- but it would attach a foreign row to a stranger's check-in and make it cascade
-- with theirs. Repeating the ownership test here makes "a reflection cannot be attached to
-- someone else's row" true on update as well as insert.
create policy practice_reflections_update_own on practice_reflections
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from practice_checkins c
       where c.id = checkin_id and c.user_id = (select auth.uid())
    )
  );

create policy practice_reflections_delete_own on practice_reflections
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- intentions -- CONTENT, append-only (FR-026)
-- ---------------------------------------------------------------------------
create table intentions (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  flow_id    uuid references flows (id) on delete set null,  -- the "original flow" (FR-032)
  created_at timestamptz not null default now()
);

-- "The version active when a lapse began" (FR-027) is the latest row with
-- created_at <= lapse_start; this index serves that lookup.
create index intentions_user_created_idx on intentions (user_id, created_at desc);

alter table intentions enable row level security;

create policy intentions_select_own on intentions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy intentions_insert_own on intentions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Deliberately NO update policy and NO delete policy (FR-026): a revision is a new row.
-- RLS denies by default, so there is nothing to write -- and the harness asserts that an
-- UPDATE or DELETE changes zero rows rather than trusting this comment.

-- ---------------------------------------------------------------------------
-- practice_ritual_state -- CONTENT (lapse tracking for the return card)
-- ---------------------------------------------------------------------------
create table practice_ritual_state (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  lapse_threshold_days integer not null default 7 check (lapse_threshold_days between 2 and 90),
  answered_lapse_start date,   -- the lapse already answered: it is not shown again (FR-035)
  resting_until        date,   -- "resting, not stopping" (FR-030/031)
  updated_at           timestamptz not null default now()
);

alter table practice_ritual_state enable row level security;

create policy practice_ritual_state_select_own on practice_ritual_state
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy practice_ritual_state_insert_own on practice_ritual_state
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy practice_ritual_state_update_own on practice_ritual_state
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- practice_milestones -- SIGNAL
-- ---------------------------------------------------------------------------
create table practice_milestones (
  user_id         uuid not null references auth.users (id) on delete cascade,
  threshold       integer not null check (threshold in (10, 30, 90)),
  reached_on      date not null,
  acknowledged_at timestamptz,   -- null until the card is shown; one card at a time (FR-023)
  -- The "shown once" guarantee: a threshold is recorded at most once per user.
  primary key (user_id, threshold)
);

alter table practice_milestones enable row level security;

create policy practice_milestones_select_own on practice_milestones
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy practice_milestones_insert_own on practice_milestones
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy practice_milestones_update_own on practice_milestones
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy practice_milestones_select_visible_student on practice_milestones
  for select to authenticated
  using (user_id = any (app_visible_student_ids()));

-- No delete policy: a milestone reached is not un-reached.

-- ---------------------------------------------------------------------------
-- practice_guidance_dismissals -- CONTENT (consumed triggers, FR-040)
-- ---------------------------------------------------------------------------
create table practice_guidance_dismissals (
  user_id     uuid not null references auth.users (id) on delete cascade,
  entry_id    text not null,   -- id of a data/guidance/*.md entry
  consumed_at timestamptz not null default now(),
  -- "Consumed, never queued" (FR-040): shown-or-set-aside has a row, and selection skips it.
  primary key (user_id, entry_id)
);

alter table practice_guidance_dismissals enable row level security;

create policy practice_guidance_dismissals_select_own on practice_guidance_dismissals
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy practice_guidance_dismissals_insert_own on practice_guidance_dismissals
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- No update and no delete: consumption is not undone (FR-040).
--
-- An org admin has no policy on any content table either: the admin role grants nothing
-- over a practitioner's own record (SC-003).
