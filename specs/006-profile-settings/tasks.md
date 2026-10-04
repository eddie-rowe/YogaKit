---

description: "Task list for feature 006-profile-settings"
---

# Tasks: Profile & Settings

**Input**: Design documents from `/specs/006-profile-settings/`
**Prerequisites**: `spec.md`, `design-input.md`, `checklists/` (complete); `plan.md` (this
phase). Depends on `005` for the header avatar and the Today screen; fallbacks are in
`plan.md` "Dependencies on 005".

**Tests**: Included, and in four places non-negotiably. The one-interaction revoke is a
compliance requirement (RULE-V6), so it is tested as a walk, not eyeballed (SC-005). The
claim confirmation must never adopt without itemizing (SC-007), tested across every
authentication path. Re-grant must never happen implicitly (SC-010), tested across the
membership, billing, and profile change paths. And any new table is asserted author-only
against the schema and policies, not the UI (RULE-V1/V2/V5).

**Organization**: By phase; each phase is one PR. The Phase 2 schema split is deliberate,
see `plan.md` Phasing.

## Format: `[ID] [P?] [Tier] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[auto-ok]**: additive, reversible, test-covered; an autonomous session may build and merge
- **[needs-human]**: owner-gated. Carries one of `(schema)`, `(rls)`, `(auth)`, `(billing)`,
  `(copy)` stating why. An autonomous session may prepare it but must not merge it
- **[Story]**: Maps to US1 to US6 from `spec.md`

## Path Conventions

Single Next.js project, per `plan.md` Project Structure.

---

## Phase 1: Planning artifacts

**Purpose**: Give `006` the spec-kit artifacts it lacked.

- [X] T001 [auto-ok] Author `specs/006-profile-settings/plan.md` — Constitution Check against
  v3.0.0, explicit `005` dependencies, five spec-versus-code disagreements, phasing, tiering
- [X] T002 [auto-ok] Author this file
- [X] T003 [auto-ok] Add the `006` line to the key-artifacts list in `CLAUDE.md`

---

## Phase 2 (C1): Schema, RLS, and CI assertions — no UI

**Purpose**: Make explicit revoke and re-grant possible, and give presets a home, with the
author boundary structural before any UI depends on it. **Stories: US2, US5, US6
(prerequisite).**

**Independent test**: `bash scripts/verify-migrations.sh` passes with the new assertions and
`npx tsc --noEmit` is clean against regenerated types. No user-visible change.

- [ ] T004 [needs-human] (schema) Decide and record, in `DECISIONS.md`, whether
  `app_revoke_signal_sharing` (`20260826224206_cohorts.sql:233`, a toggle) is replaced by an
  explicit pair (`app_set_signal_sharing(enrollment_id, shared boolean)` or separate revoke
  and grant functions) or changed in place. Requirement: a double tap or a retry can never
  turn sharing back on (FR-019, plan disagreement 2)
- [ ] T005 [needs-human] (schema) New migration `supabase/migrations/<ts>_profile_settings.sql`
  implementing T004's decision. `SECURITY INVOKER`, `set search_path = public, pg_temp`,
  `REVOKE EXECUTE FROM public`, `GRANT TO authenticated`. It changes only
  `cohort_enrollments.share_signals` and returns the resulting state
- [ ] T006 [needs-human] (schema) `custom_field_presets` table in the same migration: `id`,
  `user_id`, `name`, `fields text[]`, timestamps; unique on `(user_id, name)`. **No org,
  cohort, or role column** (RULE-V2)
- [ ] T007 [needs-human] (rls) Four policies on `custom_field_presets`, all
  `user_id = (select auth.uid())`, update carrying both `using` and `with check`
- [ ] T008 [needs-human] (rls) Append to `scripts/verify-migrations.sh`: an
  `information_schema.columns` assertion that `custom_field_presets` has no org, cohort, or
  role column, and a `pg_policies` assertion over it (the technique `004` used for
  `flow_item_notes`)
- [ ] T009 [P] [needs-human] (rls) Append a block proving a second account in the same org
  reads zero rows of another's `custom_field_presets`
- [ ] T010 [P] [needs-human] (rls) Append a block proving the revoke path cannot change another
  user's enrollment, and that the explicit revoke is idempotent (calling it twice leaves
  sharing off, FR-019)
- [ ] T011 [needs-human] (rls) Confirm the existing RULE-V5 assertion (teacher account reading
  practice content for an enrolled student gets zero rows) is unmodified and still green
- [ ] T012 [auto-ok] Regenerate `src/types/database.ts` via `scripts/db-types-check.sh`
  (needs the local Supabase stack)

**Gate**: `bash scripts/verify-migrations.sh` reports `MIGRATION VERIFICATION PASSED`; owner
has reviewed the migration (T004 to T007).

---

## Phase 3 (US1): Settings shows only what applies

**Purpose**: The shell every other story mounts into. **Story: US1.**

**Independent test**: Open settings as a zero-org account, a plain-member account, and an
owner account; assert the section list, order, and absence (not disablement) of conditional
sections.

- [ ] T013 [auto-ok] [US1] Audit the shipped `src/app/settings/` and
  `src/app/account/page.tsx` against FR-001 to FR-007; list gaps in the PR description.
  Plan disagreement 1: this is completion, not a rebuild
- [ ] T014 [P] [auto-ok] [US1] `src/lib/settings/sections.ts` — pure
  `visibleSections(accountState)` returning the ordered list: profile, appearance,
  notifications, privacy, account and security, data export and delete, billing, org
  memberships, studio (FR-002). Org memberships iff member of at least one org (FR-003);
  studio iff owner or admin in at least one (FR-004)
- [ ] T015 [P] [auto-ok] [US1] Unit tests for T014: zero-org gives neither conditional
  section; member gives memberships only; owner or admin gives both; owner of one org and
  member of another gives studio naming the governed org (FR-005); ordering is fixed
- [ ] T016 [auto-ok] [US1] `SettingsClient.tsx` renders from `visibleSections`, with a visible
  index and no section reachable only by URL (FR-001, SC-001). Absent sections are not in the
  page or the index (FR-003/004, SC-002)
- [ ] T017 [auto-ok] [US1] Studio block separated by spacing, hairlines, and labels only, no
  second accent colour (FR-006, SC-004, guardrails section 2). Studio controls name the
  organization each governs (FR-005)
- [ ] T018 [auto-ok] [US1] Any control the account cannot change states why in plain language
  (FR-007, SC-003). Add notifications, data export and delete, org memberships, and studio
  section shells to `src/app/settings/sections/`
- [ ] T019 [auto-ok] [US1] A role change while settings is open takes effect on the next load,
  not by mutating the open page (FR-039)
- [ ] T020 [auto-ok] [US1] Confirm settings adds no auth gate on reading cached personal
  preferences, and renders with defaults when browser storage is unavailable (FR-010,
  FR-036; RULE-L3/L4)
- [ ] T021 [needs-human] (billing) [US1] Billing section: the entry point hands off to the
  existing `src/app/billing/portal` route, no reimplementation (FR-008). Copy states what is
  and is not gated, consistent with fail-open-on-read and fail-closed-on-write (FR-009,
  RULE-O7). Sign-off needed because this is billing-adjacent copy
- [ ] T022 [needs-human] (rls) [US1] Data export: reads only through the requesting user's
  RLS-scoped client, never service role (FR-038). Test with two accounts that the export
  contains the author's own content and zero rows of another account's (SC-014)
- [ ] T023 [P] [auto-ok] [US1] `npm run lint:copy` over every new string in the shell
- [ ] T024 [auto-ok] [US1] Playwright walk (390x844): zero-org, member, owner

**Gate**: T015 and T024 green; `npm run lint:copy` green; no existing testid changed.

---

## Phase 4 (US2): Revoking visibility is one interaction from practice

**Purpose**: The concrete implementation of RULE-V6. **Story: US2.**

**Independent test**: Revoke from Today with no intermediate navigation; open settings and
see the same control reflecting the new state with identical copy.

- [ ] T025 [needs-human] (copy) [US2] Draft the practice-visibility copy as one module (what
  is shared, with whom, revoke confirmation, grant disclosure). Naming the org/cohort in plain
  language is required (RULE-V6). Staged for owner sign-off in
  `specs/006-profile-settings/contracts/visibility-copy.md` **[OWNER SIGN-OFF]**; no
  guilt, shame, loss framing, or urgency (RULE-C2)
- [ ] T026 [needs-human] (rls) [US2] `src/components/privacy/PracticeVisibilityControl.tsx` —
  the single component, calling the explicit revoke from T005. A revoke not durably recorded
  is never reported complete, and offline shows "not yet recorded" rather than "revoked"
  (FR-016)
- [ ] T027 [P] [auto-ok] [US2] State sync between mountings: a change in one is reflected in
  the other without a refresh (FR-014)
- [ ] T028 [auto-ok] [US2] No cohort enrollment renders no implied audience (FR-017)
- [ ] T029 [auto-ok] [US2] Mount in the settings privacy section
- [ ] T030 [needs-human] (copy) [US2] Mount inline on Today. **Blocked on `005`'s Today
  screen.** If `005` has not landed, record RULE-V6 as an open gap in `FRICTION.md` and do not
  report US2 as done. If `005` shipped its own pill first, replace it with this component so
  the copy exists in one place (FR-013, SC-006)
- [ ] T031 [P] [auto-ok] [US2] Test: the two mountings render identical copy because they are
  one component; a single edit to the copy module changes both (SC-006)
- [ ] T032 [P] [auto-ok] [US2] `npm run lint:copy` over the visibility copy
- [ ] T033 [auto-ok] [US2] Playwright walk: revoke from Today takes exactly one interaction
  with zero navigations (SC-005); settings then shows the revoked state; and the reverse

**Gate**: T031 and T033 green; RULE-V5 assertion still green; owner has signed off the copy.

---

## Phase 5 (US3): Claiming local flows is explicit and itemized

**Purpose**: No silent auto-adopt. **Story: US3.**

**Independent test**: Compose flows anonymously, sign in, confirm nothing is claimed until a
confirmation naming each flow; confirm declining leaves a re-entry point.

- [ ] T034 [P] [auto-ok] [US3] `src/lib/settings/claim.ts` — pure `itemize(localFlows)`
  returning names plus count, for the prompt
- [ ] T035 [P] [auto-ok] [US3] Unit tests for T034, including a long list that stays fully
  reviewable rather than truncating to a count (FR-022)
- [ ] T036 [needs-human] (auth) [US3] `src/app/onboarding/ClaimFlowsPrompt.tsx` — nothing is
  adopted when authentication completes (FR-021); the prompt lists every flow by name with
  the count inline (FR-022); confirm claims exactly the listed flows; decline claims nothing
  and leaves local flows readable (FR-023)
- [ ] T037 [needs-human] (auth) [US3] Test across every authentication path (magic link,
  pasted code, callback, confirm) that zero local flows are adopted without a confirmation
  (SC-007)
- [ ] T038 [auto-ok] [US3] Named re-entry point in the account surface after a decline,
  showing the same itemized confirmation (FR-024, SC-009). Replaces the permanent
  `krama-claim-flows-decided` flag with a model that has a way back
- [ ] T039 [needs-human] (schema) [US3] Partial failure: report which flows were claimed and
  which were not, leave the rest locally readable (FR-025). Verify second-device claims do
  not duplicate against `claimed_flows` and `app_save_flow` (FR-026, plan disagreement 5), and
  that nothing is adopted into an account being deleted (FR-027)
- [ ] T040 [P] [auto-ok] [US3] `npm run lint:copy` over the claim and re-entry copy; the
  re-entry is a plain link with no badge, counter, or reminder (RULE-C2)

**Gate**: T037 green for all paths; the 6am offline-read walk
(`tests/e2e-qa/offline-read.spec.ts`) passes unmodified.

---

## Phase 6 (US4): Getting in and out is discoverable

**Purpose**: Reachability and recovery. **Story: US4.**

**Independent test**: Find sign-in and sign-out from primary navigation with no URL typing;
complete sign-in by pasted code on a second device.

- [ ] T041 [auto-ok] [US4] Sign-in reachable from primary navigation when signed out, and
  sign-out when signed in (FR-028). Place in the existing `AppHeader.tsx` now; re-home to
  `005`'s avatar when it lands (plan Dependencies on `005`). New testids obey the guardrails
  prefix rule
- [ ] T042 [needs-human] (auth) [US4] `SignInClient.tsx` — resend affordance, with any rate
  limit stated plainly (FR-029)
- [ ] T043 [needs-human] (auth) [US4] Pasted-code fallback so a sign-in requested on one
  device completes there when the email opens on another (FR-030, SC-011)
- [ ] T044 [needs-human] (auth) [US4] Expired or already-used code: plain failure with a next
  step, no partial session created (FR-031)
- [ ] T045 [P] [auto-ok] [US4] `npm run lint:copy` over sign-in copy: no urgency, no
  countdown on resend

**Gate**: cross-device walk green; a bad code leaves no session.

---

## Phase 7 (US5): Re-granting sharing is as explicit as revoking

**Purpose**: Revocation is not a one-way door, and sharing never returns by side effect.
**Story: US5.**

- [ ] T046 [needs-human] (rls) [US5] Org memberships section shows each enrollment's sharing
  state individually and lets it be changed individually (FR-018)
- [ ] T047 [needs-human] (rls) [US5] Named grant action that states what will become visible
  and to whom before it takes effect (FR-020). Uses the explicit grant from T005, never a
  toggle
- [ ] T048 [needs-human] (rls) [US5] Test that sharing stays off after re-enrollment and after
  any membership, billing, or profile change until an explicit grant (FR-019, SC-010)
- [ ] T049 [needs-human] (copy) [US5] Grant copy staged in `contracts/visibility-copy.md`
  **[OWNER SIGN-OFF]**; it informs rather than pressures (RULE-C2)

**Gate**: T048 green across all three change paths. Pre-grant disclosure at enrollment time
ships with the enrollment flow, which does not yet exist (`005` Assumptions).

---

## Phase 8 (US6): Preferences have one home

**Purpose**: Correctness wins that need the shell. **Story: US6.**

- [ ] T050 [auto-ok] [US6] Conformance check of `src/lib/theme.ts` and the pre-paint script
  against FR-032/033: first paint correct, persists across sessions, absent or corrupt cookie
  falls back to the default. Change code only if a gap is found
- [ ] T051 [auto-ok] [US6] Measure first paint rather than assuming it (SC-012), and confirm
  no Lighthouse regression on the read view (RULE-L6)
- [ ] T052 [P] [auto-ok] [US6] `src/lib/settings/preferences.ts` — pure migration of
  `krama-compose-layer`, `krama-pose-detail-layer`, `krama-pose-detail-custom-fields`, and
  `krama-claim-flows-decided`; existing values carry over, defaults apply when storage is
  unavailable (FR-035, FR-036)
- [ ] T053 [P] [auto-ok] [US6] Unit tests for T052, including corrupt and absent values
- [ ] T054 [auto-ok] [US6] Visible, changeable controls for each stranded preference in the
  preferences section (FR-034, SC-013); compose and pose detail read the migrated model
- [ ] T055 [auto-ok] [US6] Named presets for the pose-detail custom field checklist: save,
  reapply by name, rename and delete affecting only the target (FR-037). Persists through the
  table from T006 once Phase 2 merges; until then local only, noted in the PR

**Gate**: T053 green; migration keeps 100% of existing values (SC-013).

---

## Deferred, and why

| Item | Reason |
|---|---|
| Settings search | Open decision #3: about nine sections, below the threshold. Revisit past roughly ten |
| Separate `/admin` studio route | Open decision #2: studio stays inside `/settings` |
| Pre-grant disclosure at enrollment | `005`: the enrollment join flow does not exist yet |
| Cross-account export | Out of scope, and would conflict with the content-versus-signal split |
| Changing the `share_signals` default of `true` | `002`'s column; raised for owner awareness in `plan.md`, not changed here |
| Re-homing sign-in and sign-out to the header avatar | Waits on `005`'s nav restructure; interim placement is in T041 |

---

## Verification, at each phase boundary

```bash
npx tsc --noEmit
npm test                       # must only rise
npx vitest run --coverage      # friction, validator-lite, tier1-report, copy-lint all at 100
npm run lint:copy              # blocking; must stay green
npm run validate:poses         # unchanged
npm run lint                   # blocking in CI
npm run build
bash scripts/verify-migrations.sh   # from Phase 2 on
npm run dev &                  # playwright.config.qa.ts has no webServer
npm run test:e2e               # existing walks unchanged except where 005 retires identifiers
```
