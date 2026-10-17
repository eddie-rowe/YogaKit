# Data Model: Daily Sadhana

Six new tables, one data file, one IndexedDB store. This document is design only: no
migration is applied by the issue that adds it. The migration itself (T009+) is RLS and
stays `auto/needs-human`.

**Decision #3, closed: no streak repair, restore, or undo, ever.** There is no table for a
mechanic that does not exist (FR-024). Nothing below stores a "broken" streak, a restored
streak, or a purchase of either.

Modelled on `supabase/migrations/20260826224207_claimed_flows.sql` and
`specs/004-sequencing-composer/data-model.md`: RLS enabled on every table, one policy per
verb, `user_id = (select auth.uid())` for self-owned rows, and the update policy carrying
both `using` and `with check`.

---

## 1. The privacy split

| Table | Class | Who can read |
|---|---|---|
| `practice_checkins` | **Signal**: date, kind, duration. No free text. | Author; a cohort teacher via `app_visible_student_ids()` |
| `practice_milestones` | **Signal** | Author; a cohort teacher via `app_visible_student_ids()` |
| `practice_reflections` | **Content**: mood, energy, note | Author only |
| `intentions` | **Content** | Author only |
| `practice_ritual_state` | **Content** | Author only |
| `practice_guidance_dismissals` | **Content** | Author only |

The content tables carry **no `org_id`, `cohort_id`, or role column**, and no policy
mentions an organization, so a teacher policy cannot be written against them without a
schema change a reviewer will see (RULE-V2, Principle VIII). `002-schema.md` section B
specified this split; this is its fill-in.

---

## 2. Tables

```sql
create table practice_checkins (
  id               uuid primary key,                       -- client-generated
  user_id          uuid not null references auth.users (id) on delete cascade,
  local_date       date not null,                          -- from resolveLocalDay(), never recomputed
  kind             text not null check (kind in ('practice', 'rest')),
  duration_minutes integer check (duration_minutes between 1 and 600),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint practice_checkins_one_per_day unique (user_id, local_date),
  constraint practice_checkins_rest_has_no_duration
    check (kind = 'practice' or duration_minutes is null),
  -- UTC+14 is the largest offset in use: a date later than that is in nobody's present.
  constraint practice_checkins_not_future
    check (local_date <= (now() at time zone 'UTC' + interval '14 hours')::date)
);
```

One row per user per day (FR-008): a second check-in the same local day is an upsert on
`(user_id, local_date)`, so no count advances twice. A day holding both a rest and a
practice is one row whose `kind` is `practice`, since practice takes precedence (FR-014); the
client writes `practice` over `rest` and never the reverse. The date column is client-set;
the only server rule is the future bound above (FR-007: no free-form dates; this is the
backstop, not the UI).

```sql
create table practice_reflections (
  checkin_id uuid primary key references practice_checkins (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  mood       smallint check (mood between 1 and 5),        -- 3-5 discrete icons (FR-001)
  energy     smallint check (energy between 1 and 5),
  note       text check (char_length(note) <= 4000),
  flow_id    uuid references flows (id) on delete set null, -- optional link (FR-003)
  updated_at timestamptz not null default now()
);

create table intentions (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  flow_id    uuid references flows (id) on delete set null,  -- the "original flow" (FR-032)
  created_at timestamptz not null default now()
);
create index intentions_user_created_idx on intentions (user_id, created_at desc);
```

`intentions` is append-only (FR-026): a revision is a new row and the policies below grant
no update and no delete. "The version active when a lapse began" (FR-027) is the latest row
with `created_at <= lapse_start`, which the index serves.

```sql
create table practice_ritual_state (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  lapse_threshold_days integer not null default 7 check (lapse_threshold_days between 2 and 90),
  answered_lapse_start date,       -- the lapse already answered: it is not shown again (FR-035)
  resting_until      date,         -- "resting, not stopping" (FR-030/031)
  updated_at         timestamptz not null default now()
);

create table practice_milestones (
  user_id      uuid not null references auth.users (id) on delete cascade,
  threshold    integer not null check (threshold in (10, 30, 90)),
  reached_on   date not null,
  acknowledged_at timestamptz,     -- null until the card is shown; one card at a time (FR-023)
  primary key (user_id, threshold)
);

create table practice_guidance_dismissals (
  user_id    uuid not null references auth.users (id) on delete cascade,
  entry_id   text not null,        -- id of a data/guidance/*.md entry
  consumed_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);
```

`practice_milestones` primary key is the "shown once" guarantee: a threshold can be
recorded once per user. `practice_guidance_dismissals` is the "consumed, never queued" rule
(FR-040): an entry that was shown or set aside has a row, and selection skips it.

---

## 3. Policies (design; every body written out)

All six tables: `alter table ... enable row level security`. Self-owned tables use the
same two expressions: `user_id = (select auth.uid())` for `using`, and the same for
`with check`.

### practice_checkins (signal)

```sql
create policy practice_checkins_select_own on practice_checkins
  for select to authenticated using (user_id = (select auth.uid()));
create policy practice_checkins_insert_own on practice_checkins
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy practice_checkins_update_own on practice_checkins
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy practice_checkins_delete_own on practice_checkins
  for delete to authenticated using (user_id = (select auth.uid()));

-- The only teacher-facing policy in the feature. app_visible_student_ids() already respects
-- cohort_enrollments.share_signals, so revoking sharing removes the rows from the next
-- query with nothing written here (FR-050, Principle VIII).
create policy practice_checkins_select_visible_student on practice_checkins
  for select to authenticated using (user_id = any (app_visible_student_ids()));
```

### practice_milestones (signal)

```sql
create policy practice_milestones_select_own on practice_milestones
  for select to authenticated using (user_id = (select auth.uid()));
create policy practice_milestones_insert_own on practice_milestones
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy practice_milestones_update_own on practice_milestones
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy practice_milestones_select_visible_student on practice_milestones
  for select to authenticated using (user_id = any (app_visible_student_ids()));
-- No delete policy: a milestone reached is not un-reached.
```

### practice_reflections (content): one policy per verb, no teacher or org policy

```sql
create policy practice_reflections_select_own on practice_reflections
  for select to authenticated using (user_id = (select auth.uid()));
create policy practice_reflections_insert_own on practice_reflections
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from practice_checkins c
                 where c.id = checkin_id and c.user_id = (select auth.uid())));
create policy practice_reflections_update_own on practice_reflections
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy practice_reflections_delete_own on practice_reflections
  for delete to authenticated using (user_id = (select auth.uid()));
```

The insert check ties a reflection to a check-in the caller owns, so a reflection cannot
be attached to someone else's row.

### intentions (content, append-only)

```sql
create policy intentions_select_own on intentions
  for select to authenticated using (user_id = (select auth.uid()));
create policy intentions_insert_own on intentions
  for insert to authenticated with check (user_id = (select auth.uid()));
-- Deliberately no update policy and no delete policy (FR-026). RLS denies by default.
```

### practice_ritual_state (content)

```sql
create policy practice_ritual_state_select_own on practice_ritual_state
  for select to authenticated using (user_id = (select auth.uid()));
create policy practice_ritual_state_insert_own on practice_ritual_state
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy practice_ritual_state_update_own on practice_ritual_state
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

### practice_guidance_dismissals (content)

```sql
create policy practice_guidance_dismissals_select_own on practice_guidance_dismissals
  for select to authenticated using (user_id = (select auth.uid()));
create policy practice_guidance_dismissals_insert_own on practice_guidance_dismissals
  for insert to authenticated with check (user_id = (select auth.uid()));
-- No update or delete: consumption is not undone (FR-040).
```

An org admin has no policy on any of these either: admin role grants nothing over a
practitioner's own record (SC-003).

---

## 4. The RULE-V5 proof (FR-056, filling `002`'s stub)

`scripts/verify-migrations.sh` gains assertions run as a cohort-teacher session for an
enrolled, sharing student:

1. `select count(*) from practice_reflections` returns **0** (no policy matches).
2. The same for `intentions`, `practice_ritual_state`, `practice_guidance_dismissals`.
3. `select count(*) from practice_checkins` for that student returns **> 0**.
4. After `app_revoke_signal_sharing`, (3) returns **0** in the next query.
5. As an org admin who is not that student's teacher, (1)-(3) all return **0**.

---

## 5. `data/sadhana/grace-budget.json`

```json
{ "size": 3, "periodDays": 30 }
```

| Field | Type | Meaning |
|---|---|---|
| `size` | integer >= 0 | Silently absent days the detail view reports as covered per period |
| `periodDays` | integer >= 1 | Length of the trailing window, in days |

Decision #4: fixed at launch, stored as data so the numbers change without a copy-lint
re-review (FR-019). The values above are the launch values and carry no UI prose. A schema
check in CI (added with the file) rejects non-integer, negative, or missing fields. The
number never appears on Today (FR-018); the streak detail reads it.

---

## 6. IndexedDB

`checkin-outbox` store, keyPath `localDate`, added at `DB_VERSION` 3. See `research.md`
section 2.
