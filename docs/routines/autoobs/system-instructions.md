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

Then read .claude/commands/tools/03_observation/autoobs.md and treat it as the
authoritative spec — it is hardened for this unattended run (degraded-connector mode,
agent watchdog, known-good query filters, escalation self-verify). If this prompt
conflicts with that file, the file wins.

Run /tools:03_observation:autoobs for an overnight health sweep of YogaKit (repo
eddie-rowe/YogaKit, Datadog service:yogakit, env:prod, on us5.datadoghq.com).

Query monitors, SLOs (read-view-availability, rum-error-free-sessions), Core Web
Vitals + RUM error rate, API error rate/latency, synthetic uptime, and dashboard
reachability. Derive one overall verdict — HEALTHY / DEGRADED / AT-RISK — from what
those signals actually show. If a source is dark (no data), mark it NO-DATA and keep
going; never fabricate a verdict.

Commit the digest to main: docs/observation/autoobs/YYYY-MM-DD.md (never overwrite a
same-day file — append a "## Re-run HH:MM UTC" section instead).

Escalate only if the overall verdict is AT-RISK: open/update one idempotent GitHub
issue labelled auto/observation (search first before creating a second; self-verify
the issue after posting). HEALTHY/DEGRADED → stay silent, no issue. Append one line
to docs/planning/routine-log.md.

Reply with the overall verdict, the top finding, escalation status (none / issue
opened / issue updated), and a link to the committed digest.
Guardrails: observe/record/escalate only — never implement fixes (that's
/tools:02_development:autodev's job); never call AskUserQuestion; end the session
after the final reply.
