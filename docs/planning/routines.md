# Routines

Canonical schedule, file layout, and shared conventions for YogaKit's four
headless routines. Every routine spec and system-instructions file names this
file as the source of truth for these conventions — keep this file, not the
individual specs, as the place to look first.

## The four routines

| Routine | Slot | Spec | System instructions |
|---|---|---|---|
| `/tools:03_observation:autoobs` | overnight | `.claude/commands/tools/03_observation/autoobs.md` | `docs/routines/autoobs/system-instructions.md` |
| `/tools:01_project_management:autopm` | 07:00 UTC | `.claude/commands/tools/01_project_management/autopm.md` | `docs/routines/autopm/system-instructions.md` |
| `/tools:02_development:autodev` | 09:00 UTC | `.claude/commands/tools/02_development/autodev.md` | `docs/routines/autodev/system-instructions.md` |
| `/tools:01_project_management:autoretro` | day-end | `.claude/commands/tools/01_project_management/autoretro.md` | `docs/routines/autoretro/system-instructions.md` |

Loop order: `autoobs → autopm → autodev → autoretro → autopm (next day) → …`
`autoobs` observes production; `autopm` turns findings into ready-for-dev work;
`autodev` builds it; `autoretro` closes the day and sharpens tomorrow's `autopm`.

**No scheduler exists yet.** All four routines are hand-launched today.
`007-autonomous-operations` is Planned (see `specs/007-autonomous-operations/plan.md`);
its US1 done-gates and honesty requirements (FR-030–FR-035) are in scope now, but its
US4 — the actual cron/scheduler that runs these four routines unattended on a daily
cycle — is deferred until the ~Nov 2026 launch, per the standing decision recorded there.
Until US4 ships, launching a routine is a manual action (a headless session started with
the matching system-instructions.md as its prompt).

## File layout convention

- **Spec**: `.claude/commands/tools/<area>/<name>.md` — the authoritative
  behavior definition, loadable as a namespaced slash command
  (`/tools:<area>:<name>`). If a system-instructions prompt conflicts with its
  spec, the spec wins.
- **System instructions**: `docs/routines/<name>/system-instructions.md` — the
  prompt a headless session is launched with. Handles git sync, delegates to
  the spec, and states the routine-log append format.
- **Artifacts**:
  - `docs/observation/autoobs/YYYY-MM-DD.md` — one dated digest per day (never
    overwritten same-day; re-runs append a `## Re-run HH:MM UTC` section).
  - `docs/planning/autopm/YYYY-MM-DD.md` — audit/board snapshots, plus
    `docs/planning/autopm/autopm-handoff-YYYY-MM-DD.md` and
    `docs/planning/autopm/autodev-handoff-YYYY-MM-DD.md`.
  - `docs/planning/retro/YYYY-MM-DD.md` — the daily retro note (changelog and
    PM-reflection fold in as sections), plus per-issue dev reflections
    (`docs/planning/retro/YYYY-MM-DD-reflection-<issue>.md`).
  - `docs/planning/ceo-brief/YYYY-MM-DD.md` — the human-facing daily brief
    (delta-or-nothing: skipped in favor of a one-line "no material change"
    note when nothing changed).
- **Run log**: one append-only line per run in `docs/planning/routine-log.md`,
  never edited retroactively — a run's line is truth for what that run
  observed at that time, even if a later run finds it was wrong.

There is no separate `kanban.md` or `state.md` — GitHub issues and labels are
the board.

## Label vocabulary

| Label | Meaning |
|---|---|
| `ready-for-dev` | `autopm`-produced issue, safe for `autodev` to pick up |
| `auto-ok` | Sensitive-surface work explicitly cleared for automation |
| `auto/needs-human` | Touches migrations (DROP/RENAME/backfill), RLS, auth, or Stripe billing — held for a human unless `auto-ok` |
| `auto/owner-digest` | Single idempotent issue collecting owner-only blockers (never per-issue spam) |
| `auto/dev-failure` | CI failed after `autodev` attempted a merge |
| `auto/routine-outage` | A routine silently failed to run on its expected day |
| `auto/observation` | `autoobs` escalation — opened/updated only when the overall verdict is AT-RISK |

## Shared guardrails

All four routines:

- End the session with `HEAD` on `main`. Never push to a `claude/*` branch and
  leave it there.
- Never `git push --force` or `git commit --amend` on `main`. A signing
  ("unverified") warning on a commit is cosmetic — do not re-sign.
- Never call `AskUserQuestion`. If something is ambiguous, record it and move
  on; these routines are fully autonomous.
- Degrade, don't abort. A missing input (stale digest, empty queue, absent
  prior-day artifact) is handled by falling back or noting staleness, not by
  failing the whole run.
- Observe/implement split: `autoobs` only observes, records, and escalates —
  it never edits application code or runs `npm run datadog:apply`. Fixing a
  finding is `autodev`'s job.
- No routine may attribute shipped work to another routine without that
  routine's own first-party artifact (a `routine-log.md` line naming it, plus
  the dated artifact its own spec declares). Reconstructing "did X run" from
  GitHub PR/issue state and reporting it as fact is exactly the failure mode
  this guards against — it happened on 2026-09-21/22 (`#48`) and corrupted two
  days of `autoretro` output before a manual intake caught it. `npm run
  validate:routine-log` (`scripts/validate-routine-log.mjs`) enforces the
  detectable half of this in CI; a routine crediting work with no artifact to
  back it is still a spec violation even when the script cannot see it yet.
