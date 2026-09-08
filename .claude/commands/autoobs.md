---
model: haiku
description: Autonomous Observation Sweep (YogaKit)
---

# Task: Run Autonomous Observation Sweep

Execute a headless health check of YogaKit's production observability signals by
querying Datadog (us5) directly — no interactive login, no background subagent, no
questions.

## Context

`/autoobs` is YogaKit's daily observation routine, ported from NextMove's
`.claude/commands/tools/03_observation/autoobs.md` per
`specs/008-observability-as-code/plan.md` Phase 6. Unlike NextMove, YogaKit has no
`/status`, `/slo`, `/metrics`, `/ux`, `/datadog-report`, `/digest`, or
`/daily-connector-report` sub-commands, no GitHub escalation issue, and no scheduler
(007's job, not yet built) — this command queries Datadog directly for the signals
already defined in `datadog/` and writes one dated digest plus one routine-log line.
Scheduling stays a stub: this command is runnable by hand only.

**Scope: observe / record — never implement, never mutate.** This command never runs
`npm run datadog:apply` and never edits application code. If a finding needs a code or
config fix, record it in the digest's "Findings" section and stop there.

## Configuration (fixed for this org — do not re-derive)

- Site: `us5.datadoghq.com`. Auth: `DD_API_KEY`/`DD_APP_KEY`/`DD_SITE` from
  `.env.local`, **key-auth only** — never `pup auth login`. T031 already proved the
  full sync tool works with zero OAuth session; this command must too.
- Service: `yogakit`. Env tag: `env:prod` (**not** `env:production` — every query
  below must use `env:prod` or it silently returns 0 rows).
- RUM application: filter every RUM query by
  `@application.id:${NEXT_PUBLIC_DD_RUM_APPLICATION_ID}` (from `.env.local`), not just
  `service:yogakit` — an unscoped query can read as healthy while the scoped one is
  actually dark, or vice versa. If RUM session count is 0, check both scopes before
  concluding "no traffic": 0 in the unscoped view too means genuinely no traffic; 0
  scoped but nonzero unscoped means a RUM tagging bug, not a traffic problem.
- Content-free invariant: this command reads only aggregate signals (error rates,
  Core Web Vitals, uptime, monitor/SLO status). It must never print, log, or write a
  pose slug, flow title, journal/note/reflection body, mood, or energy value — none of
  the queries below touch those tables, and none should be added later without
  re-checking RULE-L7.

## Query access order (do not re-derive)

1. **`pup` CLI, primary** — key-auth, headless, non-expiring
   (`pup monitors list`, `pup slos list`, etc.). Commands and flags:
   `datadog/README.md`, `scripts/datadog/sync.mjs`.
2. **Datadog REST API directly** (`curl` with `DD-API-KEY`/`DD-APPLICATION-KEY`
   headers) for anything `pup` doesn't expose read access to — synthetics results,
   RUM analytics, dashboard state. `scripts/lib/datadog-sync.mjs`'s `restGet`/
   `restRequest` helpers show the exact header/URL shape to copy.
3. If both are unreachable for a given signal, mark that section `NO-DATA` in the
   digest and move on — never fabricate a value.

## Execution constraints (hard — same hardening NextMove's 6-hour hang taught)

- **Never delegate this sweep, or any step of it, to a background/async subagent.**
  Run every step directly in this session, synchronously.
- **Per-step time budget: ~10 minutes.** If a query hasn't returned by then, abandon
  it, record that section `DEGRADED — timed out` with what was tried, and move to the
  next step. Never let one dark connector block the whole sweep.
- **Never call `AskUserQuestion`, never offer interactive choices, never wait for
  input.** This routine runs unattended.
- **Verify before you assert.** Every line in the digest and the final summary must be
  something this run actually observed this session — not carried over from memory of
  a previous run, and not assumed from the manifest existing.
- **No dangling work at session end.** Resolve or explicitly abandon anything started
  before the final reply.

## Execution Flow

Run each step directly against Datadog. Record the result even if a step fails.

### 1. Monitor status (`pup monitors list`, filtered `service:yogakit`)

List every monitor tagged `service:yogakit`, report its current status (`OK`/`Alert`/
`Warn`/`No Data`). Cross-check against `datadog/monitors/*.json` — a monitor present in
Datadog but not one of the 8 manifest files is either the documented synthetic-test
companion-monitor drift (`datadog/README.md` "Expected drift") or a genuine
out-of-band change worth flagging.

**Output**: one line per monitor — name, status, whether it matches an expected
manifest or is expected/unexpected drift.

### 2. SLO status (`pup slos list`, filtered `service:yogakit`)

Report current SLO status and remaining error budget for `read-view-availability` and
`rum-error-free-sessions`.

**Output**: SLO name, current SLI %, target, error budget remaining.

### 3. Core Web Vitals & RUM error rate (REST: RUM analytics/timeseries, last 24h)

Query LCP p75, INP p75, and RUM error rate over the last 24h, scoped to
`@application.id:${NEXT_PUBLIC_DD_RUM_APPLICATION_ID}`. Compare against the
thresholds in `datadog/monitors/web-vitals-lcp.json`, `web-vitals-inp.json`,
`rum-error-rate.json`.

**Output**: three numbers plus a HEALTHY/AT-RISK/BREACHED call against each
threshold. If RUM session count is 0, run the unscoped-vs-scoped check from
"Configuration" above before concluding no traffic.

### 4. API error rate & latency (REST or `pup metrics`, last 24h)

Query server error rate and p95 latency, scoped to `service:yogakit env:prod`.
Compare against `datadog/monitors/api-error-rate.json`,
`datadog/monitors/api-latency-p95.json`.

**Output**: two numbers plus a HEALTHY/AT-RISK/BREACHED call.

### 5. Synthetic uptime (REST: synthetics results, last 24h)

For each test under `datadog/synthetics/api/` (homepage, read view, poses index):
last result (pass/fail), and count of failures in the last 24h. The browser test
(`read-flow-offline.json`) stays `status: paused` — note it as paused, not as a
failure.

**Output**: one line per API synthetic test.

### 6. Dashboard reachability (REST: single-dashboard GET)

Confirm `[YogaKit] Health` (`datadog/dashboards/*.json`) still resolves via
`GET /api/v1/dashboard/<id>` — a cheap proof the dashboard wasn't deleted out-of-band.
Do not screenshot or otherwise capture widget content (irrelevant to text-only digest,
and would risk carrying view-level detail this command has no reason to touch).

**Output**: reachable / not found.

### 7. Digest + Log

Write `docs/observation/autoobs/YYYY-MM-DD.md`:

```markdown
# /autoobs — YYYY-MM-DD

**Sweep time:** HH:MM UTC
**Overall:** [HEALTHY/DEGRADED/AT-RISK]

## Monitors
[one line per monitor from step 1]

## SLOs
[one line per SLO from step 2]

## Core Web Vitals & RUM
[step 3 output]

## API error rate & latency
[step 4 output]

## Synthetic uptime
[step 5 output]

## Dashboard
[step 6 output]

## Findings
[Anything AT-RISK/BREACHED/DEGRADED, with the evidence. "None this sweep." if clean.
Never a fix — record only; a fix is out of this command's scope.]
```

Never overwrite a prior day's file — if `YYYY-MM-DD.md` already exists for today (a
second run same day), append a `## Re-run HH:MM UTC` section to it instead of
replacing it.

Append one line to `docs/planning/routine-log.md`:

```
YYYY-MM-DD HH:MM /autoobs [STATUS] — overall: [HEALTHY/DEGRADED/AT-RISK]; monitors: [N ok / M alert]; digest: docs/observation/autoobs/YYYY-MM-DD.md
```

Do not commit either file — this command only observes and records locally; whether
these are committed to `main` is a decision the operator (or, later, 007's scheduler)
makes explicitly, not something this command does on its own.

## Final Summary Output

After all steps complete, provide a consolidated summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 AUTONOMOUS OBSERVATION SWEEP COMPLETE — YogaKit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Monitors: [N ok / M alert / P no-data]
✅ SLOs: [X/Y compliant]
✅ Web Vitals: [HEALTHY/AT-RISK/BREACHED]
✅ API health: [HEALTHY/AT-RISK/BREACHED]
✅ Synthetic uptime: [X/3 passing]
✅ Dashboard: [reachable/not found]

Findings:
• [finding 1, or "None this sweep."]

Digest: docs/observation/autoobs/YYYY-MM-DD.md
Log: docs/planning/routine-log.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Error Handling

- If a step fails or times out, log it as `DEGRADED — <what was tried>` and continue
  to the next step — never abort the whole sweep over one dark connector.
- Mark overall sweep status `DEGRADED` (not `HEALTHY`) if any step failed to return
  real data, even if every signal that *did* return reads healthy.
- Never call `AskUserQuestion` or wait for approval at any point in this command.

## Notes

- This command is idempotent within a day: re-running appends a `## Re-run` section
  rather than overwriting.
- No GitHub escalation, no owner-digest issue, no scheduling — those are
  `007-autonomous-operations`' job. This command's only outputs are the dated digest
  and the routine-log line.
- See `docs/OBSERVABILITY.md` §4 (routine → signal → query map) for the exact query
  strings once that section exists (Phase 3.5, T039) — until then, the query shapes in
  `scripts/lib/datadog-sync.mjs` and `datadog/README.md` are the source of truth.
