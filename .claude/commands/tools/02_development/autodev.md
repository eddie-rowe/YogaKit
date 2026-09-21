---
model: sonnet
description: Autonomous Dev Sweep
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# /autodev - Autonomous Dev Sweep

Build the `ready-for-dev` issues `/autopm` produced, ending at **auto-merged
PRs on `main`**. PRs that pass CI auto-merge without human intervention.

Daily development routine in the autonomous loop. Read
[`docs/planning/routines.md`](../../../../docs/planning/routines.md) for the
schedule, shared conventions, and the merge gate.

Scheduled slot: **~09:00 UTC**, after `/tools:01_project_management:autopm`
(07:00). No scheduler runs this today — it is hand-launched
(`007-autonomous-operations` owns the scheduler, not yet built).

## Operating context

The owner (eddie-rowe) is reachable. This routine still runs unattended and
**never calls `AskUserQuestion`** — the point is to keep the dev lane moving
without waiting on a same-day answer, not because nobody is there. Every
quality gate stays intact (tests-first-with-proof, acceptance-criteria review,
required feature browser-validation, constitution check). Prefer feature work
(Tier 1→3) over tech-debt, within the 3-issue cap below. **Bounded delegation:**
if you delegate a build to a background agent, run it foreground-style and
treat "no result within ~15 min" as a failure for that issue — always
self-review the diff before merge, and never end a session waiting on a
possibly-hung agent.

## Conventions (from the suite standard)

- **MCP-native, headless — no full dev environment.** GitHub via
  `mcp__github__*` (repo `eddie-rowe/YogaKit`), never `gh`. There is **no
  Docker, no local Supabase, no `nektos/act`**, so this routine does not run
  `/tools:02_development:up`, `/down`, or `/test`'s act flow. Do **not** fall
  back to the `gh`/`git checkout`-based `/merge`, `/review`, or `/dev`
  helpers — they assume an interactive shell and will stall in a headless
  session.
- **Fully autonomous.** Never call `AskUserQuestion` and never wait for human
  input. If something is ambiguous or blocked, record it in the handoff file,
  label the issue `auto/needs-human`, and move on.
- **Tests run via package scripts** that work headless:
  ```
  npx tsc --noEmit && npm run lint:copy && npm run validate:poses && npm run lint:telemetry && npm run test:coverage
  ```
  This mirrors the repo's real CI gate (`.github/workflows/ci.yml`) — a
  failure here means the work is not finished. The friction engine and
  validator-lite carry a mandatory 100% unit-test line-coverage bar
  (Principle III); do not merge a change that drops it.
- **Constitution check is mandatory, not optional, for any change touching the
  friction engine, validator-lite, or pose data.** The engine stays fully
  deterministic and client-side (no AI call, no DB read/write, no network
  call in its path) and never authors cues/movement names/teacher voice
  (`.specify/memory/constitution.md` v3.0.0, Principle III). Reject a diff
  that violates this rather than opening a PR for it.
- **Validate by driving the live app, not by writing new E2E test files.**
  This routine **must not author new Playwright specs** under `tests/e2e-qa/`
  (`playwright.config.qa.ts`) — that suite is human-maintained. Instead, use
  the `playwright-cli` skill against `TESTING_URL` to manually exercise
  whatever the change touches and capture evidence. If `TESTING_URL` is
  unset, note validation as **deferred to a full-env run**; never fake a pass.
- **Labels:** open PRs `ready-for-review`; failures escalate as
  `auto/dev-failure`.
- **Autonomy boundary:** merge green PRs automatically via GitHub auto-merge
  after the auto-review. Skip sensitive files (migrations touching
  DROP/RENAME, backfills, RLS, auth, Stripe billing) unless `auto-ok`.
- **Commit before idle.** Before an agent reports idle or complete, commit all
  changes on the feature branch. If the gate has not been run yet, commit with
  a `[WIP]` prefix. Never leave a worktree with unstaged or uncommitted work —
  in a headless run there is no recovery.

## Inputs

- Open issues labeled `ready-for-dev` (from
  `/tools:01_project_management:autopm`), via `mcp__github__list_issues`.
- `### Codebase Area` on each (parallel vs sequential).
- `auto-ok` clearance for sensitive files.

## Execution

### 1. Select work (bounded)

List open `ready-for-dev` issues. Apply guardrails:

- **Cap** at 3 issues/run.
- **Skip** anything touching DROP/RENAME migrations, data backfills, RLS,
  auth, or Stripe billing unless it carries `auto-ok`; leave those
  `auto/needs-human` and note them. Additive migrations (new
  table/column/index) with `auto-ok` are fine.
- **Path:** parallel when issues touch different `### Codebase Area`s,
  sequential when coupled (esp. anything touching the friction engine,
  validator-lite, or pose-library schema — keep these serial to avoid
  conflicting edits to the shared weights constant).

No eligible `ready-for-dev` issues → do NOT exit yet: run Step 1a/1b below.

### 1a. Land prior-run PRs that are now green (FIRST — before building anything)

Because Step 4 does a bounded in-session CI wait and moves on rather than
hanging, a PR whose CI went green *after* the previous sweep left it can sit
open and unmerged. **At the start of every sweep, before building new work,**
list open `autodev/*` PRs from prior runs (`mcp__github__list_pull_requests`).
For each that is now **CI-green and mergeable**, squash-merge it (same rules
as Step 4). This is how "let the next day's sweep merge it" actually happens.
A PR still pending/failing is left for a later sweep (or labeled
`auto/dev-failure` if it has hard-failed). This supersedes the old "skip
issues that already have an open PR" idempotency — skip *rebuilding* the
issue, but do *merge* its green PR.

### 1b. Merge safe Dependabot PRs (connector-independent throughput)

Idle Dependabot PRs are safe throughput that turns NO-OP days into shipped
days. List open PRs with head branch `dependabot/*`
(`mcp__github__list_pull_requests`). For each:

- **Merge** (squash) only if: CI is fully green AND it is a **non-major**
  bump (patch/minor — check the title's version delta) AND it has no merge
  conflict.
- **Skip** major bumps, any red/pending CI, and known-failing bumps noted in
  the autopm handoff — label those `auto/dev-failure` only if CI actually
  failed, else just leave them.
- Same merge rules as Step 4: squash, no poll loop.

Count merged/skipped Dependabot PRs in the handoff + routine-log line.

No eligible `ready-for-dev` issues AND no mergeable Dependabot PRs → report
"no ready-for-dev work" and exit clean.

### 2. Build each issue

MCP-native lifecycle (no `/tools:02_development:up`, no Docker):

1. **Plan** — fetch the issue (`mcp__github__issue_read`), read its
   Acceptance Criteria / Test Requirements / Spec Reference. For a `feat:`
   issue also read the referenced spec section under `specs/` and
   `.specify/memory/constitution.md`; the change must not violate the
   constitution's non-negotiables (engine determinism, engine coverage,
   Tier-1 pose completeness, practice-content RLS, no-zero-streak/no-guilt
   copy, telemetry content-free). If an issue has no acceptance criteria, add
   them from the spec before building (don't build a feature you can't
   verify).
2. **Tests first, WITH PROOF (Red)** — write the vitest test(s) from Test
   Requirements, run them, and **confirm they fail with a meaningful error**
   (not a typo/import error). Commit the failing test first. A test that
   passes before you've implemented anything is not testing the change.
3. **Implement** — make the change until the tests pass (Green).
4. **Gate** — run, and require green:
   ```
   npx tsc --noEmit && npm run lint:copy && npm run validate:poses && npm run lint:telemetry && npm run test:coverage
   ```
   A failure stops *this* issue (don't open a PR for failing work); continue
   to the next.
5. **Browser-validate with `playwright-cli`.** For a `feat:` issue this is
   **REQUIRED, not deferrable**: drive the deployed app
   (`TESTING_URL`), exercise the affected flow against the issue's
   Acceptance Criteria, and attach snapshot/screenshot evidence to the PR
   body. If the browser can't launch or `TESTING_URL` is unset, fall back to
   a headless assertion against Supabase/`pup` where possible; only if NO
   verification path exists, label the PR `auto/needs-human` (do NOT
   auto-merge an unverified feature). **Never fake a pass, never write new
   Playwright specs under `tests/e2e-qa/`.** (Security/tech-debt/Dependabot
   fixes may still defer browser validation as before.)

### 3. Reflect

Capture session patterns/learnings to
`docs/planning/retro/YYYY-MM-DD-reflection-<issue>.md` and commit on the
feature branch. `/tools:01_project_management:autoretro` reads these tonight.

### 4. Open PR + auto-review + merge

- Commit to a feature branch, push, open the PR with
  `mcp__github__create_pull_request`, label `ready-for-review`. Body includes
  the plan summary, the deferred-E2E note, and `Closes #<issue_number>` so the
  issue auto-closes on merge.
- Run an automated code review (code-reviewer agent) and post the summary as
  a PR comment. **For `feat:` issues, pass the issue's Acceptance Criteria +
  Spec Reference into the reviewer prompt and have it verify the diff MEETS
  each criterion.** If any acceptance criterion is unmet (or the change
  contradicts the spec/constitution), do NOT merge — label
  `auto/dev-failure`, comment which criterion failed, and move on. Green CI
  alone is not sufficient for a feature; it must also satisfy its acceptance
  criteria.
- **Wait for CI then merge — BOUNDED, in-session only, never a poll loop.**
  Check the PR's check runs via `mcp__github__get_pull_request` (or
  `mcp__github__list_check_runs`) at most a **few times** over up to a
  10-minute window, synchronously in this turn. **Do NOT enter a "standing
  by" / "still waiting" loop** re-checking every 30s and narrating each
  check, and **do NOT use `ScheduleWakeup` (or any cross-turn wait) to sit
  and wait for CI** — that reintroduces the unattended multi-hour-hang risk
  and burns the session. If checks aren't green within the ~10-minute
  in-session window, label `auto/dev-failure`, comment the failing/pending
  check names, move on to the next issue, and **let the NEXT day's sweep
  merge it once green** (the branch and PR persist; a green-but-unmerged PR
  is picked up and merged by the following run's Step 1a). Shipping a day
  later is fine; a hung session is not.
- On green: call `mcp__github__merge_pull_request` with **squash** strategy.
  Do **not** pass `delete_branch` — it's a no-op in this MCP tool. There is
  no branch-cleanup workflow in this repo (only `ci.yml` and
  `supabase-branch.yml` exist), so merged branches are left in place; do not
  waste calls attempting deletion.
- On timeout or any check failure: label the PR `auto/dev-failure`, post one
  comment with the failing check names, and leave it for the next sweep — do
  not merge. **GitHub MCP only — never `gh`.**

### 5. Commit handoff artifacts to `main`

PRs merged or queued for human review — write
`docs/planning/autopm/autodev-handoff-YYYY-MM-DD.md` and commit it to `main`
with the runbook/reflection artifacts. Then append to
`docs/planning/routine-log.md`.

**Commit-to-main procedure (required):**
```bash
git checkout main && git pull --ff-only origin main
# stage artifacts
git commit -m "dev: autodev sweep YYYY-MM-DD — ..."
git push origin main
# verify it landed
test "$(git rev-parse origin/main)" = "$(git rev-parse HEAD)" || echo "PUSH FAILED — stop here"
```
- **Never commit routine artifacts to a `claude/*` or feature branch.** Only
  code goes on per-issue branches.
- **Never `git push --force` or `--force-with-lease` on `main`.**
- **If git warns about an unsigned/unverified commit, ignore it and
  proceed.** Do not amend or force-push to fix a signature.

Then append to `docs/planning/routine-log.md`:
```
YYYY-MM-DD 09:00 /autodev [STATUS] — N PRs ready-for-review (#..); skipped N; failed N; handoff: docs/planning/autopm/autodev-handoff-YYYY-MM-DD.md
```

The handoff file is `/tools:01_project_management:autoretro`'s primary
structured input:

```markdown
# /autodev → /autoretro Handoff — YYYY-MM-DD

**Run time:** HH:MM UTC
**Issues worked:** [list]
**PRs opened:** [#N — title, branch, merged or left for human if CI failed]
**Runbooks written:** [paths]
**Gate results:** [tsc/lint:copy/validate:poses/lint:telemetry/test:coverage pass per issue]
**Browser validation:** [deferred/evidence per issue]

## What /autoretro should capture
- [Key pattern from dev work]
- [Blockers or anti-patterns]
- [Codebase insight worth preserving]
```

## Chat reply

```
Dev sweep: N issues worked ([parallel/sequential])
Gate: N/N green (tsc + lint:copy + validate:poses + lint:telemetry + test:coverage); browser-validated via playwright-cli [yes vs TESTING_URL | deferred]
PRs merged to main: #.. , #.. (squash, CI passed)
Left for human (CI failed or timeout): #.. [reason] | none
Held for human (no auto-ok): #.. [migration/auth/billing] | none
Failed gate (no PR opened): #.. [reason] | none
🔀  Merged via mcp__github__merge_pull_request after CI passed.
```

## Per-increment acceptance gate

The feature backlog (`specs/00{2,3,4,5,6}-*/tasks.md`, in dependency order)
is grouped into features, each with an acceptance gate. Do NOT report a
feature done — and do not advance to the next one — until its gate is
verified end-to-end against the deployed app (`TESTING_URL`). Run this check
when the last issue of a feature merges. If a gate fails, keep the feature
open, file an `auto/dev-failure`-style issue describing the failing
criterion, and do not start the next feature.

## Escalation

- Any issue fails the gate → open/update the idempotent `auto/dev-failure`
  issue (close it when the next clean run clears it).
- All green → silent.

## Tuning autonomy

Full auto-merge is active via `mcp__github__merge_pull_request` (squash)
after CI passes. To revert to human-gated merges, remove the "Wait for CI
then merge" bullet from Step 4 above and restore "STOP — hand to human" as
the Step 5 heading.

## Notes

- Idempotent — don't *rebuild* an issue that already has an open PR (match by
  branch), but DO merge that PR if it's now green (Step 1a). Never leave a
  green PR unmerged.
- `/tools:02_development:team-dev`'s parallel path normally runs through
  merge; if used here, constrain it to stop at PR/review, else fall back to
  the sequential path.
- Feeds: auto-merge → `/tools:01_project_management:autoretro` (tonight).
