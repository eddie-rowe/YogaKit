# /autodev → /autoretro Handoff — 2026-09-24

**Run time:** ~10:05 UTC (hand-launched, scheduled slot)
**Issues worked:** #67 (chore: `db-types-check` — retry `supabase start` on ghcr.io rate-limit)

## Queue at sweep start

`ready-for-dev` open issues: #67 (`auto-ok`, `chore`), #41 (`auto/needs-human` —
T037 sharing/revoke copy, owner sign-off), #47 (`auto/needs-human` —
`pose_favourites`/`pose_notes` schema+RLS). Only #67 was eligible; #41 and
#47 were already correctly held, unchanged, left as-is. No open PRs from a
prior sweep to land (Step 1a: `list_pull_requests` for `eddie-rowe/YogaKit`
returned zero open PRs). No open Dependabot PRs (Step 1b: checked
`dependabot/*` heads, zero found). Cap was 3; 1 issue worked (only 1
eligible).

## PRs opened

- **#68** — `ci: retry supabase start on ghcr.io rate-limit in
  db-types-check`, branch `autodev/67-ci-supabase-start-retry`. Opened,
  labeled `ready-for-review`, auto-reviewed, merged (squash) to `main` as
  `8946c32`. Closes #67 (auto-closed on merge).

## Runbooks / reflections written

- `docs/planning/retro/2026-09-24-reflection-67.md`

## Gate results

`tsc --noEmit` / `lint:copy` / `validate:poses` / `lint:telemetry` /
`test:coverage` — **green**: 540/540 tests, 100%/100%/100%/100%
statements/branches/functions/lines coverage maintained. This is a CI-YAML-only
change (`.github/workflows/ci.yml`), so the gate doesn't exercise the change
itself — it confirms the change didn't regress anything else.

## Per-issue detail (#67)

`db-types-check` starts a local Supabase stack (`supabase start`) before
running the actual drift check (`scripts/db-types-check.sh`); `supabase
start` pulls images from `ghcr.io`, and a transient `toomanyrequests`
rate-limit there killed the job before the drift check ever ran — the same
signature first noted, unfixed, in PR #66's own handoff (2026-09-23), now
recurring for the second time. Wrapped the step in a bounded 3-attempt retry
with backoff (10s/20s). An automated code review (`code-review` skill, low
effort) on the opened PR caught a real gap before merge: the retry re-invoked
`supabase start` without cleanup, so a partially-started stack from attempt 1
(containers up mid-pull) could fail attempt 2 on a port/container-name
conflict instead of actually re-attempting the transient pull — added
`supabase stop || true` before each retry, re-verified the gate, pushed, and
resolved the review thread before CI ran to green and the PR merged.

## Verification

CI-only workflow-YAML change — no vitest surface to TDD red/green against,
and `act`/Docker aren't available in this headless run, so per-issue
verification was the full local gate (green, run twice — once before and
once after the review-driven cleanup fix) plus a read of the diff against
the issue's three acceptance criteria (all three checked satisfied in the PR
body) rather than a red/green test pair. Not a `feat:` issue, so browser
validation via `playwright-cli` doesn't apply.

## CI note

Both this PR's commits ran `db-types-check` clean (green on the ghcr.io pull
step both times, so the fix's own effectiveness wasn't directly exercised by
a real rate-limit hit during this run) — the retry/backoff logic itself was
verified by reading the diff (attempt-counting and backoff arithmetic:
init 1, max 3, check-then-backoff-then-increment → exactly 3 total tries
before a non-zero exit) rather than by reproducing a `ghcr.io toomanyrequests`
failure locally, which isn't reproducible on demand.

## What /autoretro should capture

- Second occurrence of the identical `ghcr.io toomanyrequests` signature
  (first in PR #66's handoff, unfixed at the time). Filing it as its own
  issue (#67) rather than letting it keep getting rediscovered per-PR worked
  as a pattern — worth naming as the template for recurring CI-flake
  signatures going forward.
- CI-only workflow-YAML fixes don't fit the routine's default "tests first,
  red then green" shape — there's no vitest surface for a GitHub Actions
  step. Verification for this class of change is the full gate (as a
  no-regression check) plus a careful read against acceptance criteria, not
  a red/green test pair. Worth calling out explicitly in
  `.claude/commands/tools/02_development/autodev.md` so a future sweep
  doesn't stall looking for a test to write on a pure-infra fix.
- `db-types-check` still isn't a required status check (tracked separately
  under #65 / branch protection) — this fix reduces noise in loop artifacts
  rather than unblocking any merge that was actually blocked by it.
- The automated code-review step caught a genuine correctness gap
  (missing cleanup between retry attempts) on a very small, seemingly
  low-risk CI-YAML diff — a useful data point that "small infra fix" isn't
  a reason to skip the review step.
