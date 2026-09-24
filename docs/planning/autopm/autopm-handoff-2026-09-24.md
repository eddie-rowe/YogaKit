# /autopm → /autodev Handoff — 2026-09-24

**Run time:** ~09:30 UTC
**Board health:** Good (0 stall — last merge #66, ~14h before this sweep)
**Audit:** docs/planning/autopm/2026-09-24.md

## Ready-for-dev issues (for /autodev to pick up)

- #67 [db-types-check: retry `supabase start` on ghcr.io rate-limit] — P2 — codebase
  area: `.github/workflows/ci.yml` (CI-only, single file) — **auto-ok**, no
  schema/RLS/auth/billing touch. The only unconsumed item in the lane this sweep.

## Held for human (no auto-ok)

- #41 [feat(004 US3): draft T037 sharing/revoke copy for owner sign-off] — reason:
  owner-judgment, copy sign-off (FR-032). Ready to merge same-day once approved.
- #47 [feat(003 US6a): pose_favourites/pose_notes schema, RLS, CI assertions] — reason:
  RLS shape sign-off, standard policy regardless of how mechanical the migration is.
- #60 [RLS assertions incomplete for US3/US4/US5 surfaces] — reason: application code the
  assertions would guard isn't built yet (see #61); not independently buildable.
- #61 [US3 cohort UI + US4 Stripe billing unbuilt] — reason: owner scoping call needed
  (which slice first), both touch auth/payments.
- #64 [monitors flipped OK → No Data] — reason: needs a human decision on re-query vs.
  retire per monitor; narrowed today (see audit §5) but still a multi-part investigative
  ask, not a single mechanical fix.
- #65 [main has no branch protection] — reason: repo-admin action, cannot be set by
  automation.

## /autodev routing

Single item this sweep — no parallel/sequential question. #67 is CI-only (workflow YAML),
touches nothing else in the tree; safe to pick up standalone.

**Note on lane size:** the auto-ok lane is 1, below the routine's usual ≥3 target. This
reflects a genuinely clean connector-independent scan (0 npm audit findings, 0 lint
errors/warnings, 0 tsc errors, 0 Dependabot PRs, every unblocked feature-ladder slice
already either shipped or correctly held on an owner sign-off/scoping gate) — not reduced
scan effort. See `docs/planning/autopm/2026-09-24.md` §4 for the full pass. The real
unlock for more throughput is `#41`/`#47` sign-off, which is outside this loop's authority.
