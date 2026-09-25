# /autopm → /autodev Handoff — 2026-09-25

**Run time:** ~09:30 UTC
**Board health:** Good
**Audit:** docs/planning/autopm/2026-09-25.md

## Ready-for-dev issues (for /autodev to pick up)

### Auto-ok (can merge unattended)
- #76 — chore — branch-coverage gate red (99.42%/100%) in `scripts/lib/datadog-sync.mjs` — P1 — codebase area: `scripts/lib/datadog-sync.mjs` + `tests/unit/datadog/sync.test.ts`
- #81 — chore — `EXPECTED_DRIFT_MONITOR_NAMES` missing `Synthetic:`/`Synthetic Browser:` infix, drift-check false-positives — P1 — codebase area: `scripts/lib/datadog-sync.mjs` + `tests/unit/datadog/sync.test.ts`
- #84 — chore — `specs/004-sequencing-composer/tasks.md` Phase 6 checkboxes stale against shipped code — P2 — codebase area: `specs/004-sequencing-composer/tasks.md` (docs-only, no vitest surface)

### Held for human (ready-for-dev, NOT auto-ok — build now, merge waits on owner review)
- #41 — feat(004 US3) — sharing/revoke copy (FR-032) — codebase area: `src/app/compose/` sharing UI
- #82 — feat(003 US4) — filter affordances + score explanations (T048-T056) — codebase area: `src/app/poses/PosesClient.tsx`
- #83 — feat(003 US5) — theme taxonomy + subheads (T057-T065) — codebase area: `src/app/poses/PosesClient.tsx` + `data/schemas/` + `data/poses/*.json`

## Held for human (no auto-ok, not buildable yet)
- #47 — feat(003 US6a) pose_favourites/pose_notes schema+RLS — reason: RLS/policy surface, owner sign-off required regardless of mechanical size
- #60 — RLS-assertion backlog (US3/US4/US5) — reason: not buildable until #61's application code exists
- #61 — 002 US3 cohort UI + US4 Stripe billing — reason: auth/billing scoping call, owner judgment
- #65 — no branch protection on `main` — reason: repo-admin action
- #74 — delete merged branches + enable auto-delete-on-merge — reason: repo-admin action (asks 1-2 also held, consistent with this loop's non-destructive-branch-ops stance)

## /autodev routing

- **Parallel-safe:** #76, #81 (both touch `scripts/lib/datadog-sync.mjs` + its test file — **sequential with each other**, disjoint from everything else). #84 (docs-only, `specs/004-sequencing-composer/tasks.md`) is parallel-safe with everything.
- **Sequential:** #76 then #81 (same file — land #76 first since it's the pre-existing, owner-filed issue; #81 rebases cleanly after).
- **#82 and #83** touch the same file (`PosesClient.tsx`) in different sections (filter/score UI vs. theme grouping) plus disjoint data files — safest run sequentially even though the task lists don't explicitly conflict, to avoid a merge-conflict-prone parallel PR pair on a single client component.
- **#41** is fully disjoint from #82/#83 (compose vs. poses) — parallel-safe with either.
- Do not touch `#47`/`#60`/`#61`/`#65`/`#74` without an explicit owner go-ahead in a comment on the issue.
