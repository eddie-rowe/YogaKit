# /autopm → /autodev Handoff — 2026-09-22

**Run time:** ~09:20 UTC
**Board health:** Good (0 stale/blocked, 0 stall — last PR merged ~15h ago, 3 issues
closed via merged PRs in the last 48h)
**Audit:** docs/planning/autopm/2026-09-22.md

## Ready-for-dev issues (for /autodev to pick up)

- #40 — `feat(004 US4)`: decompose `ComposeClient.tsx` into `src/components/compose/`
  (T043-T049) — P1 — codebase area: `src/app/compose/`, `src/components/compose/` —
  **auto-ok**. Note: see the 2026-09-22 comment on this issue — T049's current lint
  blocker in `PoseOverlay.tsx:92` is `react-hooks/refs`, not the originally-described
  `set-state-in-effect`; `PoseDetailContent.tsx:74` already lints clean, drop that half.
- #45 — ESLint `no-unused-vars` cleanup, Datadog sync tooling (`scripts/datadog/sync.mjs`,
  `scripts/lib/datadog-sync.mjs`, 3 warnings) — P2 — codebase area: `scripts/datadog/`,
  `scripts/lib/` — **auto-ok**.
- #46 — ESLint `no-unused-vars` cleanup, product/test code (7 files, 8 warnings) — P2 —
  codebase area: `src/components/poses/`, `src/lib/pipeline/`, `src/lib/pose-library/`,
  `tests/e2e-qa/`, `tests/integration/`, `tests/unit/` — **auto-ok**. Disjoint from #40
  (does not touch `PoseOverlay.tsx`).
- #41 — `feat(004 US3)`: draft T037 sharing/revoke copy (FR-032) — P2 — codebase area:
  `src/lib/flow/share.ts` + new `specs/004-sequencing-composer/contracts/` doc — **build
  the draft and open the PR, hold the merge** for eddie-rowe's sign-off (same gate as
  `003`'s two pending copy contracts).
- #47 — `feat(003 US6a)`: `pose_favourites`/`pose_notes` schema, RLS, CI assertions
  (Phase 8, T066-T074) — P2 — codebase area: `supabase/migrations/`,
  `src/types/database.ts`, `scripts/verify-migrations.sh` — **build and open the PR, hold
  the merge** for a human nod on the RLS shape (new tables are additive, but they carry
  RLS policies — CLAUDE.md's tiered policy gates all RLS/policy changes regardless of
  diff size).

## Held for human (no auto-ok)

- #41 — reason: owner-judgment, user-facing copy sign-off (FR-032). Draft + copy-lint pass
  is buildable now; only the merge is gated.
- #47 — reason: migration (RLS/policy surface on new tables). Build/PR is fine unattended;
  merge needs an explicit human nod on the RLS shape.
- (not a GitHub issue, tracked on #38 and #39) Vercel deployment-protection likely
  intercepting the public read-view synthetic — now confirmed across 4 deployments and 2
  calendar days. Reason: operator account/dashboard access, not a code change.
- (not a GitHub issue, noted in the audit §5, not actioned) `specs/002-auth-tenancy-
  billing/tasks.md` shows 0/58 checked despite the described code existing on `main` —
  looks like a stale checklist, not real backlog. Flagged for a human pass to reconcile;
  no issue filed since there's no actual missing work to schedule.

## /autodev routing

- **Parallel-safe:** #40 (compose-only directory), #45 (Datadog tooling, `scripts/`),
  #46 (7 files across `src/lib/`, `src/components/poses/`, `tests/`) — no file overlap
  between any of the three. All auto-ok, all can run today.
- **Sequential caution:** none required among the auto-ok set this sweep — #45 and #46
  were deliberately split by codebase area specifically so they don't collide, and neither
  touches any file #40 touches.
- **Hold-for-sign-off lane:** #41 and #47 — implement and open PRs, but do not merge
  without an explicit sign-off/approval comment from eddie-rowe. #41 needs a copy
  sign-off; #47 needs an RLS-shape sign-off. Different reviewers' worth of attention, same
  "build now, gate the merge" pattern.
