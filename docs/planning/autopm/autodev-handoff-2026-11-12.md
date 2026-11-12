# /autodev → /autoretro Handoff — 2026-11-12

**Run time:** 10:15 UTC
**Issues worked:** #285 (1 of 3 — the other three candidates were held for stated reasons, not the cap)
**PRs opened:** #288 — feat(006 US6 T055): pose-detail custom-field presets UI, local only, branch `autodev/285-presets-ui` — **merged** (squash `c14b7a1`, CI green, 0 commits behind main)
**Step 1a (prior PRs):** open PRs #227 and #199 are both `auto/needs-human` owner holds; left untouched. No `autodev/*` PR was green-and-unmerged.
**Step 1b (Dependabot):** no Dependabot PRs open, so 0 merged.
**Runbooks written:** none
**Reflections:** `docs/planning/retro/2026-11-12-reflection-285.md`
**Gate results:** #285 passed `tsc`, `lint:copy`, `validate:poses`, `lint:telemetry` and `test:coverage` both before and after the review fixes. 1090 tests; engine and validator-lite at 100% lines. eslint is clean on the touched files.
**Browser validation:** #285 was validated with playwright-cli against the PR's own preview, resolved through the Deployments API, at both heads (`6cef8a0` and `04c6493`). Signed in as `syntheticstesting@gmail.com` and checked that identity. `.playwright-available` = 1, and `gh api` works.
- On `6cef8a0`: the full flow passed (save, blank and duplicate copy, apply, rename, reload, delete), plus a cross-surface check where an applied preset showed up in the `/poses/anahatasana` Custom checklist after a reload.
- On `04c6493`: the testid-collision fix and rename/apply/delete were checked again.

## Not taken, with real reasons
- **#286** (hydration guard, which extends `tests/e2e-qa/hydration-and-nav.spec.ts`) and **#287** (T051, which needs the new `tests/e2e-qa/theme-first-paint.spec.ts`) are held as `auto/needs-human`. autodev.md forbids this routine from authoring Playwright specs under `tests/e2e-qa/` because that suite is human-maintained, and /autopm filed both as `ready-for-dev` anyway. The owner needs to make one rule for both routines. Each issue has a comment listing the options.
- **#61** (002 US3 cohort UI) is not taken. Its acceptance requires T049 to extend `tests/e2e-qa/auth-org-invite.spec.ts`, which hits the same e2e-qa rule. It also says the sibling RLS tests T046/T048 (#60, an owner branch we must not touch) must land "alongside, not ahead". Both block it, and it is also large.

## What /autoretro should capture
- **Never put user-entered strings in `data-testid`.** The review found that `settings-preset-rename-${name}` collides with the fixed `settings-preset-rename-cancel` when a preset is named "cancel", and it breaks guardrails §1.3. The fix uses index-based testids and puts the name in `aria-label`. This is worth adding to `docs/krama-guardrails.md` as a general rule.
- **Enforce unique names when parsing a user-named collection, not only when saving.** Hand-edited or synced storage can contain duplicates, and then a targeted delete hits both.
- **/autopm and /autodev disagree.** /autopm files e2e-qa authoring issues that /autodev is barred from building. That cost 3 of today's 4 candidates. Either /autopm should stop filing them, or autodev.md should get an `auto-ok` exception.
- T055 is ticked in tasks.md. 006 US6 now has only T051 open, and T051 is blocked on the e2e-qa decision.
