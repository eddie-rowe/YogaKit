# /autopm → /autodev Handoff — 2026-09-23

**Run time:** ~09:30 UTC
**Board health:** Good
**Audit:** docs/planning/autopm/2026-09-23.md

## Ready-for-dev issues (for /autodev to pick up)

- #40 — `feat(004 US4)`: decompose `ComposeClient.tsx` into `src/components/compose/`
  (T043-T049) — P1 — codebase area: `src/app/compose/`, `src/components/compose/` —
  **auto-ok**. Unchanged from yesterday's handoff note: T049's lint blocker in
  `PoseOverlay.tsx:92` is currently `react-hooks/refs` on `main`, but PR #62 (open, CI
  green) already fixes it — check whether #62 has merged before re-deriving this fix.
- #45 — ESLint `no-unused-vars` cleanup, Datadog sync tooling (`scripts/datadog/sync.mjs`,
  `scripts/lib/datadog-sync.mjs`, 3 warnings) — P2 — codebase area: `scripts/datadog/`,
  `scripts/lib/` — **auto-ok**. Re-verified against today's `npm run lint` output, still
  accurate.
- #46 — ESLint `no-unused-vars` cleanup, product/test code (7 files, 8 warnings) — P2 —
  codebase area: `src/components/poses/`, `src/lib/pipeline/`, `src/lib/pose-library/`,
  `tests/e2e-qa/`, `tests/integration/`, `tests/unit/` — **auto-ok**. Re-verified, still
  accurate. Disjoint from #40.
- #41 — `feat(004 US3)`: draft T037 sharing/revoke copy (FR-032) — P2 — codebase area:
  `src/lib/flow/share.ts` + new `specs/004-sequencing-composer/contracts/` doc — **build
  the draft and open the PR, hold the merge** for eddie-rowe's copy sign-off.
- #47 — `feat(003 US6a)`: `pose_favourites`/`pose_notes` schema, RLS, CI assertions
  (Phase 8, T066-T074) — P2 — codebase area: `supabase/migrations/`,
  `src/types/database.ts`, `scripts/verify-migrations.sh` — **build and open the PR, hold
  the merge** for a human nod on the RLS shape.

## Held for human (no auto-ok)

- #41 — reason: owner-judgment, copy sign-off (FR-032). Draft/PR is buildable now; only
  the merge is gated.
- #47 — reason: migration (RLS/policy surface on new tables). Build/PR is fine
  unattended; merge needs an explicit human nod on the RLS shape.
- #60 — reason: tracking issue for RLS-assertion coverage on US3/US4/US5 surfaces that
  don't exist yet (cohort graduation, Stripe billing). Not actionable until #61's
  application code is built. Not `ready-for-dev`.
- #61 — reason: US3 cohort UI + US4 Stripe billing, entirely unbuilt. Touches auth and
  Stripe billing throughout — held per CLAUDE.md's tiered policy regardless of how the
  work is sliced. Not `ready-for-dev` as filed; a human should decide which slice (US3 vs
  US4, and which task within it) to scope into a buildable issue first.
- (not a GitHub issue) PR #62 — owner's own open PR (`feat/51-007-plan-tasks`, closes
  #51), CI green, not Dependabot. Not autopm's or autodev's to merge; flagged for
  awareness only. It also fixes the `react-hooks/refs` error noted on #40 above.

## /autodev routing

- **Parallel-safe:** #40 (compose-only directory), #45 (Datadog tooling, `scripts/`),
  #46 (7 files across `src/lib/`, `src/components/poses/`, `tests/`) — no file overlap
  between any of the three. All auto-ok, all can run today.
- **Sequential caution:** none required among the auto-ok set.
- **Hold-for-sign-off lane:** #41 and #47 — implement and open PRs, but do not merge
  without an explicit sign-off/approval comment from eddie-rowe.
- **Not yet buildable:** #60, #61 — need a human scoping decision before any slice of
  them becomes a `ready-for-dev` issue.
