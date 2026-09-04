-- One-time backfill: materialize normalized flows from `claimed_flows.payload`.
--
-- `claimed_flows` (20260826224207) landed whole Flow documents as jsonb because 004's
-- normalized schema did not exist yet, and its own header handed the "retire it or keep
-- it" decision to 004. The answer, recorded in DECISIONS.md: keep it, write-once, as an
-- audit trail. A claimed flow is a teacher's irreplaceable work; if this backfill gets
-- something wrong, the original document is still sitting in `payload` and the fix is a
-- second backfill rather than an apology.
--
-- This runs as the migration role, so RLS is bypassed and the owner comes from
-- `claimed_flows.user_id` rather than from `auth.uid()` — which is null here. That is the
-- only reason this is not simply a loop over `app_save_flow`.
--
-- Idempotent by construction: a `claimed_flows` row whose flow id already exists in
-- `flows` is skipped entirely, so re-running never overwrites work done since the claim.

do $backfill$
declare
  r        record;
  v_flow   jsonb;
  v_id     uuid;
  v_done   integer := 0;
  v_skip   integer := 0;
begin
  for r in select * from claimed_flows order by claimed_at loop
    -- Rows written by ClaimFlowsPrompt wrap the flow in a .krama.json envelope; the
    -- coalesce tolerates a bare flow document too rather than silently dropping it.
    v_flow := coalesce(r.payload -> 'flow', r.payload);

    -- Local ids have been `crypto.randomUUID()` since v0.1, but a hand-imported file
    -- could carry anything. A row we cannot key stays in the audit trail untouched.
    if (v_flow ->> 'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_skip := v_skip + 1;
      continue;
    end if;

    v_id := (v_flow ->> 'id')::uuid;
    if exists (select 1 from flows where id = v_id) then
      v_skip := v_skip + 1;
      continue;
    end if;

    insert into flows (id, user_id, title, schema_version, created_at, updated_at)
    values (
      v_id,
      r.user_id,
      coalesce(v_flow ->> 'title', 'Untitled flow'),
      coalesce(v_flow ->> 'schema_version', '0.1.0'),
      coalesce((v_flow ->> 'createdAt')::timestamptz, r.claimed_at),
      coalesce((v_flow ->> 'updatedAt')::timestamptz, r.claimed_at)
    );

    insert into phases (id, flow_id, name, intent_tag, position)
    select (p ->> 'id')::uuid, v_id, p ->> 'name', p ->> 'intentTag', (p ->> 'order')::integer
      from jsonb_array_elements(coalesce(v_flow -> 'phases', '[]'::jsonb)) as p;

    insert into flow_items (id, flow_id, phase_id, pose_slug, mode,
                            measure_breaths, measure_seconds, position)
    select (e ->> 'id')::uuid,
           v_id,
           nullif(e ->> 'phaseId', '')::uuid,
           e ->> 'poseSlug',
           e ->> 'mode',
           (e -> 'measure' ->> 'breaths')::integer,
           (e -> 'measure' ->> 'seconds')::integer,
           (e ->> 'order')::integer
      from jsonb_array_elements(coalesce(v_flow -> 'items', '[]'::jsonb)) as e;

    -- The note is the author-only half, and it moves into its own table here for the
    -- same reason it lives there at all (contracts/flow-sharing.md, Principle VIII).
    insert into flow_item_notes (flow_item_id, user_id, note)
    select (e ->> 'id')::uuid, r.user_id, e ->> 'note'
      from jsonb_array_elements(coalesce(v_flow -> 'items', '[]'::jsonb)) as e
     where coalesce(e ->> 'note', '') <> '';

    v_done := v_done + 1;
  end loop;

  raise notice 'claimed_flows backfill: % materialized, % skipped', v_done, v_skip;
end
$backfill$;
