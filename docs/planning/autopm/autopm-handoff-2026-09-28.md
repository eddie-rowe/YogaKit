# /autopm → /autodev Handoff — 2026-09-28

**Run time:** ~09:30 UTC
**Board health:** Good
**Audit:** docs/planning/autopm/2026-09-28.md

## Ready-for-dev issues (for /autodev to pick up)

- #103 [fix: autodev.md routine-log template hardcodes "09:00" instead of actual
  completion time] — P2 — codebase area:
  `.claude/commands/tools/02_development/autodev.md` (single line, line 242).
  `auto-ok`. Doc/prompt-only edit, no code path, no test to run — verify by re-reading
  the edited section for consistency with the handoff template's own `HH:MM UTC`
  convention one section below it.

## Held for human (no auto-ok)

- #90 [feat(#47): pose_favourites/pose_notes schema, RLS, CI assertions] — reason: RLS
  surface, built and CI-green except `db-types-check` (mechanical fix is `#101`, itself
  blocked — see below).
- #91 [test(#60): close RLS assertion gaps] — reason: RLS/auth surface, CI green,
  awaiting owner nod only.
- #92/#93/#94/#95 [feat(#61): entitlements resolver / cohort UI / Stripe billing] —
  reason: auth/billing surface, CI green on all four, awaiting owner nod only. Stack:
  `#92` → `#93` → `#94` (cohort chain), `#95` (billing, independent, based on `main`).
- #82/#83 [feat(003 US4/US5): filter/score-explanation + theme-taxonomy] — reason: copy
  sign-off (owner-judgment). `#82` built (PR `#99`, CI green, browser validation
  honestly deferred — Vercel Deployment Protection). `#83` not yet built (oversized,
  101-occurrence patch, needs re-scoping before scheduling).
- #97 [Plan 005-daily-sadhana] — reason: built (PR `#98`, CI green); 2 of 13 UX
  decisions (streak-repair, guidance-card tone) need an owner nod before the plan's
  Constitution Check is final.
- #96 [chore: npm run datadog:apply for homepage-200 threshold] — reason: **not**
  owner-judgment — this sandbox's own auto-mode classifier denies live third-party-infra
  writes even though the GitHub label says `auto-ok`. 3rd unchanged occurrence
  (2026-09-25/26/27). A 4th identical attempt will not produce a different result — needs
  either a human to run the one command, or a decision to route this action class through
  a higher-permission execution context. Do not retry unchanged.
- #101 [ci: regenerate src/types/database.ts on PR #90] — reason: **also not**
  owner-judgment, and distinct from `#96`'s policy question — this headless session has
  no Docker/local-Supabase to run `npx supabase gen types typescript --local`. A standing
  capability gap for this one class of generated-file work, not a retry target.

## /autodev routing

- **Single item this sweep (`#103`):** self-contained, single-file doc edit, no
  dependency on any other open PR or issue. No parallel/sequential concern.
- **Do not merge or otherwise modify #90–#95/#98/#99's design** — these remain the
  owner's PRs to approve.
- **`#96` and `#101` stay blocked here** — don't retry either against the same walls;
  both are tracked as standing, distinctly-classed items on `#38` (tooling-permission vs.
  environment-capability-gap), not a retry loop.
