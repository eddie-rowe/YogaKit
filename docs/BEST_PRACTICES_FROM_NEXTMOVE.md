# Best practices from NextMove (for YogaKit)

This file distills what we learned running NextMove, an eCom-ops product that spent 30 days
being operated by an autonomous Claude routine loop with no human at the keyboard. The product
is being archived. The operating knowledge is not. This is that knowledge, retargeted for
YogaKit.

Read the top half (Parts 0 and A) as a human. The bottom half (Parts B and C) is written so you
can hand chunks straight to Claude Code (web or CLI) to do the porting, including pasting the
routine prompts.

Both repos share a stack (Next.js 16, React 19, TypeScript strict, Tailwind v4, Vitest 4,
Playwright, Vercel, Datadog), so almost everything ports with light translation.

---

## Part 0: TL;DR and how to use this

**The one thing to remember:** an autonomous loop is a force-multiplier on decisions already
made, and a no-op on decisions not yet made. It will build, test, harden, and self-correct
almost indefinitely on a pre-cleared runway. It cannot make a product bet, rotate a secret,
click an OAuth screen, or decide what matters. Your job before you step away is to convert your
judgment into a queue the loop can execute, and to clear everything that only you can do.

**What YogaKit already has (this guide does NOT re-teach these):** spec-kit workflow, the
v3.0.0 constitution, `DECISIONS.md` and `FRICTION.md`, privacy-safe Datadog RUM
(`src/components/DatadogRum.tsx`), a coverage-gated CI (`.github/workflows/ci.yml`),
`.claude/skills/`, `CLAUDE.md` and `AGENTS.md`.

**The gaps this guide fills:**

| Pattern | YogaKit today | Priority | Where it goes |
|---|---|---|---|
| `.claude/settings.json` done-gates | none | P1 | `.claude/settings.json` |
| Autonomous routine loop (4 routines) | none | P1 | `.claude/commands/`, `docs/planning/routines.md` |
| GitHub-issue work-consumption + labels | none | P2 | GitHub + issue templates |
| `docs/planning/` operational spine | partial (DECISIONS.md only) | P2 | `docs/planning/` |
| Observability-as-code (monitors/SLOs/pup) | RUM only | P2 | `datadog/`, `docs/OBSERVABILITY.md` |
| Strategy/voice context files (esp. VOICE.md) | constitution covers some | P3 | repo root |
| `.claude/agents/` and `.claude/hooks/` | skills only | P3 | `.claude/` |

Start at P1. The settings.json gates take ten minutes and pay off immediately. The routine loop
is the crown jewel and the reason this file exists.

---

## Part A: The 30-day operating lessons

These are the things you cannot re-derive by reading config files. They came from watching the
loop run unattended for a month.

### 1. The bottleneck is decision supply, not agent capability
The cleanest proof from the run: one morning the owner committed a single file ratifying eight
stuck decisions. Within seven hours the loop had filed, built, reviewed, and merged two PRs off
that one input. When decisions were flowing, the loop shipped. When they were not, it idled or
padded. Treat your decisions (in `DECISIONS.md`, the constitution, and issues) as the fuel. The
loop is just the engine.

### 2. Owner-gated work is a hard ceiling that does not drain itself
Over 30 days, every item that required a human (rotate a leaked credential, reconnect a dead
OAuth token, flip a repo setting, send a cold email) sat untouched the entire month. The loop
re-diagnosed the same five blockers twice, 17 days apart, and moved none of them. A leaked
credential stayed exposed for 28 days. Production sat in a degraded state for 26 straight days,
entirely because of owner-gated items, never because the loop broke.

The fix is not more automation. It is: **before you go dark, clear the owner-only queue and
pre-authorize the bets.** For YogaKit that means, before any unattended stretch: provision any
secrets or env vars the loop will need, apply pending migrations yourself if they touch RLS or
auth, and pre-decide anything the constitution forces a human to sign off on. A blocker filed is
not a blocker solved.

### 3. Hardening that held (port these as invariants, not suggestions)
Every failure mode from earlier, shakier runs disappeared once these were in place. The loop
fired 127 of 128 scheduled runs across the month.

- **Degrade, don't abort.** A missing connector or tool makes a routine downgrade to a reduced
  mode and log it, never crash the whole run. The setup script's single points of failure were
  made non-fatal.
- **Bounded and no-poll.** No routine polls or waits in a busy loop. CI is checked with a
  bounded number of looks, then the routine moves on. Each step has roughly a ten-minute
  watchdog.
- **Non-destructive git sync.** Routines never force-push, never reset hard on shared history,
  and resolve conflicts by union, not by clobber.
- **One digest, not a stream of pings.** Escalations go into a single idempotent
  `auto/owner-digest` issue with a 7-day escalation ladder, not a new alert per event. This is
  what kept the run from drowning the owner in noise.
- **Verify before you assert.** Every claim ("shipped 3 PRs", "monitors green") is checked
  against the actual source before it is written down. See lesson 5.
- **Synchronous, no background subagent.** The routines run their steps in sequence in one
  session. They do not spawn a background subagent and return, because a detached child that
  dies silently is invisible to the audit log.

### 4. Starved is not the same as idle, but marginal value declines
When the feature backlog ran out around week three, the loop did not stop. It invented new
sources of work (coverage gaps, then config sweeps, then dead-code hunts) and kept shipping
green PRs. But the value of each PR fell. By day 31 it was removing dead code that it had itself
added a week earlier. Lesson: curate a real runway of meaningful work before you leave, or the
loop will pad. For YogaKit, a good runway is the spec-kit feature ladder (002 through 006) broken
into properly scoped issues, not "improve coverage."

### 5. Honesty discipline is a feature you have to build in
The loop was made to triple-verify every "shipped N" against three independent sources: the
append-only routine log, the live GitHub state, and git itself. Zero-PR days were reported
honestly as steady-state, not dressed up as progress. The loop even walked back its own
multi-week mistakes when it found them. Build the verification in from the start; a routine that
can lie to look busy will.

### 6. What NOT to copy from NextMove
NextMove carried a lot of business-specific machinery: a design-partner CRM, Stripe and
QuickBooks and Shopify wiring, cold-outreach tracking. None of that is YogaKit's world, and most
of it was the owner-gated dead weight from lesson 2. Port the operating patterns, not the
business scaffolding. If a pattern assumes a decision the loop cannot make, either pre-make the
decision or leave the pattern out.

---

## Part B: The transferable patterns

Each pattern below gives you what it is, why it mattered, the YogaKit adaptation, and an inline
snippet. Ordered by leverage.

### B1. `.claude/settings.json` done-gates (P1, cheapest win)

**What it is.** A `settings.json` that (a) allowlists the commands Claude runs so it stops asking
permission mid-flow, and (b) installs hooks that act as automatic quality gates: typecheck after
every edit, and a full lint plus typecheck plus test run when the session ends.

**Why it mattered.** This is what let the dev routine merge with confidence unattended. The
`Stop` hook is the done-gate: the session cannot quietly finish with a broken build.

**YogaKit adaptation.** Retarget the script names to YogaKit's (`npm test`, `npm run
validate:poses`, the coverage gate). Because your constitution mandates 100% coverage on the
friction engine and validator-lite, add `validate:poses` to the Stop gate so pose-schema
regressions are caught too.

**Snippet** (drop at `.claude/settings.json`, adjust script names to match `package.json`):

```json
{
  "permissions": {
    "allow": [
      "Read", "Write", "Edit", "Glob", "Grep", "Task",
      "Bash(npm:*)", "Bash(npm run:*)", "Bash(npm test:*)", "Bash(npx:*)",
      "Bash(git:*)", "Bash(gh:*)", "Bash(node:*)",
      "Bash(ls:*)", "Bash(cat:*)", "Bash(grep:*)", "Bash(find:*)"
    ],
    "deny": []
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "npx tsc --noEmit 2>&1 | head -20" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "npm run lint 2>&1 || echo 'Lint failed - fix before done'", "timeout": 60 },
          { "type": "command", "command": "npx tsc --noEmit 2>&1 || echo 'Typecheck failed - fix before done'", "timeout": 120 },
          { "type": "command", "command": "npm run validate:poses 2>&1 || echo 'Pose validation failed - fix before done'", "timeout": 60 },
          { "type": "command", "command": "npm test 2>&1 || echo 'Tests failed - fix before done'", "timeout": 180 }
        ]
      }
    ]
  }
}
```

### B2. The autonomous routine loop (P1, the crown jewel)

**What it is.** Four scheduled, headless Claude Code sessions that together form one self-feeding
daily cycle. Each is an orchestrator that runs smaller steps in sequence and commits its output
to `main`. The next routine reads what the previous one committed. There are no direct
agent-to-agent calls; the coupling is entirely through committed files.

```
05:00  autoobs   observe:  read production health, write a digest + connector verdict
07:00  autopm    plan:     read the digest, groom the board, file ready-for-dev issues
09:00  autodev   build:    pick up ready-for-dev issues, branch, PR, auto-merge if green
18:00  autoretro retro:    changelog + reflection + a human-facing "read first" brief
```

**The loose-coupling contract.** "The arrows are files committed to main." Each routine writes a
dated handoff file (for example `docs/observation/autoobs-handoff-YYYY-MM-DD.md`) that the next
routine reads. If a routine is skipped or fails, the next one still finds the last good handoff
and degrades rather than blocking.

**The guardrail set (every routine obeys all of these).** Idempotent (safe to run twice);
degrade, don't abort; bounded (no polling, roughly a ten-minute per-step watchdog); auditable
(one line appended to `docs/planning/routine-log.md` per run); never calls `AskUserQuestion`
(fully autonomous); commits to `main` only, verifying the branch with a `symbolic-ref` plus SHA
check before pushing; ignores git signing warnings; never delegates to a background subagent.

**YogaKit domain mapping.** Observe reads Datadog RUM plus CI plus Vercel health instead of eCom
connectors. Plan grooms the spec-kit feature ladder (002 through 006) and the pose library
backlog. Build respects the constitution: the friction engine and validator-lite stay
deterministic and AI-free, coverage stays at 100%, anything touching RLS/auth/billing is
owner-gated (see B3). Retro writes a brief a human reads first on return.

**Paste-ready routine prompts.** Each block below is complete enough to paste into Claude Code
web and adapt. Put the canonical copies at `.claude/commands/` and mirror them into
`docs/planning/routines.md` as the master spec. Fill the bracketed bits.

---

**autoobs (observe, ~05:00)**
```
You are the autoobs routine for YogaKit. Run fully autonomously. Never ask questions.
Obey every guardrail: idempotent, degrade-don't-abort, bounded (~10 min/step, no polling),
commit to main only (verify with `git symbolic-ref HEAD` + SHA before push), never spawn a
background subagent, append exactly one line to docs/planning/routine-log.md when done.

Inputs to read:
- Datadog RUM health via the pup CLI (see docs/OBSERVABILITY.md): errors, web vitals, page views.
- Latest CI runs (`gh run list`), Vercel deploy status.
- The previous autoobs handoff, if any: docs/observation/autoobs-handoff-*.md

Steps:
1. Pull last-24h RUM error rate, Core Web Vitals (LCP/INP/CLS), and page-view volume.
2. Pull CI pass/fail for the last 24h and the current production deploy state.
3. Classify overall health as GREEN / YELLOW / RED with a one-line reason each.
4. If anything is owner-gated (secret missing, setting off, deploy blocked), do NOT try to fix
   it. Record it for the digest instead.

Outputs (commit to main):
- docs/observation/digests/YYYY-MM-DD.md  (the health digest, Smart Brevity: TL;DR, why it
  matters, what to decide, evidence)
- docs/observation/autoobs-handoff-YYYY-MM-DD.md  (structured handoff for autopm: the verdict,
  the top signals, and any owner-gated blockers)
- one line appended to docs/planning/routine-log.md
```

**autopm (plan, ~07:00)**
```
You are the autopm routine for YogaKit. Run fully autonomously. Same guardrails as autoobs.

Inputs to read:
- Today's autoobs handoff: docs/observation/autoobs-handoff-YYYY-MM-DD.md
- docs/planning/kanban.md, docs/planning/state.md, DECISIONS.md
- The spec-kit feature ladder: specs/002-*/ through specs/006-*/ (tasks.md files)
- Open GitHub issues.

Steps:
1. Reconcile the board against reality (what actually merged yesterday vs. what the board says).
2. Groom the next tranche of work from the spec-kit tasks and the pose-library backlog into
   well-scoped GitHub issues. Each feature issue MUST have: Acceptance Criteria, Test
   Requirements, Spec Reference, Codebase Area.
3. Label each issue per the work-consumption policy (see B3):
   - ready-for-dev + auto-ok         -> the loop may build and merge it
   - ready-for-dev + auto/needs-human -> surfaced for the owner, loop does NOT touch it
   Anything touching RLS, auth, billing, a destructive migration, or copy tone is auto/needs-human.
4. If the ready-for-dev + auto-ok queue is thin, manufacture connector-independent work from the
   backlog rather than padding coverage. Never invent busywork.
5. Roll any owner-gated blockers into the single auto/owner-digest issue (do not open a new
   issue per blocker).

Outputs (commit to main):
- Updated docs/planning/kanban.md
- New/updated GitHub issues with correct labels
- docs/planning/autopm-handoff-YYYY-MM-DD.md  (what autodev should pick up, in priority order)
- one line appended to docs/planning/routine-log.md
```

**autodev (build, ~09:00)**
```
You are the autodev routine for YogaKit. Run fully autonomously. Same guardrails as autoobs.

Inputs to read:
- Today's autopm handoff: docs/planning/autopm-handoff-YYYY-MM-DD.md
- GitHub issues labeled `ready-for-dev` AND `auto-ok` (NEVER touch auto/needs-human).

Constraints from the constitution (hard, non-negotiable):
- The friction engine and validator-lite stay deterministic and client-side: no AI, no DB, no
  network in their path. Do not add any.
- 100% unit line coverage on the friction engine and validator-lite. Tests first, with proof.
- No migration or change touching RLS, auth, or billing (those are auto/needs-human).
- Telemetry stays content-free. No pose/flow/note/journal content in logs or RUM.
- No streak resets to zero; no guilt/shame/urgency/countdown copy.

Steps:
0. First, land any green PR left open from the previous run.
1. Pick up to 3 issues in priority order.
2. For each: create a branch, write the failing test first, implement, make it pass, open a PR.
3. Wait for CI in a bounded way (a few checks, not a poll loop). If green, auto-merge to main.
   If red, leave the PR open, comment with the failure, and move on. Never merge red.
4. Verify what you actually merged against GitHub before reporting it.

Outputs (commit to main via merged PRs):
- Merged PRs for the completed issues (issues closed)
- docs/planning/autodev-handoff-YYYY-MM-DD.md  (what shipped, what is still open and why)
- one line appended to docs/planning/routine-log.md
```

**autoretro (retro, ~18:00)**
```
You are the autoretro routine for YogaKit. Run fully autonomously. Same guardrails as autoobs.

Inputs to read:
- All of today's handoffs (autoobs, autopm, autodev) and the day's routine-log lines.
- git log for the day, merged PRs, closed issues.

Steps:
1. Verify the day's claims: cross-check "shipped N" against merged PRs (gh) AND git log AND the
   routine-log. Report the honest number even if it is zero.
2. Write a changelog entry for what actually shipped.
3. Reflect: what worked, what got stuck, what is owner-gated, what the runway looks like for
   tomorrow. Be honest about diminishing returns if the queue is drying up.
4. Update docs/planning/state.md with the day's delta.
5. Write the human-facing brief the owner reads first on return.

Outputs (commit to main):
- docs/changelogs/YYYY-MM-DD.md
- docs/planning/reflections/YYYY-MM-DD.md
- Updated docs/planning/state.md
- docs/planning/ceo/YYYY-MM-DD.md  (the "read first" brief)
- one line appended to docs/planning/routine-log.md
```

Schedule these with your runner of choice (cron, a CI schedule, or Claude Code web scheduled
sessions). Stagger them so each starts after the previous is reliably done.

### B3. Work-consumption model (P2)

**What it is.** GitHub issues are the unit of execution. The loop only builds issues labeled
`ready-for-dev` and `auto-ok`. Everything else it either grooms (autopm) or surfaces to you
(`auto/needs-human`).

**The tiered auto-ok policy** (this is the safety valve that let it run unattended):

- **auto-ok** (loop may build and merge): additive-only changes. New files, new components, new
  pure functions, additive-only migrations (ADD COLUMN, new table, new index), new tests, docs.
- **auto/needs-human** (surfaced, never auto-built): anything with a blast radius or a judgment
  call. DROP or RENAME, data backfills, RLS or auth or billing changes, secret rotation, repo
  settings, and copy where tone matters.

This maps almost one-to-one onto YogaKit's constitution: RLS-enforced privacy, auth-to-write,
billing, the no-guilt copy rule, and the deterministic-engine rule all become `auto/needs-human`
by default.

**Feature-issue template** (put at `.github/ISSUE_TEMPLATE/feature.md`):

```
## Acceptance Criteria
- [ ] ...

## Test Requirements
- Unit: ... (friction engine / validator-lite changes require 100% line coverage)
- E2E: ... (Playwright, if a user-facing flow changed)

## Spec Reference
specs/00X-.../spec.md section ...

## Codebase Area
src/lib/... , src/app/... , data/poses/...
```

**Bootstrap the labels** (paste to Claude Code or run yourself):
```
gh label create ready-for-dev   --color 0e8a16 --description "Groomed and ready for autodev"
gh label create auto-ok         --color 0e8a16 --description "Additive; loop may build and merge"
gh label create auto/needs-human --color d93f0b --description "Owner-gated; loop surfaces, never builds"
```

### B4. `docs/planning/` operational spine (P2)

**What it is.** A small set of living files that give the loop a shared memory and give you a
single place to look on return.

- `kanban.md` — the board: Now / Next / Later / Done (rolling 14 days). autopm keeps it honest.
- `state.md` — weekly business/product snapshot: recently shipped, currently blocked, strategy
  changes. Owner-updated weekly, auto-updated by autoretro.
- `routines.md` — the master spec for the loop (schedule, branch model, auto-merge policy, label
  conventions, guardrails, the paste-in prompts from B2). This is the highest-value single doc.
- `routine-log.md` — append-only, one line per routine run. The audit trail lesson 5 relies on.
- `ceo/YYYY-MM-DD.md` — the daily human-facing brief, the thing you read first on return.

**YogaKit note:** you already have `DECISIONS.md` at the root doing the append-only decision-log
job. Keep one decision log, do not create a second under `docs/planning/`. Point `routines.md`
at the existing `DECISIONS.md`.

**Convention:** dated outputs are one file per (type, date), for example
`docs/observation/digests/2026-08-24.md`. Never overwrite; always add a dated file. This is what
makes the history greppable months later.

### B5. Observability-as-code (P2)

**What it is.** The layering that made production legible to a headless agent:

1. `docs/OBSERVABILITY.md` — one guide that maps every routine and command to its Datadog
   product, lists env vars, and encodes attribute-namespacing conventions.
2. `datadog/{monitors,slos,logs-metrics}/*.json` — monitors and SLOs as JSON manifests checked
   into git, so alerting is code-reviewed, not clicked.
3. `scripts/datadog/sync.ts` — a diff/apply tool (`tsx sync.ts --type monitors` for a dry-run
   diff, add `--apply` to push). Alerting changes go through PRs like everything else.
4. **pup CLI** for reads. The routines query Datadog through Datadog's first-party `pup` CLI, not
   raw curl and not the Datadog MCP. Reason: pup is key-authed (`DD_API_KEY`, `DD_APP_KEY`,
   `DD_SITE`) and works headless and unattended, whereas the OAuth MCP cannot be re-authed by a
   headless agent when its token expires. This one choice is why observability kept working for
   30 days.
5. A structured JSON logger that injects `dd.trace_id` and `dd.span_id` for log-trace
   correlation, with namespaced attributes (`usr.*`, `session.*`, and so on).

**YogaKit adaptation.** You already have Datadog RUM wired and content-free, which is exactly
right. Extend, do not replace. Add a starter `datadog/monitors/rum-error-rate.json` and
`datadog/slos/homepage-availability.json`, a small `scripts/datadog/sync.ts`, and an
`OBSERVABILITY.md` that documents the pup query patterns your autoobs routine will use. Keep the
constitution invariant front and center in `OBSERVABILITY.md`: telemetry carries page views,
errors, and web vitals only, never pose/flow/note/journal content.

**Illustrative monitor manifest** (`datadog/monitors/rum-error-rate.json`):
```json
{
  "name": "[YogaKit] RUM error rate elevated",
  "type": "query alert",
  "query": "sum(last_15m):sum:rum.error.count{service:yogakit}.as_count() > 25",
  "message": "RUM error rate elevated. @owner-digest",
  "tags": ["service:yogakit", "managed-by:git"],
  "options": { "thresholds": { "critical": 25, "warning": 10 } }
}
```

### B6. The strategy and voice context files (P3)

**What it is.** NextMove kept `CLAUDE.md` as a thin router that points to single-purpose strategy
files, each closing with a "how to use this together" contract so an agent knows when to consult
which. The files: INTENTIONS (what/why), PERSONAE (who), USER_JOURNEYS (how they move), VOICE
(how we write), SIGNALS (what success looks like in numbers), POSITIONING (why us), HYPOTHESES
(what we believe but have not proven), DIFFERENTIATORS (durable moats).

**YogaKit adaptation.** Your constitution already carries the substance of INTENTIONS and
POSITIONING, so do not duplicate those. The highest-value add is **`VOICE.md`**, because your
constitution already has a copy-lint rule (no guilt, shame, urgency, or countdowns), which means
you already have a voice standard that is only half-written down. NextMove's VOICE.md is directly
reusable: a Smart Brevity structure (TL;DR, why it matters, what to decide, evidence), an
"AI-tells to bin" list (delve, robust, seamless, leverage, unlock, "stands as a testament", and
so on), a no-em-dash rule, and decision-first closers. Adapt it to YogaKit's calm,
non-coercive teacher voice and add your no-guilt rule as a hard constraint. `SIGNALS.md` and
`PERSONAE.md` are worth adding next if you want the PM routine to prioritize against real
targets and real users.

### B7. `.claude/agents/` and `.claude/hooks/` (P3)

**What it is.** NextMove kept phase-grouped subagent definitions in `.claude/agents/` (a
code-reviewer, a tdd-guide, a frontend-developer, a debugger, and so on) and small shell hooks
in `.claude/hooks/` (post-edit lint, a migration-name validator, a migration-security check).

**YogaKit adaptation.** Lower priority; add when the loop is running and you want sharper
review or migration safety. A migration-security hook is a natural fit given your RLS rules:
have it refuse any migration that alters an RLS policy without an `auto/needs-human` gate.

---

## Part C: Port order (hand this to Claude Code)

Work top to bottom. Each item has a concrete "done when" check.

**P1**
1. Create `.claude/settings.json` from B1, script names matched to `package.json`.
   Done when: editing any file triggers a typecheck, and ending a session runs lint, typecheck,
   `validate:poses`, and tests.
2. Create `docs/planning/routines.md` and `.claude/commands/{autoobs,autopm,autodev,autoretro}.md`
   from the B2 prompts, retargeted to YogaKit.
   Done when: each of the four files exists, names its inputs/steps/outputs/handoff, and obeys
   the guardrail list. Do a single manual dry-run of autoobs and confirm it writes a digest and
   a handoff and appends one routine-log line.

**P2**
3. Bootstrap the three labels (B3) and add `.github/ISSUE_TEMPLATE/feature.md`.
   Done when: `gh label list` shows all three and a new issue offers the template.
4. Create the `docs/planning/` spine (B4): `kanban.md`, `state.md`, `routine-log.md`, and a
   `ceo/` directory. Point `routines.md` at the existing root `DECISIONS.md` (do not duplicate).
   Done when: the files exist and `kanban.md` reflects the current spec-kit ladder state.
5. Add the observability-as-code starter (B5): `docs/OBSERVABILITY.md`, one monitor JSON, one
   SLO JSON, and a `scripts/datadog/sync.ts` that dry-run diffs.
   Done when: `tsx scripts/datadog/sync.ts --type monitors` prints a diff without applying, and
   OBSERVABILITY.md documents the pup read patterns and the content-free-telemetry invariant.

**P3**
6. Add `VOICE.md` at the repo root (B6), adapted to the calm teacher voice, with the no-guilt
   rule as a hard constraint, and link it from `CLAUDE.md`.
   Done when: `CLAUDE.md` references it and it closes with a "how to use this" section.
7. Add `.claude/agents/` and `.claude/hooks/` (B7) as the loop matures.
   Done when: at least a code-reviewer agent and a migration-security hook exist.

---

## Constraints that apply to every port

- **The constitution wins.** The friction engine and validator-lite stay deterministic and
  AI-free. Privacy stays RLS-enforced. Telemetry stays content-free. Copy stays non-coercive.
  Engine coverage stays at 100%. Any ported pattern that would bend one of these becomes
  `auto/needs-human`, not an exception.
- **Pre-clear before you go dark** (lesson 2). Provision secrets and env vars, apply any RLS or
  auth migrations yourself, and pre-decide anything the loop cannot decide, before an unattended
  stretch.
- **Curate the runway** (lesson 4). Break the spec-kit ladder into scoped `auto-ok` issues so the
  loop has real work, not padding.

That is the whole of it. Start with B1 and B2. The rest compounds from there.
