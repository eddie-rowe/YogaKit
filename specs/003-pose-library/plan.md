# Implementation Plan: Pose Library

**Branch**: `003-pose-library` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-pose-library/spec.md`

## Summary

Make the pose atlas a first-class reading surface. Four things, in dependency order:
prove Tier-1 completeness in CI as a coverage figure rather than a pass/fail (US1,
absorbing the two oldest `001` debts, T027 and T074); make `energetic_direction` legible
in the pose detail view so `004`'s six-phase arc has a real source and readers get value
before `004` exists (US2); make the anatomy diagram and its legend one linked,
dark-mode-correct view with no dead-end tabs (US3); then, as follow-on work, make catalog
filters and their scores explainable (US4), close the theme taxonomy and give each theme
a subhead (US5), and add the first per-user cloud-resident personalization — favourites
and private pose notes (US6).

`data/poses/` stays the single source of truth and stays readable with no account. This
feature does not own any Compose surface: every seam, warning, and phase render is `004`'s.

**This pass ships US1, US2, and US3.** US4/US5/US6 are specified here and built later; the
copy and taxonomy they depend on are drafted in `contracts/` now so their PRs are
mechanical rather than exploratory.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 (App Router), React 19
**Primary Dependencies**: Ajv (pose schema validation, existing), Radix `react-tabs`
(existing, `BodyDiagram`), Tailwind v4 with `@theme inline` tokens (no `tailwind.config`)
**Storage**: `data/poses/*.json` — version-controlled, build-time-read, no database. US6
adds the feature's only Postgres tables (`pose_favourites`, `pose_notes`)
**Testing**: Vitest for the pure modules and component tests; Playwright
(`playwright.config.qa.ts`, 390×844 with `isMobile`/`hasTouch`) for the anatomy and
filter walks; `scripts/verify-migrations.sh` against bare Postgres for US6's RLS
**Target Platform**: Web, mobile-first, existing PWA
**Project Type**: Web application (Next.js monolith)
**Performance Goals**: No regression to Lighthouse mobile ≥ 90 (RULE-L6). The 67 pose
detail pages MUST stay statically rendered — `generateStaticParams` in
`src/app/poses/[slug]/page.tsx` is what makes the offline read path work
**Constraints**: Pose data readable with zero account, subscription, or entitlement check
(RULE-O6/O7); nothing in this feature may add an auth check, a DB read, or a network call
to the pose read path; the friction engine and validator-lite stay untouched (RULE-H6);
US6's note content is practice content and MUST be author-only at the RLS layer, never by
application code (Principle VIII)
**Scale/Scope**: 67 poses, 24 Tier-1 fields, 20 Tier-2 fields. Small enough that every
validation pass can be exhaustive rather than sampled

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against constitution v3.0.0 (`.specify/memory/constitution.md`):

| Principle | Check | Result |
|---|---|---|
| I. Safety is Sovereign | No sequence-generation or safety logic. US4 renders `injury_risk`, but as an authored record with attribution, never as a safety judgement the app makes. | PASS (N/A) |
| II. The Teacher Decides; the App Proposes | RULE-T3 — the app is never a black box. FR-022/023 require the derived scores be explainable. **The spec's premise here is wrong and the design corrects it**: `complexity` and `injury_risk` are hand-authored integers backed by `source`, not computed. Explaining them as engine output would satisfy the letter of RULE-T3 while violating it — the copy in `contracts/score-explanation.md` says a contributor recorded the number, and cites the source. | PASS, with a corrected premise recorded in research.md §3 |
| III. Deterministic Authority, AI Optional | RULE-H6 requires the friction engine and validator-lite have zero DB/network dependency. This feature touches neither `src/lib/friction/` nor `src/lib/validator/`. US1 hardens the *input* those modules compute over, which strengthens the principle rather than testing it. No AI call anywhere in this feature. | PASS |
| IV. Embodied Intelligence | The anatomy diagram renders authored pose geometry; it derives no cue and authors no teacher voice. US5's theme subheads are the one place this feature writes about felt experience, which is why they carry an owner sign-off. | PASS |
| V. Open Data, Sustainable Product | RULE-O6/O7 — pose data readable with no account, subscription, or entitlement, and entitlement logic gates features only, never open data or a user's own records. `data/poses/` is unchanged as source of truth (FR-001); no server mirror is introduced (FR-003); no entitlement check exists anywhere in the poses path and none is added (FR-002). US6's favourites and notes are the user's *own* records, so RULE-O7 forbids gating them on entitlement too — FR-037 encodes this, and it is true by construction because no policy consults entitlements. | PASS |
| VI. Lightweight and Accessible | RULE-L3/L4 — pose library stays static/bundled; reading works with no login. This feature *improves* the position: dropping `force-dynamic` from `src/app/poses/page.tsx` makes the catalog index static, and US6's UI mounts after hydration so statically prerendered pose content never waits on a session (FR-035/036). RULE-L6 (Lighthouse ≥ 90) is helped by the same change. FR-026's 40px touch target is already met by `kk-chip` under coarse pointers; US3's new legend buttons must inherit it. | PASS |
| VII. Compassion Over Compliance | No streak, no lapse copy, no Daily Sadhana surface — RULE-C5's copy-lint (which does not exist yet; it is `009`) does not gate this feature. But FR-030 keeps theme browsing a *stateless lens*: no mood logging, no check-in, no state written. That is the same instinct one feature upstream, and it is enforced here as a negative test rather than as a promise. US5's subheads must describe what a pose family does in the body without diagnosing the reader. | PASS |
| VIII. Consent-Scoped Visibility | RULE-V1/V2 — practice *content* tables must have no column a policy could join against org, cohort, or teacher; RULE-V5 requires a CI test proving a teacher cannot read a student's content. A private pose note is practice content. `pose_notes` therefore gets no `org_id`, no `cohort_id`, no visibility column, and no teacher-role predicate; every policy is `user_id = (select auth.uid())` and nothing else. The *absence* is the guarantee, so it is asserted structurally against `information_schema`, not just behaviourally. | PASS, with the assertions specified in contracts/pose-personalization.md |

No violations requiring Complexity Tracking justification.

### Three places the spec and the code disagree

Recorded here so a later reader is not misled by the spec's own assumptions. Each is
resolved in `research.md`.

1. **FR-008 is already satisfied; FR-006 is not.** `npm run validate:poses` is already a
   blocking CI step (`.github/workflows/ci.yml:29-30`, no `|| true`). But the error
   formatter prints only `err.instancePath` and `err.message`, and Ajv's enum message is
   the bare *"must be equal to one of the allowed values"* — naming neither the offending
   value nor the permitted set, which FR-006 and US2/AS3 both require. US1's code gaps are
   the coverage figure and the formatter, not the gate.
2. **FR-029's "existing curated, closed set" does not exist.**
   `emotional_release_potential[].emotion` is schema-typed as free text and the 67 files
   hold 38 distinct values. US5 is a data-normalization story, not a copy story. See
   research.md §2 and `contracts/theme-taxonomy.md`.
3. **The Derived Score entity is factually wrong.** See the Principle II row above.

## Project Structure

### Documentation (this feature)

```text
specs/003-pose-library/
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── spec.md
├── design-input.md
├── contracts/
│   ├── theme-taxonomy.md            # [OWNER SIGN-OFF] the 38 → N collapse + subheads
│   ├── score-explanation.md         # [OWNER SIGN-OFF] FR-022/023 copy
│   └── pose-personalization.md      # US6 read/write contract + RLS invariants
├── checklists/
│   └── requirements.md              # already complete
└── tasks.md
```

### Source (repository root)

```text
data/
├── poses/*.json                     # source of truth, unchanged by US1-US3
├── schemas/pose.schema.json         # US5 adds an emotion enum; Tier-1 set unchanged
└── schemas/theme-taxonomy.json      # NEW (US5)

scripts/
├── validate-poses.js → .mjs         # US1: ESM, coverage figure, real error formatting
├── lib/tier1-report.mjs             # NEW (US1) — pure, testable, no I/O
└── verify-migrations.sh             # US6 appends RLS assertions

src/
├── app/poses/
│   ├── page.tsx                     # US2: drop force-dynamic
│   ├── PosesClient.tsx              # US4, US5
│   └── PoseDetailContent.tsx        # US2, US4
├── components/poses/
│   ├── BodyDiagram.tsx              # US3 — the largest single change
│   └── BodySvg.tsx                  # US3
├── lib/pose-library/
│   ├── index.ts                     # US1: drop require(), fix a false comment
│   ├── body-map.ts                  # US3: inverse map, joint names, legend entries
│   └── energetic-direction.ts       # NEW (US2)
└── types/database.ts                # US6: regenerated

supabase/migrations/                 # US6: one migration
docs/krama-guardrails.md             # §1.3 testid table, updated in the same change
docs/design/003-tier1-review.md      # NEW (US1) — the FR-009 review record
```

## Phasing

Each phase is one PR, independently shippable.

| Phase | Story | Ships this pass |
|---|---|---|
| 1 | Spec-kit artifacts, both copy contracts, pointer repair | ✅ |
| 2 | US1 — provable Tier-1 completeness | ✅ |
| 3 | US2 — energetic direction, readable outside the composer | ✅ |
| 4 | US3 — the anatomy diagram and its legend as one view | ✅ |
| 5 | US4 — filter affordances, score explanations, zero-result reasons | deferred |
| 6 | US5 — close the theme taxonomy, then add subheads | deferred, re-estimate first |
| 7 | US6a — schema, RLS, CI assertions, no UI | deferred |
| 8 | US6b — favourites and notes UI | deferred |

Two splits are deliberate and should not be collapsed:

- **Phase 3 and Phase 4 stay apart.** Phase 4 is a tokens-and-structure change across
  `BodyDiagram` and `BodySvg`; if interaction state landed in the same PR, no reviewer
  could tell a dark-mode regression from a linking bug. Phase 4 is also worth shipping
  alone: it fixes dark-mode breakage that is live today.
- **Phase 7 and Phase 8 stay apart.** Phase 7's whole claim is that FR-033 is verifiable
  from the schema alone. Landing the table together with UI invites a reviewer to reason
  about the UI's conditionals instead — the exact failure Principle VIII's "never in
  application code" is written against.

## Complexity Tracking

No constitutional violations require justification.
