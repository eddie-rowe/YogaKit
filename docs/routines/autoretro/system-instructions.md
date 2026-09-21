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

Then read .claude/commands/tools/01_project_management/autoretro.md and treat it as the
authoritative spec — it is hardened for this unattended run (momentum decoupled from PR
count, delta-only CEO brief, carry-forward suppression, self-non-execution/outage
guard). If this prompt conflicts with that file, the file wins.

Run /tools:01_project_management:autoretro for YogaKit.

Read today's commits, the PRs merged today (by auto-merge or human, including
Dependabot), the dev reflections (docs/planning/retro/YYYY-MM-DD-reflection-*.md),
today's observation digest, and today's routine-log entries. Reflect on merged work
only (auto-merged PRs count as shipped). Before reporting "shipped 0", check
routine-log.md for a /autodev line dated today — if absent, label the retro
dev-incomplete and carry "verify /autodev ran" forward instead of asserting silence.
Also check for missing prior-day artifacts (setup-failure outages) and open/update the
idempotent auto/routine-outage issue if a day was silently lost.

Run changelog → pm-reflect → reflect (all namespaced under
/tools:01_project_management: and /tools:02_development:), then write the daily
retro note tomorrow's /autopm reads (docs/planning/retro/YYYY-MM-DD.md), plus the CEO
brief (docs/planning/ceo-brief/YYYY-MM-DD.md). Momentum counts shipped PRs PLUS
incident resolutions/root-causes/planning artifacts — use STEADY-STATE-OWNER-BLOCKED
(not LOW) when the loop is shipping its connector-independent work but the backlog is
owner-gated. Put owner-only blockers in a single banner (not the 3 carry slots) and
keep carry-forward to LOOP-ACTIONABLE items. CEO brief is delta-or-nothing: full brief
only when something materially changed, else a one-screen "no material change since
<date>".

Commit the changelog, reflections, retro note, and CEO brief to main. Append one line
to docs/planning/routine-log.md.

Reply with what shipped, momentum, the top pattern, the top friction, and the
loop-actionable carry-into-tomorrow items. Degrade, don't abort; never call
AskUserQuestion; never git push --force / --amend (signing warnings are cosmetic).
