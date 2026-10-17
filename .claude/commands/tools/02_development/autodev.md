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
  the `playwright-cli` skill to manually exercise whatever the change
  touches and capture evidence, against **the PR's own preview deployment**,
  resolved via the GitHub Deployments API (see "Browser-validate with
  `playwright-cli`" below) — not a static `TESTING_URL`, which by
  construction cannot contain unmerged code. Fall back to `TESTING_URL` only
  when no deployment exists for the head SHA. If no target resolves at all,
  note validation as **deferred to a full-env run**; never fake a pass.
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

#### Staleness gate — green is not green on a stale base

**Before treating any PR as mergeable, measure its drift:**
```bash
git fetch origin
git rev-list --count origin/main ^origin/<headRefName>
```
A `SUCCESS` rollup only attests to the base the checks ran against. On a PR
tens of commits behind, that base no longer exists, so the badge is evidence
about a tree nobody is proposing to merge.

- **≤ 10 behind** — treat the rollup as current. Merge per the normal rules.
- **11-40 behind** — rebase onto `origin/main`, push, and re-run the full gate.
  Merge only on the post-rebase result.
- **> 40 behind** — do **not** rebase and do **not** merge. Close the PR, state
  the commits-behind count and the source issue in the closing comment, and
  confirm that issue is open with `ready-for-dev` so it re-enters the queue.
  Re-deriving from an issue that still states its acceptance criteria is
  cheaper than resolving that much drift, and the rebuilt branch is tested
  against current main instead of against an unreviewed merge.

Report every staleness action in the handoff. **Never count a stale-green PR
as "held" for an unrelated reason** — on 2026-10-12 thirteen PRs stood open at
10-104 commits behind while successive runs each reported the queue as
correctly blocked on browser validation. Only two of them actually were.

#### Trust `main` over the search index

`mcp__github__list_pull_requests` and the issue search have returned a stale
snapshot — on 2026-10-12 they omitted `#156`-`#161`, which `main` recorded as
merged hours earlier. `git log origin/main` and `docs/planning/routine-log.md`
are first-party and authoritative. When the two disagree, prefer `main`, say so
in the handoff, and do not rebuild an issue whose merge `main` already records.

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

   **Carve-out: changes with no vitest surface** (GitHub Actions YAML, other
   pure infra/config with nothing for vitest to import or execute). Red/Green
   doesn't apply — there is no test to fail first. The accepted proof shape
   instead: run the full gate (step 4 below) green *before* any review-driven
   fix and again *after*, plus a diff read against every acceptance criterion
   in the issue, both recorded in the PR body. This is not a license to skip
   verification for anything that merely lacks a test today — only for a
   change with no vitest-testable surface at all.
3. **Implement** — make the change until the tests pass (Green).
4. **Gate** — run, and require green:
   ```
   npx tsc --noEmit && npm run lint:copy && npm run validate:poses && npm run lint:telemetry && npm run test:coverage
   ```
   A failure stops *this* issue (don't open a PR for failing work); continue
   to the next.
5. **Browser-validate with `playwright-cli`.** For a `feat:` issue this is
   **REQUIRED, not deferrable**. First check `cat .playwright-available` at
   the repo root (written by the environment setup script) — `0` or missing
   means the CLI never launched this session.

   A `0` here is an **environment fault to report, not a condition to work
   around**. It means `setup.sh` in the environment settings is stale or its
   chromium probe failed, and the only fix is owner-side (re-paste the file).
   Say so explicitly in the run summary — "`.playwright-available` = 0, env
   setup script stale, browser validation skipped" — so it shows up as a
   blocked environment rather than as a routine that chose to skip. Then use
   the headless fallback at the end of this step rather than spending time on
   substeps 1-4. Two consecutive runs (2026-10-11, 2026-10-12) held `feat:`
   PRs for exactly this and the handoffs did not make the cause legible.

   `playwright-cli` resolves `--config` against the CWD, defaulting to
   `.playwright/cli.config.json`; `setup.sh` writes that file pointing at the
   real chromium `executablePath`. `--browser` is **not** a substitute — it
   accepts only `chrome`, `firefox`, `webkit`, `msedge`, and the bundled
   chromium is reachable by config alone. Without the config the CLI tries its
   `chrome` channel default and fails with "Chromium distribution 'chrome' is
   not found". `playwright-cli`'s
   subcommand set differs by version (Homebrew's local build vs. the
   `@playwright/cli` npm package `setup.sh` installs in the cloud) — if a
   command below is unrecognized, check `playwright-cli --help` for the
   closest equivalent (page-context JS runs under `eval`, not `run-code`,
   on at least one observed version) rather than assuming the step is
   unsupported.
   1. **Resolve the target** — this PR's own preview deployment, not a
      static `TESTING_URL` (which cannot contain unmerged code):
      ```bash
      SHA="$(git rev-parse HEAD)"
      D=$(gh api "repos/eddie-rowe/YogaKit/deployments?sha=$SHA" --jq '.[0].id')
      PREVIEW_URL=$(gh api "repos/eddie-rowe/YogaKit/deployments/$D/statuses" --jq '.[0].environment_url')
      ```
      Fall back to `TESTING_URL` only if no deployment exists for the head SHA.

      Check `cat .gh-available` first, the way step 5 checks
      `.playwright-available`. A `0` means `gh` is missing or its token is
      invalid, and is an **environment fault to report** — not a cue to scrape
      the preview URL out of the `vercel[bot]` PR comment.

      **Read the flag; never restate a capability claim from this file as an
      observation.** A 2026-10-12 run reported "`gh` is unavailable" having
      copied the phrase from an earlier note here without testing it — `gh api`
      worked in that session, so a resolvable preview was reported as
      unresolvable and `feat:` PRs were held for nothing (corrected in
      `67abba1`). A note in a spec describes what was once true somewhere; only
      the flag and a live command describe this session.
      The GitHub MCP exposes no deployments or deployment-statuses tool, so
      there is no first-party substitute; a scraped URL is not tied to the head
      SHA and can silently validate a stale build.
   2. **Clear Vercel Deployment Protection** — the first navigation to
      `PREVIEW_URL` must append
      `?x-vercel-protection-bypass=$VERCEL_AUTOMATION_BYPASS_SECRET&x-vercel-set-bypass-cookie=true`,
      or the preview 302s to `vercel.com/sso-api`. The cookie carries for the
      rest of the session — no params needed on later navigations. If
      `VERCEL_AUTOMATION_BYPASS_SECRET` is unset, this step cannot succeed.
   3. **Mint a session** for auth-gated routes using the dedicated
      `TESTING_EMAIL` / `TESTING_PASSWORD` account (`syntheticstesting`,
      the same identity Datadog monitors already notify — never a real
      user's account). Preview deploys share the **production** Supabase
      project (branching is off) — this account is dedicated and
      unmistakably named for exactly that reason.

      **This account owns an organization**, so owner/admin paths ARE
      reachable: `8f77499b-a8c0-4253-9caf-8711698f8be0` "Synthetics Testing
      Studio", `org_types: ['studio']`, membership `roles: ['owner']`. That
      makes `/settings`' studio block and everything under `/org/[orgId]/`
      (members, cohorts) validatable. Before 2026-10-17 it owned nothing, and
      two runs gave up on owner-path checks for that reason alone (`#129`,
      `#168`) — do not re-derive that conclusion, it is fixed. If the fixture
      is ever missing, `scripts/seed-synthetic-org.mjs` recreates it
      idempotently through the app's own `app_create_organization` RPC.

      It has no *second* membership, so member-vs-owner contrast still cannot
      be browser-checked with one account. Say so plainly if a check needs it,
      rather than reporting the owner path as unverifiable.

      **Primary — page-context `signInWithPassword`.** Proven 2026-10-12
      against PR `#129`'s preview: returned `ok`, and `/settings` rendered
      `syntheticstesting@gmail.com` after a reload. The app has no password
      field in its UI (`SignInClient.tsx` only offers Google OAuth and
      `signInWithOtp`), so drive the SDK directly with `playwright-cli eval` —
      page-context JS, **not `run-code`**, which invokes `async page => …`
      Node-side with a Playwright handle and cannot reach `document.cookie`.

      **`eval` echoes the script it evaluates back into its own output.** On
      2026-10-12 that printed `TESTING_PASSWORD` into a session transcript.
      Shell interpolation is not enough on its own — the interpolated script is
      what gets echoed. Always redirect the output and read back only the
      result line:
      ```bash
      playwright-cli eval "async () => {
        const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.12.5')
        const sb = createBrowserClient('$NEXT_PUBLIC_SUPABASE_URL', '$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
        const { error } = await sb.auth.signInWithPassword({ email: '$TESTING_EMAIL', password: '$TESTING_PASSWORD' })
        return error ? error.message : 'ok'
      }" > /tmp/mint.log 2>&1
      grep -A2 '### Result' /tmp/mint.log    # expect: ok
      rm -f /tmp/mint.log
      playwright-cli reload
      ```
      Never print the raw output of an `eval` that carries a credential, and
      never paste that script into a PR comment or a handoff as evidence.
      This works because `src/lib/supabase/client.ts` uses the same
      `createBrowserClient` (`@supabase/ssr`), which stores the session in a
      `document.cookie` entry the server client reads — an independently
      loaded copy writes the same cookie.

      **Verify the identity, every run.** The authenticated page must render
      `syntheticstesting@gmail.com`. Any other address means the environment's
      `TESTING_EMAIL` has drifted from the one account that is supposed to
      exist — report it and stop, rather than validating as an identity nobody
      intended. This assertion is here because a 2026-10-12 run rendered the
      retired `synthetics-tester@gmail.com` and only caught it by chance: the
      cloud environment keeps its own env-var store, so a credential change in
      `.env.local` does not propagate there.

      **Fallback — Supabase admin `generateLink`, type `recovery`.** Feed the
      resulting `hashed_token` to
      `/auth/confirm?token_hash=...&type=recovery&next=<route>`
      (`src/app/auth/confirm/route.ts`), which mints the session server-side
      via `verifyOtp`. Use `recovery`, not `email` — that route's
      `KNOWN_TYPES` is `['email', 'recovery', 'invite']`, and `generateLink`'s
      magic-link type is `magiclink`, which is not in that list and will
      redirect to `error=link_expired`. `recovery` is the one `generateLink`
      type that is also in `KNOWN_TYPES`.

      This path is **unproven**: on 2026-10-12 it returned a null
      `hashed_token` against a live preview, for reasons still unexplained
      (the run discarded the response body). So capture the diagnostic when it
      fires, and never print the token itself:
      ```bash
      curl -s -w '\nHTTP %{http_code}\n' -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/generate_link" \
        -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"recovery\",\"email\":\"$TESTING_EMAIL\"}" \
        | jq -r 'if .hashed_token then "TOKEN_PRESENT" else "NO_TOKEN code=\(.code // .error_code // "?") msg=\(.msg // .error_description // "?")" end'
      ```
      Report the HTTP status and the `code`/`msg` in the run summary. That is
      the only way the null-token cause gets explained.

      **Fall through on any outcome other than an authenticated page** — a
      `signInWithPassword` return other than `ok`, a null token, a non-2xx, or
      a landing on `/auth/sign-in`. Do not read a failure narrowly as "the
      mechanism is available, so the fallback does not apply"; the test is
      whether a session exists, not whether an endpoint responded.
   4. Exercise the affected flow against the issue's Acceptance Criteria and
      attach snapshot/screenshot evidence to the PR body.

   **A PR with no rendered surface is not browser-blocked.** Before holding a
   `feat:` PR for validation, check whether it actually renders anything: a
   pure module, a hook not yet wired into a component, or a test-only change
   has nothing for a browser to assert. Say "no rendered surface" and treat the
   PR as validated. On 2026-10-12 `#154` and `#155` were held three sweeps for
   missing browser validation and then found to have no UI surface at all — the
   hold was never applicable.

   If the browser can't launch, or no preview/`TESTING_URL` resolves, or the
   protection bypass or test account is missing, fall back to a headless
   assertion against Supabase/`pup` where possible; only if NO verification
   path exists, label the PR `auto/needs-human` (do NOT auto-merge an
   unverified feature). **Never fake a pass, never write new Playwright specs
   under `tests/e2e-qa/`.** (Security/tech-debt/Dependabot fixes may still
   defer browser validation as before.)

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
test "$(git symbolic-ref --short HEAD)" = "main" || { echo "WRONG BRANCH — abort, do not switch away"; exit 1; }
test "$(git rev-parse origin/main)" = "$(git rev-parse HEAD)" || { echo "PUSH FAILED — stop here"; exit 1; }
```
- **Never commit routine artifacts to a `claude/*` or feature branch.** Only
  code goes on per-issue branches.
- **Never `git push --force` or `--force-with-lease` on `main`.**
- **If git warns about an unsigned/unverified commit, ignore it and
  proceed.** Do not amend or force-push to fix a signature.

Then append to `docs/planning/routine-log.md`, timestamped at the run's actual
completion time (not the nominal 09:00 slot start — mirror the handoff
template's own `**Run time:** HH:MM UTC` convention above):
```
YYYY-MM-DD HH:MM /autodev [STATUS] — N PRs ready-for-review (#..); skipped N; failed N; handoff: docs/planning/autopm/autodev-handoff-YYYY-MM-DD.md
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
Gate: N/N green (tsc + lint:copy + validate:poses + lint:telemetry + test:coverage); browser-validated via playwright-cli [yes vs PR preview | yes vs TESTING_URL | deferred]
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
verified end-to-end against the deployed app (the feature's own PR preview,
resolved as in step 5 above; `TESTING_URL` as fallback). Run this check
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
