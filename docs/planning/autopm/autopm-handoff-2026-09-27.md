# /autopm → /autodev Handoff — 2026-09-27

**Run time:** ~09:30 UTC
**Board health:** Good
**Audit:** docs/planning/autopm/2026-09-27.md

## Ready-for-dev issues (for /autodev to pick up)

- #100 [feat(009 US3): operational-writing structural checks (T024/T025)] — P2 — codebase
  area: `scripts/copy-lint.mjs`, `scripts/lib/copy-lint.mjs`,
  `tests/unit/copy-lint/`. `auto-ok`. Single area, no schema/RLS/auth/billing touch.
- #101 [ci: regenerate src/types/database.ts on PR #90] — P1 (unblocks a stuck,
  otherwise-ready PR) — codebase area: `src/types/database.ts` on branch
  `feat/47-pose-personalization-schema` only. `auto-ok`, but read the issue's own scope
  note first: this is a deliberate, narrow exception to "do not touch #90-#95" below —
  a generated-file regen only, not a design change. If unsure, the safe fallback is to
  comment the exact regen command on `#47`/`#90` instead of pushing.

## Held for human (no auto-ok)

- #90 [feat(#47): pose_favourites/pose_notes schema, RLS, CI assertions] — reason: RLS
  surface, built and CI-green except `db-types-check` (see `#101` above for the
  mechanical fix — does not resolve the RLS sign-off itself).
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
  writes even though the GitHub label says `auto-ok`. 2nd occurrence of this exact
  friction (per 2026-09-26 retro). Needs either a human to run the one command, or a
  decision to route this action class through a higher-permission execution context.

## /autodev routing

- **Sequential, not parallel:** `#100` and `#101` touch disjoint files (copy-lint
  scripts/tests vs. a generated types file on a different branch) — either order is
  fine, no shared-file conflict.
- **`#101` is branch-scoped, not main-scoped** — it pushes to `feat/47-pose-personalization-schema`
  (PR `#90`'s branch), not `main`. Read its scope note before pushing; if `/autodev`'s
  own guardrails treat "don't touch #90-#95" as a hard rule with no exceptions, fall back
  to commenting the regen command on `#47`/`#90` instead.
- **Do not merge or otherwise modify #90–#95/#98/#99's design** — these remain the
  owner's PRs to approve; `#101` is the one narrow, justified exception, scoped to a
  generated file only.
- **`#96` stays blocked here** — don't retry it against the same sandbox denial; it's
  tracked as a standing tooling-permission item on `#38`, not a retry loop.
