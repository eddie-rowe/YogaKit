# Implement Spec

Executes tasks from `tasks.md` phase by phase, writing code, tests, and migrations.

**Spec**: $ARGUMENTS (folder name like `001-daily-priority-briefing`, or empty for most recent)

---

## Pre-flight

Before writing any code, verify:

1. Read `specs/$ARGUMENTS/tasks.md` — find the first incomplete task (`- [ ]`)
2. Read `specs/$ARGUMENTS/plan.md` — confirm the constitution check table has no ❌
3. Read `specs/$ARGUMENTS/analyze.md` output (if it exists) — confirm no BLOCKERs
4. Read `.specify/memory/constitution.md`

If there is a `/tools:speckit:analyze` BLOCKER unresolved, stop and report it. Do not implement past a blocker.

---

## Execution loop

For each incomplete task in the current phase (stop at the phase gate task):

### For each task

**1. Read the task definition**
- Note the file path, description, TDD tag, dependencies, acceptance criteria

**2. Resolve dependencies**
- If the task has `Depends on: TXXX`, verify TXXX is marked `[x]`. If not, switch to TXXX first.

**3. TDD gate (if `[TDD]`)**
- Write the failing test first at the path specified in the task
- Run `npm test -- --run path/to/test.ts` and confirm it fails with a meaningful error (not a syntax error)
- Commit the failing test: `git add tests/... && git commit -m "test(scope): add failing test for TXXX"`

**4. Implement**
- Write the minimum code to make the test pass
- For UpNext reuse tasks: copy the file first, then adapt as the plan specifies
- For new files: follow the project structure from plan.md exactly
- Do not add error handling, fallbacks, or validation for scenarios not in the spec
- Do not add comments unless the WHY is non-obvious

**5. Verify**
- Run `npx tsc --noEmit` — zero type errors
- Run `npm test -- --run path/to/relevant/tests` — green
- For API endpoints: use `curl` against the local server per the quickstart

**6. Observability check (constitution Principle VI)**
- If the task is an Inngest function: confirm `logScope` is called
- If the task calls an external provider: confirm a Datadog metric is emitted

**7. Mark complete**
- Change `- [ ]` to `- [x]` in `tasks.md`
- `git add src/... tests/... specs/.../tasks.md && git commit -m "feat(scope): TXXX — brief description"`

---

## Phase gate

When all tasks in a phase are `[x]`, run the gate task:

```bash
npm test && npx tsc --noEmit && npm run lint
```

If all pass: mark the gate task `[x]` and commit.  
If any fail: fix the failing test or type error before marking the gate. Do not skip.

---

## MVP stop

When the task list contains:
```
<!-- MVP STOP: Tasks above this line constitute Phase 1 MVP. -->
```

Stop at that comment. Report: "Phase 1 MVP tasks complete. Validate with design partners before proceeding to Phase 2."

---

## Patterns to watch for

**Inngest fan-out**: The nightly sync fires one `sync/business.process` event per business. Never loop inside a single function step — always fan out via events.

**Action tokens**: Use `crypto.randomBytes(32).toString('base64url')` — never JWT. Verify server-side against the DB; do not attempt stateless verification.

**RLS**: Every new query to a table that has RLS must go through the Supabase client with the user's auth context, not the service-role client, unless it's a background job that uses explicit `business_id` filtering.

**UpNext copy tasks**: After copying, run `grep -r "org_id" src/` and replace with `business_id`. Run `grep -r "get_user_org_id" src/` and replace with `get_user_business_id`.

**React Email**: Templates live in `src/emails/`. The `render()` call from `@react-email/render` must happen in the delivery service, not in the Inngest function — keep functions thin.

---

## Reporting

After each phase gate, output:
- Tasks completed this session (list T-numbers)
- Test coverage delta (if measurable)
- Any unexpected findings or spec gaps discovered during implementation
- Next tasks (first incomplete task of the next phase)
