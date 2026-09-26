# /autopm → /autodev Handoff — 2026-09-26

**Run time:** ~09:30 UTC
**Board health:** Good
**Audit:** docs/planning/autopm/2026-09-26.md

## Ready-for-dev issues (for /autodev to pick up)

- #96 [chore: run `npm run datadog:apply` for homepage-200 threshold sync] — P2 (noise
  reduction, not an incident) — codebase area: `datadog/synthetics/api/homepage-200.json`
  (ops/tooling, no code). `auto-ok`. Single command, no schema/RLS/auth/billing touch. Read
  the apply output directly (don't pipe through `tail` — see `#96`'s body for why).

## Held for human (no auto-ok)

- #90 [feat(#47): pose_favourites/pose_notes schema, RLS, CI assertions] — reason: RLS
  surface, built and CI-green *except* `db-types-check` ("Check generated types for drift"
  fails) — needs `src/types/database.ts` regenerated before it's even mergeable, on top of
  the owner nod its own description asks for.
- #91 [test(#60): close RLS assertion gaps] — reason: RLS/auth surface (billing table read
  behavior), CI green, awaiting owner nod only.
- #92/#93/#94/#95 [feat(#61): entitlements resolver / cohort UI / Stripe billing] — reason:
  auth/billing surface, CI green on all four, awaiting owner nod only. Four PRs stack in
  dependency order: `#92` → `#93` → `#94` (cohort chain) and `#95` (billing, independent,
  based on `main`).
- #82/#83 [feat(003 US4/US5): filter/score-explanation + theme-taxonomy] — reason: copy
  sign-off (owner-judgment), same gate shape as the now-merged `#41`. No PR yet — build can
  start any time; hold merge for sign-off.
- #97 [Plan 005-daily-sadhana] — reason: 2 of 13 UX decisions (streak-repair,
  guidance-card tone) need an owner nod before the plan's Constitution Check is final. Can be
  drafted now against the other 11 decisions' recommended defaults.

## /autodev routing

- **Sequential, not parallel:** none of the ready-for-dev auto-ok items conflict on files
  this sweep (`#96` is the only one, a single ops command).
- **Do not touch #90–#95** — these are the owner's own PRs from an interactive session,
  explicitly held for their nod; `/autodev` should neither merge them nor push additional
  commits to their branches.
- **`#97`, once actioned:** drafting `specs/005-daily-sadhana/plan.md`/`tasks.md` will itself
  produce the next batch of `ready-for-dev` `feat:` issues for a future sweep to pick up,
  the same way `#82`/`#83` were generated from `003`'s `tasks.md`.
