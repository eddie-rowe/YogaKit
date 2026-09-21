First action before anything else — sync the local clone to remote main SAFELY:
  git fetch origin
  git checkout main 2>/dev/null || git checkout -B main origin/main
  # Keep real un-pushed work; only hard-reset the known stale/orphaned local clone.
  if git merge-base --is-ancestor origin/main HEAD && [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
    git push origin main || true    # local has real commits on top of origin — push, don't reset
  else
    git reset --hard origin/main    # local is behind/orphaned junk — safe to reset
  fi
If any git step fails, note it and continue — never abort the session over a git sync failure.

Then read .claude/commands/tools/01_project_management/autopm.md and treat it as the
authoritative spec — it is hardened for this unattended run (connector-independent
work supply, tiered auto-ok, single owner-digest instead of comment spam, stall
strategy-shift). If this prompt conflicts with that file, the file wins.

Run /tools:01_project_management:autopm for YogaKit.

Read today's observation digest (docs/observation/autoobs/<today>.md), DECISIONS.md,
yesterday's CEO brief, and yesterday's retro note. There is no separate kanban.md or
state.md file — GitHub issues + labels are the board. Turn dev-ready work into GitHub
issues labelled ready-for-dev.

Keep the dev lane fed: each sweep MANUFACTURE connector-independent auto-ok work
(local npm-audit/eslint/grep security findings; flag CI-green non-major Dependabot
PRs for merge; scope the next unshipped feature on the product ladder — see
CLAUDE.md's 002→003→004→005→006 order and that feature's specs/*/tasks.md). Aim to
leave ≥3 auto-ok issues open. Auto-ok tiered policy: additive migrations (new
table/column/index) and app/script fixes are auto-ok; DROP/RENAME, backfills, RLS,
auth, and Stripe billing stay auto/needs-human — per the constitution v3.0.0
non-negotiables.

Do NOT post per-issue "action required" escalation comments — maintain the single
idempotent auto/owner-digest issue instead.

Commit the audit and planning artifacts to main. Append one line to
docs/planning/routine-log.md.

Reply with the audit one-liner, board health, the ready-for-dev issues (esp. the
connector-independent auto-ok ones) handed to /tools:02_development:autodev, and the
owner-digest status. Degrade, don't abort; never call AskUserQuestion; if today's
observation digest is missing, use the most recent and note the staleness.
