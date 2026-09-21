# /autopm → /autodev Handoff — 2026-09-21

**Run time:** 17:06 UTC (third `/autopm` fire today; first against the real
`.claude/commands/tools/01_project_management/autopm.md` spec)
**Board health:** Needs Attention — structurally stuck, not actively regressing (0 closed
in 48h, 0 open PRs, 11 days since last merged PR, every `ready-for-dev` issue unconsumed
because `/autodev` does not exist yet)
**Audit:** docs/planning/autopm/2026-09-21.md

## Ready-for-dev issues (for /autodev to pick up)

- #35 — npm audit: 1 critical + 7 high + 5 moderate, fixes available, no major bump — P0 —
  codebase area: `package.json`/lockfile (dependency bump only)
- #36 — ESLint `react/no-unescaped-entities` + `no-html-link-for-pages` (5 files) — P1 —
  codebase area: Frontend, scattered single-line fixes
- #37 — ESLint `react-hooks/set-state-in-effect` (9 files, localStorage/searchParams
  hydration-on-mount shape) — P1 — codebase area: Frontend, client hydration hooks
- #40 — `feat(004 US4)`: decompose `ComposeClient.tsx` into `src/components/compose/`
  (T043-T049) — P1 — codebase area: `src/app/compose/`, `src/components/compose/`
- #41 — `feat(004 US3)`: draft T037 sharing/revoke copy (FR-032) — P2 — codebase area:
  `src/lib/flow/share.ts` + new `specs/004-sequencing-composer/contracts/` doc — **build
  the draft, but hold the merge for eddie-rowe's sign-off**, same gate as `003`'s two
  pending copy contracts

## Held for human (no auto-ok)

- #41 [feat(004 US3): draft T037 sharing/revoke copy] — reason: owner-judgment, user-facing
  copy sign-off (FR-032). The draft + copy-lint pass is buildable now; only the merge is
  gated.
- (not a GitHub issue, tracked on #38) Vercel deployment-protection likely intercepting
  the public read-view synthetic at `/read/classic-yin-full-body` — reason: operator
  account/dashboard access, not a code change. Escalated separately as
  `auto/observation` #39.
- (not a GitHub issue, tracked on #38) `007-autonomous-operations` still Draft, no
  plan/tasks — reason: roadmap decision. This is *why* `/autodev` doesn't exist yet to
  consume the list above; not itself a dev task.

## /autodev routing

- **Parallel-safe:** #35 (lockfile only), #36 (5 files, no shared state with the others),
  #40 (compose-only directory) can all run independently — no file overlap.
- **Sequential caution:** #37 and #40 both touch `react-hooks/set-state-in-effect` fixes,
  but in *disjoint* files (#37: 9 hydration-on-mount pages; #40/T049:
  `PoseDetailContent.tsx`, `PoseOverlay.tsx`). Safe to run in parallel, but whichever
  lands second should re-run `npm run lint` to confirm the anti-pattern count reaches 0,
  not just its own file's count.
- **Hold:** #41 — implement and open the PR, but do not merge without an explicit
  sign-off comment from eddie-rowe (same convention as the two staged `003` copy
  contracts).
