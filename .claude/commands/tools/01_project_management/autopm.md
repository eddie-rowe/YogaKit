---
model: sonnet
description: Autonomous PM Sweep
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Task: Run Autonomous PM Sweep

Execute a complete project-management planning cycle by running the PM
commands in sequence, turning last night's production signal into
dev-ready work for today.

## Operating context

The owner (eddie-rowe) is reachable. This routine still runs autonomously and
**never calls `AskUserQuestion`** — it keeps the dev lane fed without waiting
on a same-day answer, not because nobody is there. Keep the dev lane full
(≥3 `auto-ok` issues open at all times), mine the roadmap/specs for the next
increment, and reframe owner-gated blockers into buildable work where
possible rather than only parking them. Every guardrail below stays in full
force — tiered auto-ok (additive migrations only), no force-push, single
owner-digest instead of comment spam.

## Context

`/autopm` is the **daily PM routine** in the autonomous loop (see
`docs/planning/routines.md`). It runs after
`/tools:03_observation:autoobs` has written a fresh observation digest, so
planning sees the latest production reality. Its job is to end with
**`ready-for-dev` GitHub issues** that the `/tools:02_development:autodev`
sweep can pick up the same morning.

Scheduled slot: **~07:00 UTC**, after `/autoobs` (overnight). No scheduler
runs this today — hand-launched (`007-autonomous-operations`'s job).

This routine is the bridge from _what's happening_ to _what to build next_.

**MCP-native, headless.** This runs as a Claude Code routine with no
shell-only tooling: reach GitHub via `mcp__github__*` (repo
`eddie-rowe/YogaKit`), never `gh`.

**Fully autonomous.** Never call `AskUserQuestion` and never wait for human
input. If something is ambiguous or blocked, record it in the handoff file,
label the issue `auto/needs-human`, and move on.

**Commit-to-main procedure** — every artifact must land on `main`, not a
`claude/*` branch. Before committing:
```bash
git checkout main && git pull --ff-only origin main
git commit -m "pm: autopm sweep YYYY-MM-DD — ..."
git push origin main
test "$(git symbolic-ref --short HEAD)" = "main" || { echo "WRONG BRANCH — abort, do not switch away"; exit 1; }
test "$(git rev-parse origin/main)" = "$(git rev-parse HEAD)" || { echo "PUSH FAILED — stop here"; exit 1; }
```
Never `git push --force` / `--force-with-lease` on `main`. End the session
with HEAD on `main` — do not `git checkout claude/*` afterward. If git warns
"unsigned/unverified," the commit is already correct — never amend, never
force-push to fix a signature.

## Inputs (read first)

- Latest observation digest — `docs/observation/autoobs/*.md` (most recent)
- `DECISIONS.md` (repo root) — recent decisions (last 7 days)
- Yesterday's CEO brief — `docs/planning/ceo-brief/` (most recent)
- Yesterday's retro note — `docs/planning/retro/` (from
  `/tools:01_project_management:autoretro`)
- Open GitHub issues + labels — the board itself; there is no separate
  `kanban.md`/`state.md` file to keep in sync

## Execution Flow

Run these in sequence, printing a short summary after each step. On failure,
log the error and continue (see Error Handling).

### 1. Project Snapshot (`/tools:01_project_management:audit`)

Reads the recent observation digests and codebase/board state; writes
`docs/planning/autopm/YYYY-MM-DD.md`.
**Output**: project health one-liner + the audit's recommended focus areas.

### 2. Board health via GitHub directly

There is no `kanban.md`/`state.md` to sync — open issues and their labels
*are* the board. Query GitHub directly:

- Issues closed in the last 48h (`mcp__github__list_issues`, state=closed,
  sort=updated) — confirms what actually landed.
- Open issues by label (`ready-for-dev`, `auto-ok`, `auto/needs-human`) —
  current capacity and what's stuck.
- Stale/blocked items (`/tools:01_project_management:kanban`'s board-health
  pass): surface stale, blocked, and orphaned issues. In the autonomous run,
  **skip the interactive AskUserQuestion prompts** — instead report the
  board-health findings and apply only non-destructive actions (labeling,
  triage tags). Never auto-close issues unattended.

**Output**: N items closed, board health (Good/Needs Attention/Critical), N
stale, N blocked.

### 3. Owner-gated blocker digest (single issue — NOT per-issue comment spam)

**Policy:** per-issue "Action required by tomorrow" comments are noise when
they repeat daily on the same blocked issue. **Do NOT post per-issue
escalation comments on owner-gated issues.** Instead maintain ONE idempotent
digest:

- Find/open a single GitHub issue titled **`[auto/owner-digest] Owner-gated
  blockers`** (label `auto/owner-digest`) via `mcp__github__search_issues`;
  there must never be more than one.
- Rebuild its body each sweep with the current open owner-gated backlog
  grouped by blocker class (payment-file, roadmap-gate, owner-judgment,
  browser-UI, migration), each with an age and the single owner action that
  clears it.
- **Only update the issue when the content actually changes** (compare to
  the current body first). If nothing changed, do nothing — no comment, no
  edit.
- This ONE issue is the standing punch list for owner-gated items.

**Escalation still fires normally for NEW loop-actionable failures** (e.g. a
real `auto/dev-failure`, a routine outage) via their own idempotent
`auto/<topic>` issues — those are things the loop or the owner can act on
day-of, not dead owner-gated items.

**Output**: `auto/owner-digest` updated (Y/N) + count of owner-gated items by
class.

### 4. Manufacture connector-independent work supply (keep the dev lane fed)

**Why:** if the autoobs digest is quiet (no findings), `/autodev` gets a
guaranteed NO-OP unless `/autopm` manufactures safe work from the repo
itself. Each sweep, in addition to digest-driven items, generate
`ready-for-dev` + `auto-ok` issues from these connector-independent sources
(aim to keep ≥3 auto-ok issues open so `/autodev` never idles):

1. **Local static/security scan.** Run the connector-free scanners and file
   the top single-file findings:
   - `npm audit --production` (and note the standing vuln count)
   - `npm run lint` (the repo's eslint config)
   - targeted `grep`/`Grep` for known risky patterns (`Math.random(`,
     `innerHTML`, unvalidated `redirect(`, path joins on request input) —
     scoped to `src/`, never touching `data/poses/` content or the friction
     engine's deterministic weights without a `feat:`-level review.
   File each as a single-file, `auto-ok` issue with the exact file:line and
   fix shape.
2. **Dependabot backlog.** List open Dependabot PRs
   (`mcp__github__list_pull_requests`, head `dependabot/*`). Note the
   CI-green, **non-major** ones in the handoff so `/autodev` batch-merges
   them (skip majors and known-failing bumps). These are idle safe
   throughput sitting untouched.
3. **Feature work — the priority engine.** Generate `ready-for-dev` `feat:`
   issues from the **product ladder in dependency order**
   (`002-auth-tenancy-billing` → `003-pose-library` →
   `004-sequencing-composer` → `005-daily-sadhana` → `006-profile-settings`),
   cross-referencing each feature's `tasks.md` and `data-model.md` under
   `specs/`. Keep ~3 feature issues open so `/autodev` never idles. Each
   `feat:` issue MUST carry the mandatory sections from
   `/tools:01_project_management:issues` (Acceptance Criteria, Test
   Requirements, Spec Reference, Codebase Area), scoped to one Codebase
   Area. Feature code + additive migrations (new table/column/index) are
   `auto-ok`. **Never generate issues that would violate a constitution
   non-negotiable** (friction-engine determinism, engine coverage, Tier-1
   pose completeness, RLS on practice content, no-zero-streak/no-guilt copy)
   — those need a human design call, not an auto-ok issue. Held
   `auto/needs-human` (never `auto-ok`): DROP/RENAME column or table, type
   narrowing, data backfills/`UPDATE` migrations, RLS/policy changes, all
   auth changes, all Stripe billing changes. Money/access-control risk stays
   gated regardless of diff size.

**Output**: N connector-independent auto-ok issues filed; Dependabot PRs
flagged for merge.

### 5. Generate Dev-Ready Issues (`/tools:01_project_management:issues`)

Translate the top dev-ready items into GitHub issues. For each:

- **Deduplicate before creating.** Before creating any new issue:
  1. Search open issues by key symptom keywords via
     `mcp__github__search_issues`
  2. Search closed issues from the last 30 days with the same keywords
  3. If a matching open issue exists → add a comment with the new evidence,
     do not create
  4. If a matching recently-closed issue exists → re-open it with a comment
     explaining recurrence rather than creating a new issue (preserves
     investigation history)
- Match by title against existing open issues first — **never duplicate**.
- Apply the `ready-for-dev` label (this is `/autodev`'s input filter).
- Add a `### Codebase Area` section so `/autodev` can judge parallel vs
  sequential.
- **`auto-ok` tiered policy** — see Step 4's held/eligible lists above.

**Output**: list of issues created/updated and their labels.

### 6. Log the Handoff

Append one line to `docs/planning/routine-log.md`:

```
YYYY-MM-DD 07:00 /autopm [STATUS] — N issues ready-for-dev (#.., #..); board: [health]; focus: [top area]; handoff: docs/planning/autopm/autopm-handoff-YYYY-MM-DD.md
```

### 7. Handoff file

Write `docs/planning/autopm/autopm-handoff-YYYY-MM-DD.md` and commit it with
the audit. This is `/tools:02_development:autodev`'s primary structured
input.

```markdown
# /autopm → /autodev Handoff — YYYY-MM-DD

**Run time:** HH:MM UTC
**Board health:** [Good/Needs Attention/Critical]
**Audit:** docs/planning/autopm/YYYY-MM-DD.md

## Ready-for-dev issues (for /autodev to pick up)
- #N [title] — [P0/P1] — codebase area: [area]

## Held for human (no auto-ok)
- #N [title] — [reason: migration/auth/billing]

## /autodev routing
- [parallel vs sequential] — [which issues can run in parallel, which must be sequential]
```

## Final Summary Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 AUTONOMOUS PM SWEEP COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Audit: [HEALTHY/AT-RISK] — top focus: [area]
✅ Board: [Good/Needs Attention/Critical] — N stale, N blocked
✅ Ready for dev: N issues (#.., #..)

Handoff to /autodev:
• [issue] — [why it's next]
• [issue] — [why it's next]

Held for human (not auto-ok):
• [issue] — [migration/auth/billing touch]

Reports:
- Audit: docs/planning/autopm/YYYY-MM-DD.md
- Log:   docs/planning/routine-log.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Error Handling

- If a sub-command fails, log it and continue to the next.
- If no observation digest exists for today, proceed with the most recent
  one and note the staleness in the summary.
- If `/tools:01_project_management:issues` produces zero dev-ready items,
  that's a valid outcome — report "no new dev-ready work" so `/autodev`
  exits clean.
- **Stall detection — trigger off "days since last merged PR," NOT
  routine-log NO-OP lines.** `/autopm` runs *before* `/autodev` writes that
  day's line, so a routine-log-based streak lags a day. Instead query GitHub
  live: `mcp__github__search_issues`/`list_pull_requests` for the most
  recent merged PR; compute days since. Use "≥3 days since last merged PR"
  as the stall signal.
- **On stall — shift strategy, don't just re-rank owner actions.** When
  stalled AND the open backlog is fully owner-gated:
  1. First, ensure Step 4 actually produced connector-independent `auto-ok`
     work — a stall with an empty auto-ok lane usually means Step 4 didn't
     run hard enough. Redirect the next `/autodev` to that backlog
     (local-scan fixes, Dependabot merges, next-feature-in-the-ladder
     issues). Shipping owner-independent work is the designed response to a
     quiet backlog — NOT producing another owner to-do list.
  2. Then update the single `auto/owner-digest` issue (Step 3).
- **Self-non-execution / outage guard.** Check for gaps in your own recent
  artifacts (audits/handoffs) and in `routine-log.md`. If a prior day's
  routine clearly did not run (missing audit/handoff, no routine-log line),
  open/update the idempotent `auto/routine-outage` GitHub issue noting the
  missed day(s).
- Mark the sweep `PARTIAL` if any step failed.

## Notes

- Idempotent — date-stamped reports, title-matched issues.
- The board is GitHub issues + labels directly — there is no separate
  markdown kanban file to keep in sync.
- Feeds: `/autodev` (issues) and tomorrow's `/autoobs`/CEO brief (audit).
