---
model: sonnet
description: Autonomous Retro Sweep
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# /autoretro - Autonomous Retro Sweep

Close the day's learning loop: capture what shipped, reflect on the PM and dev
process, and write a short retro note that sharpens tomorrow's
`/tools:01_project_management:autopm`.

Daily loop-closing routine. Read
[`docs/planning/routines.md`](../../../../docs/planning/routines.md) for the
schedule and shared conventions.

Scheduled slot: **day-end**, after the dev sweep and a full day of merges.
This is what makes the loop *learn* instead of repeat. It also produces the
morning summary and recommended-action note read first thing. No scheduler
runs this today — hand-launched (`007-autonomous-operations`'s job).

## Operating context

The owner (eddie-rowe) is reachable. This routine still runs autonomously and
**never calls `AskUserQuestion`** — sharper pattern-finding and concrete
next-feature proposals feed tomorrow's `/autopm` without waiting on a
same-day answer. Momentum reporting stays honest (use
`STEADY-STATE-OWNER-BLOCKED` when apt, not to paper over a real stall). Every
guardrail stays in force: no force-push/amend (signing warnings are
cosmetic), delta-only CEO brief, owner-only items go in the single
banner/owner-digest — not the carry slots.

## Conventions (from the suite standard)

- **MCP-native, headless.** GitHub via `mcp__github__*`, never `gh`.
  Read-mostly on code, write-only on planning docs. Never touches `main`'s
  code — commits its planning artifacts (reflections, retro note, CEO brief)
  straight to `main`.
- **Reflect on merged work only** — auto-opened drafts that neither the
  automation nor a human merged are not "shipped." Auto-merged PRs count as
  shipped.
- **Voice + 3×3:** retro note and reply lead with the point; specifics over
  adjectives; cap carry-forward at 3. Apply `VOICE.md`.
- **Escalation:** nothing shipped + dev-sweep failures open → open/update the
  idempotent `auto/dev-failure` GitHub issue and continue. Never block on
  escalation.
- **Fully autonomous.** Never call `AskUserQuestion` and never wait for human
  input. If something is ambiguous, record it in the retro note and move on.
- **Commit to main** (required for every artifact):
  ```bash
  git checkout main && git pull --ff-only origin main
  git commit -m "retro: autoretro YYYY-MM-DD — ..."
  git push origin main
  test "$(git symbolic-ref --short HEAD)" = "main" || echo "WRONG BRANCH — abort, do not switch away"
  test "$(git rev-parse origin/main)" = "$(git rev-parse HEAD)" || echo "PUSH FAILED"
  ```
  Never commit to a `claude/*` branch. Never force-push main. End the session
  with HEAD on `main` — do not `git checkout claude/*` afterward. If git
  warns "unsigned/unverified," the commit is already correct — never
  `git commit --amend`, never `git push --force`. Signing warnings are
  cosmetic; do not re-sign.

## Inputs

- Today's **merged** PRs and closed issues (`mcp__github__list_pull_requests`
  state merged, filtered to today) — includes both auto-merged and
  human-merged PRs.
- Today's dev reflections —
  `docs/planning/retro/YYYY-MM-DD-reflection-*.md`.
- Today's observation digest — `docs/observation/autoobs/<today>.md` (did
  production stay healthy while we shipped?).
- Today's `routine-log.md` entries (`/autopm`, `/autodev`).
- `DECISIONS.md` (repo root) — anything ratified today that changes tomorrow's
  priorities.

**Completion-barrier check (do this before reporting "shipped 0"):** Read
`docs/planning/routine-log.md` and look for a `/autodev` line with today's
date. If **no `/autodev` line exists**, do NOT assert "autodev silent" or
"shipped 0." Instead: label the retro `dev-incomplete`, report "autodev had
not committed by end of day — dev output excluded from this retro," and add
a carry-forward item: "verify /autodev ran and recover its artifacts." Dev
output simply hasn't landed yet; it is not evidence of a failure.

## Execution

### 1. Changelog (`/tools:01_project_management:changelog`, MCP-native)

Build today's shipped-work changelog from merged PRs / closed issues (24h
scope, day in the heading). Folds into today's retro note
(`docs/planning/retro/YYYY-MM-DD.md`) rather than a separate changelog file.
**Output**: features / fixes / improvements + counts.

### 2. PM reflection (`/tools:01_project_management:pm-reflect`)

Analyze cycle time, throughput, roadmap accuracy, momentum. Writes into
`docs/planning/retro/YYYY-MM-DD.md`.
**Output**: momentum (HIGH/MEDIUM/LOW) + top process bottleneck.

### 3. Dev reflection (`/tools:02_development:reflect`)

Synthesize across today's per-issue reflections (don't re-derive): recurring
patterns, blockers, codebase insights.
**Output**: top pattern that worked + top anti-pattern / debt item.

### 4. Write the daily retro note

Write/append to `docs/planning/retro/YYYY-MM-DD.md` — the section
tomorrow's `/autopm` reads. Apply `VOICE.md`:

```markdown
## Daily Retro — YYYY-MM-DD (for tomorrow's /autopm)

**Shipped:** [one line — what actually merged]
**Momentum:** [HIGH/MEDIUM/LOW/STEADY-STATE-OWNER-BLOCKED] — [why]
**Production held?:** [autoobs overall verdict over the day — HEALTHY/DEGRADED/AT-RISK]
**Biggest friction today:** [one thing slowing the loop]
**Loop paralysis?:** [count consecutive NO-OP days from routine-log.md — if ≥ 3, note
"STALL — blocker synthesis triggered by /autopm"; otherwise "N day(s) clean"]
**Carry into tomorrow's planning (LOOP-ACTIONABLE ONLY):**
- [specific item /autopm/autodev can act on — e.g. a local-scan finding to
  file, a Dependabot batch to merge, the next feature-ladder issue to scope]
- [process tweak — e.g. "issue #.. under-specified; tighten /issues output"]
**Owner-blocked (banner, not carry slots):** [ONE line listing the owner-only
items still open + their age — do NOT spend the 3 carry slots on them; they
live in the `auto/owner-digest` issue.]
**Loop health:** [autopm→autodev handoffs clean? guardrail tripped? any missed-day
outage detected?]
```

**Momentum is NOT just PR count.** Count as momentum: shipped PRs **plus**
confirmed incident resolutions, root-causes found, and planning artifacts
produced. A day that closed a production incident or root-caused a bug is
not LOW just because 0 PRs merged. When the backlog is fully owner-gated and
the loop is shipping its connector-independent work as designed, label
momentum **STEADY-STATE-OWNER-BLOCKED** (not LOW) — this tells tomorrow's
`/autopm` "this is the expected quiet-backlog condition, don't
re-investigate the stall from scratch," distinct from a genuine loop
breakage.

**Carry-forward suppression.** Any blocker that has been owner-only for ≥3
days does NOT get a carry slot — collapse all such items into the single
"Owner-blocked" banner above. The 3 carry slots are reserved for work the
loop can actually move tomorrow.

### 5. CEO brief (`/tools:01_project_management:ceo`) — delta-or-nothing

Run the `/ceo` skill to produce `docs/planning/ceo-brief/YYYY-MM-DD.md`.
This is the **human-facing artifact** the owner reads.

**Delta-or-nothing:** do NOT emit a near-identical full brief every day.
Instead:
- Compare today's material state to yesterday's brief (what shipped, new
  incidents, new decisions). **If something materially changed**, write the
  full brief. **If nothing material changed**, write a one-screen delta
  note: "No material change since YYYY-MM-DD. Loop shipped [work] today.
  Next full brief when something changes." Point to the `auto/owner-digest`
  issue for the standing punch list.

Running it here (end of retro) gives full-day context — what shipped,
momentum, the production verdict, the loop-actionable carry-forward.

The brief covers (per the `/ceo` spec):
- **TL;DR** — the single most important call for tomorrow
- **State of the business** — what shipped, what's stuck
- **Next 3 moves** — tied to the product ladder in dependency order
- **What I need from you** — specific answerable questions
- **Drift/coherence flags** — file conflicts or alignment issues

Commit `docs/planning/ceo-brief/YYYY-MM-DD.md` with the other retro
artifacts.

### 6. Escalate + log

- Nothing merged + open `auto/dev-failure` → update the idempotent GitHub
  issue.
- Commit reflections + retro note + CEO brief to `main`; push (use
  commit-to-main procedure in Conventions).
- Append to `docs/planning/routine-log.md`:
  ```
  YYYY-MM-DD HH:MM /autoretro [STATUS] — shipped N PRs; momentum [X]; carry: [top item]; CEO brief: docs/planning/ceo-brief/YYYY-MM-DD.md
  ```

## Chat reply

```
Retro: shipped N (features/fixes), momentum [HIGH/MEDIUM/LOW], production [verdict]
Top pattern: [what worked]
Top friction: [what to fix]
Carry into tomorrow's /autopm:
  1. [item]
  2. [item]
  3. [item]
Loop health: [handoffs clean? guardrails tripped?]
```

## Error handling

- No PRs merged today is valid but notable — report it, flag low momentum so
  tomorrow's `/autopm` investigates the stall.
- Sub-step fails → log, continue, mark `PARTIAL`.

## Notes

- Idempotent — date-stamped; the retro note is written once per day, and a
  same-day re-run appends rather than duplicates.
- Closes the loop: `/autoobs → /autopm → /autodev → /autoretro → /autopm …`
