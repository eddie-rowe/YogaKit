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

Then read .claude/commands/tools/02_development/autodev.md and treat it as the
authoritative spec — it is hardened for this unattended run (Dependabot batch-merge,
bounded no-poll merge). If this prompt conflicts with that file, the file wins.

Run /tools:02_development:autodev for YogaKit.

Work the open ready-for-dev issues from /tools:01_project_management:autopm, capped
at 3 per run. Skip anything touching DROP/RENAME migrations, backfills, RLS, auth, or
Stripe billing unless it carries the auto-ok label — label those auto/needs-human and
note them. Additive migrations (new table/column/index) with auto-ok are eligible. If
the ready-for-dev queue is empty, batch-merge CI-green non-major Dependabot PRs —
don't exit idle.

Gate every change on YogaKit's real CI-equivalent: `npx tsc --noEmit && npm run
lint:copy && npm run validate:poses && npm run lint:telemetry && npm run
test:coverage`. Never weaken the friction-engine/validator-lite determinism or their
100% unit-test line coverage requirement (constitution v3.0.0, Principle III).

After CI passes, call mcp__github__merge_pull_request (squash). Do NOT pass
delete_branch — no branch-cleanup workflow exists in this repo (only ci.yml and
supabase-branch.yml handle merged branches). Do NOT poll/stand-by in a loop — check
CI a few times over ~10 min max; if not green, label auto/dev-failure with the
failing check names and move on.

Write each issue's reflection to docs/planning/retro/YYYY-MM-DD-reflection-<issue>.md
(not .claude/) and commit it on that issue's own feature branch, alongside the code
change — per autodev.md Step 3, the spec, which wins over this prompt on conflict.
Only the handoff file goes to main directly:
  git checkout main && git pull --ff-only origin main
  git commit -m "dev: autodev sweep YYYY-MM-DD — N PRs merged; ..."
  git push origin main
  test "$(git symbolic-ref --short HEAD)" = "main" || { echo "WRONG BRANCH — abort"; exit 1; }
  test "$(git rev-parse origin/main)" = "$(git rev-parse HEAD)" || { echo "PUSH FAILED"; exit 1; }
After committing the handoff, END the session. Do not poll or "stand by".

Guardrails: Never commit routine artifacts to a claude/*/feature branch. End with HEAD
on main. Never git push --force / --amend (signing warnings are cosmetic — do not
re-sign). Never call AskUserQuestion. Do not fall back to gh/git-checkout /merge,
/review, /dev helpers.

Append one line to docs/planning/routine-log.md on main:
  YYYY-MM-DD 09:00 /autodev [STATUS] — N PRs merged (#..); N dependabot merged; skipped N; failed N; handoff: docs/planning/autopm/autodev-handoff-YYYY-MM-DD.md

Reply with PRs merged to main, Dependabot PRs merged, issues held auto/needs-human,
and any CI failures. Degrade, don't abort.
