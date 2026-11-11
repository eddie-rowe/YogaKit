# /autodev → /autoretro Handoff — 2026-11-11

**Run time:** 10:30 UTC
**Issues worked:** #279, #280, #281 (3 of 3, sequential: #281 needed #280's `writePreference`, and #279 touched the lockfile). PR #277 (closes #276) was also landed under Step 1a.
**PRs opened / merged:**
- #277: test(006 T050), theme pre-paint conformance. Branch `autodev/276-theme-conformance`, 5 commits behind main. The failed run was an infra flake: the Google Fonts fetch failed in `next build`. Retriggered with `update_pull_request_branch`, all green, **merged** (squash).
- #282: chore(security), vitest + @vitest/coverage-v8 4.1.12 (#279). Branch `autodev/279-vitest-4.1.12`. **Merged.**
- #283: feat(006 T054a), Preferences section in /settings (#280). Branch `autodev/280-preferences-section`. **Merged.**
- #284: feat(006 T054b), compose and pose detail read through `migratePreferences` (#281). Branch `autodev/281-surfaces-read-prefs`. **Merged.**
**Dependabot:** none open, so 0 merged.
**Runbooks written:** none. Reflections: `docs/planning/retro/2026-11-11-reflection-{279,280,281}.md`
**Gate results:** tsc, lint:copy, validate:poses, lint:telemetry and test:coverage passed for every issue. Counts were 1043, 1054 and 1072 tests respectively, and the 100% engine and validator-lite thresholds were enforced each time. `npm run lint` was clean.
**Browser validation:** `.playwright-available` = 1. `gh api` deployments resolved live for each head SHA. Sign-in used `signInWithPassword` = ok, and the identity was verified as `syntheticstesting@gmail.com`.
- #283 preview: the Preferences section renders, and clicks write the same keys and formats as before. Values persisted across a reload.
- #284 preview: values set on /settings showed on `/compose` (advanced) and on `/poses/anahatasana` (custom, with Dosha off).
- #282 has no rendered surface.
**Code review:** a review agent checked #283 and #284 against their acceptance criteria and approved both. Its follow-ups were folded into #284: the override in `useStoredPreference` is now cleared after a successful write, a control no longer looks dead when storage throws, and the switch row has a group label.
**Held for human:** unchanged from autopm. #227, #199, #273, #47, #60, #258, #263, #111, #176, #177, #97, #218 (Datadog RUM), #61 (P2, large; not taken this run because the 3-issue cap was reached).

## What /autoretro should capture
- **Browser validation caught a real bug that existing tests missed.** On preview, `/compose` always showed the `simple` layer after a reload, whatever was stored. The cause was a `useState(() => localStorage…)` initializer, which hydrates against the server's markup. jsdom unit tests can't see this. The pose-detail `useDetailLayer` had the same pattern. #284 fixed both with `useSyncExternalStore` through the shared `useStoredPreference`. Other components may use the same pattern; grep for `useState(() =>` combined with `localStorage`.
- **The npm 10.9.9 bundled in the cloud image crashes in arborist** (`Cannot read properties of null (reading 'edgesOut')` in `#loadPeerSet`) on `npm install` and on `npm update`. `npx -y npm@11 install` produced a clean, minimal lockfile. Use npm@11 for dependency PRs.
- **Stacked PR and squash merge:** merging main into the stacked #281 branch conflicted on files #280 had already squashed. Resolving with `--ours` silently reverted #277's T050 tick in `tasks.md`; it was caught by diffing against main and restored. After a `--ours` resolution, always diff each conflicted file against `origin/main`.
- **The sync step's `git reset --hard` was denied again** (11th run). This run had local HEAD == origin/main, so `git checkout -B main origin/main` was enough. Swap the prompt's reset for `git fetch && git checkout -B main origin/main` when the tree is clean, or `git pull --ff-only`.
- **FR-002 drift:** the spec's section-order list does not name Preferences. It now renders after Appearance (design-input UX-005). The owner may want the spec line amended.
- 006 US6 status: T050, T052, T053 and T054 are done. T051 (measure first paint) and T055 (preset UI) are still open; they are good next auto-ok candidates.
