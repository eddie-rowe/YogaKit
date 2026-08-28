---

description: "Task list for feature 002-auth-tenancy-billing"
---

# Tasks: Auth, Tenancy & Billing Foundation

**Input**: Design documents from `/specs/002-auth-tenancy-billing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md,
`docs/design/002-schema.md` (all complete and committed)

**Tests**: Included. The constitution mandates 100% coverage on the friction
engine/validator-lite (untouched by this feature) and this feature's own RLS-assertion
suite is explicitly required by the plan's Verification section (SC-003, SC-005, SC-008)
— cross-tenant isolation and idempotency are safety-critical, not optional here.

**Organization**: Phase 2 (Foundational) is unusually large for this feature because the
RLS helper-function pattern (`docs/design/002-schema.md` §A) and the identity/tenancy
schema are genuinely cross-cutting — every one of the five user stories reads or writes
through the same `memberships`/`organizations` graph and the same `SECURITY DEFINER`
helpers. Splitting foundational RLS work into per-story phases would mean re-deriving the
same recursion-avoidance pattern five times, or worse, having each story loosen it
slightly differently. It is built once, correctly, and CI-asserted once, before any
per-story phase begins.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to US1–US5 from spec.md

## Path Conventions

Single Next.js project (Option 1), per plan.md's Project Structure. Paths below are
exact matches to that section.

---

## Phase 1: Setup

**Purpose**: Project/dependency scaffolding shared by every later phase.

- [ ] T001 Add dependencies to `package.json`: `@supabase/supabase-js`, `@supabase/ssr`,
  `stripe`, `zod` (matches plan.md Technical Context)
- [ ] T002 [P] Create `supabase/config.toml` with local dev settings and
  `additional_redirect_urls` listing localhost + Vercel preview-URL pattern (research.md
  item 4)
- [ ] T003 [P] Create `src/lib/env.ts` — zod schema for
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `ENCRYPTION_KEY`; fails fast at boot, never logs values (ported per research.md)
- [ ] T004 [P] Create `src/lib/utils/logger.ts` — structured logger, no user-content
  fields ever (RULE-L7), ported pattern
- [ ] T005 [P] Add `.env.example` documenting all `src/lib/env.ts` keys with placeholder
  values (no real secrets)
- [ ] T006 [P] Add ESLint `no-restricted-imports` rule banning `src/lib/supabase/service.ts`
  from any file containing `'use client'`

**Checkpoint**: Env/logging/lint scaffolding ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The RLS helper-function pattern, the identity/tenancy/cohort/billing schema,
the three Supabase clients, session refresh, and the RLS-assertion CI harness — every
user story is built on top of this. **No per-story task may begin until this phase's
migrations apply cleanly and the RLS-assertion suite passes.**

**⚠️ CRITICAL**: This is the phase where a mistake is expensive to undo (per plan.md's
Summary). Do not shortcut the hardening rules in `docs/design/002-schema.md` §A.

### Schema — RLS helpers (must exist before any other migration references them)

- [ ] T007 Create migration `supabase/migrations/<ts>_helper_functions.sql`:
  `app_org_ids()`, `app_org_ids_with_role(text[])`, `app_is_org_member(uuid)`,
  `app_has_org_role(uuid, text[])`, `app_co_member_ids()`, `app_visible_student_ids()` —
  all `SECURITY DEFINER`, return `uuid[]`/`boolean`, `SET search_path = public, pg_temp`,
  `REVOKE EXECUTE FROM public; GRANT EXECUTE TO authenticated` (docs/design/002-schema.md §A)

### Schema — identity & tenancy

- [ ] T008 Create migration `supabase/migrations/<ts>_identity_tenancy.sql`:
  `profiles`, `profile_cards` (+ sync trigger from `profiles`), `organizations`
  (`org_types text[]` with `CHECK`), `memberships` (`UNIQUE(org_id, user_id)`, +
  `COMMENT ON TABLE` warning against `FORCE ROW LEVEL SECURITY`), `invitations`
  (`token_hash`, no `SELECT` policy for any role), `integration_connections`
  (`encrypted_credentials` with column-level `REVOKE SELECT`) — RLS policies for every
  table, every write policy with both `USING` and `WITH CHECK`, every `auth.uid()`
  wrapped `(SELECT auth.uid())` (data-model.md, docs/design/002-schema.md §C)
- [ ] T009 In the same or a follow-up migration
  `supabase/migrations/<ts>_org_escalation_triggers.sql`: `trg_prevent_last_owner_removal`
  and `trg_prevent_self_escalation` triggers on `memberships` (FR-008, docs/design/002-schema.md §C)
- [ ] T010 [P] Add `app_create_organization(name text, org_types text[])` `SECURITY
  DEFINER` RPC in the identity/tenancy migration — inserts `organizations` +
  owner `memberships` row transactionally (contracts/org-membership-api.md)
- [ ] T011 [P] Add `app_accept_invitation(raw_token text)` `SECURITY DEFINER` RPC —
  hash lookup, generic-failure error, email-match check, role-union upsert into
  `memberships` (contracts/org-membership-api.md, FR-005/FR-006/FR-007)

### Schema — cohorts

- [ ] T012 Create migration `supabase/migrations/<ts>_cohorts.sql`: `cohorts`,
  `cohort_enrollments` (with `share_signals boolean DEFAULT true`), `cohort_teachers`,
  plus `app_grant_ytt_completion(cohort_id uuid, user_id uuid)` idempotent `SECURITY
  DEFINER` RPC (data-model.md, docs/design/002-schema.md §C)

### Schema — entitlements & billing

- [ ] T013 Create migration `supabase/migrations/<ts>_entitlements_billing.sql`:
  `plan_features`, `stripe_customers`, `subscriptions`, `seat_assignments`,
  `entitlement_grants`, `stripe_events` (RLS enabled, zero policies) (data-model.md,
  docs/design/002-schema.md §C)
- [ ] T014 Add `app_entitlements(user_id uuid)` `SECURITY DEFINER` RPC in the same
  migration — union of subscription/seat/grant, raises `insufficient_privilege` unless
  `user_id = (SELECT auth.uid())` or caller is `service_role` (contracts/entitlements-api.md,
  research.md item 6 — the escalation trap)

### Generated types & drift check

- [ ] T015 [P] Run `supabase gen types typescript` and commit output as
  `src/types/database.ts`
- [ ] T016 [P] Create `scripts/db-types-check.sh` — regenerates types against
  locally-applied migrations, fails on diff; wire into CI (research.md item 5)

### Supabase clients

- [ ] T017 [P] Create `src/lib/supabase/client.ts` — browser client
- [ ] T018 [P] Create `src/lib/supabase/server.ts` — server client bound to request
  cookies, using `getUser()` semantics
- [ ] T019 [P] Create `src/lib/supabase/service.ts` — service-role client,
  `persistSession: false`, module-level `typeof window !== 'undefined'` throw

### Session refresh

- [ ] T020 Create `src/proxy.ts` (NOT `middleware.ts` — research.md item 2): calls
  `getUser()`, returns the same mutated `response` object, matches all app routes
  requiring session awareness

### Encryption

- [ ] T021 [P] Create `src/lib/crypto.ts` — AES-256-GCM versioned envelope (`v1:`
  prefix), ported from NextMove's `crypto.ts` (research.md item 7)

### RLS-assertion CI harness

- [ ] T022 Create `scripts/verify-migrations.sh` — applies every migration from empty
  to a scratch Postgres, then runs assertions as `SET ROLE authenticated` with a forged
  `request.jwt.claim.sub`: cross-org isolation, last-owner-removal `restrict_violation`,
  self-escalation `insufficient_privilege`, `app_entitlements('<other-user>')` raises
  `insufficient_privilege`, bare `SELECT count(*) FROM memberships` does NOT raise `42P17`
  (docs/design/002-schema.md §A/§D, plan.md Verification section)
- [ ] T023 [P] Wire `scripts/verify-migrations.sh` and `scripts/db-types-check.sh` into
  `.github/workflows/ci.yml` as required (non-advisory) checks

**Checkpoint**: `npx supabase db reset` applies cleanly; `scripts/verify-migrations.sh`
passes; `src/types/database.ts` has zero drift. Per-story implementation may now begin.

---

## Phase 3: User Story 1 — Solo practitioner creates an account without losing anything (P1) 🎯 MVP

**Goal**: Sign-up works with zero organization requirement; existing on-device flows are
offered for claiming, never silently discarded or auto-adopted (FR-001, FR-002, FR-020).

**Independent Test**: Sign up on a device with pre-existing local flows; confirm sign-up
succeeds with no org, the claim prompt appears once, and personal features show no
organization/teacher/billing-seat references.

### Tests for User Story 1

- [x] T024 [P] [US1] RLS assertion: a user with zero memberships can read/write their own
  `profiles` row and nothing else, in `scripts/verify-migrations.sh`
- [x] T025 [P] [US1] Component test for the claim-existing-flows prompt appearing exactly
  once in `tests/unit/onboarding/claim-flow-prompt.test.tsx`
- [x] T026 [P] [US1] E2E: sign up with no pre-existing flows → land in a fully personal,
  org-free experience, in `tests/e2e-qa/auth-org-invite.spec.ts` (first scenario in this
  spec file; later phases extend the same file)

### Implementation for User Story 1

- [x] T027 [US1] Create `src/app/auth/callback/route.ts` — PKCE `exchangeCodeForSession`
  + open-redirect guard on `next` (contracts/auth-flows.md)
- [x] T028 [US1] Create `src/app/auth/confirm/route.ts` — OTP `verifyOtp({token_hash,
  type})` (contracts/auth-flows.md)
- [x] T029 [US1] Create `src/app/auth/sign-in/page.tsx` — Google + email sign-in UI
- [x] T030 [US1] Implement the "claim your existing flows" prompt (new component under
  `src/app/onboarding/` or equivalent) — reads existing IndexedDB v1 flows, offers
  explicit claim/decline, never silent (FR-020, Appendix E of the platform-pivot plan)
- [x] T031 [US1] Ensure every personal-feature surface (compose, read, poses) renders
  identically whether or not the signed-in user belongs to any organization — audit and
  fix any component that assumes an org exists

**Checkpoint**: User Story 1 fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 — A certifying body creates an organization and invites a student (P1)

**Goal**: Org creation with kind selection; invitation creation, acceptance, and the
security properties around it (FR-003 through FR-008).

**Independent Test**: Create an org as an admin, invite an email, accept as a different
account, confirm correct role and full cross-org isolation.

### Tests for User Story 2

- [ ] T032 [P] [US2] RLS assertion: a member of Org A gets zero rows querying Org B's
  `memberships`/`invitations`, in `scripts/verify-migrations.sh`
- [ ] T033 [P] [US2] RLS assertion: an invitation has zero `SELECT` visibility for any
  role prior to acceptance, in `scripts/verify-migrations.sh`
- [ ] T034 [P] [US2] Unit test for `app_accept_invitation` role-union-not-duplicate
  behavior in `tests/integration/rls/invitations.test.ts`
- [ ] T035 [P] [US2] Unit test for last-owner-removal and self-escalation trigger
  rejections in `tests/integration/rls/org-escalation.test.ts`
- [ ] T036 [US2] E2E: create org → invite → accept (as new signup) → verify role and
  isolation, extending `tests/e2e-qa/auth-org-invite.spec.ts`

### Implementation for User Story 2

- [ ] T037 [US2] Create `src/app/org/new/page.tsx` — organization creation UI, calls
  `app_create_organization`
- [ ] T038 [US2] Create `src/app/org/[orgId]/members/page.tsx` — membership list + invite
  UI, calls the create-invitation application logic (contracts/org-membership-api.md)
- [ ] T039 [US2] Create `src/app/org/invitations/accept/page.tsx` — acceptance landing
  page, calls `app_accept_invitation`, handles the generic-failure case per FR-005
- [ ] T040 [US2] Implement invitation-creation server logic (route handler or server
  action) generating the raw token, storing only `sha256(token)`, sending the email link
  (contracts/org-membership-api.md)

**Checkpoint**: User Stories 1 AND 2 both independently functional.

---

## Phase 5: User Story 5 — A person's practice data stays theirs no matter who else is in the room (P1)

**Goal**: Prove the privacy boundary is structural before any content table exists
(Principle VIII, FR-009). Placed before US3/US4 despite numbering because it hardens the
membership graph those stories build on top of — this is unusually cheap to verify now
and expensive to discover broken later.

**Independent Test**: Two members of the same org, no explicit sharing configured;
neither can read the other's personal content; only `profile_cards`-level facts and
membership/role are mutually visible.

### Tests for User Story 5

- [ ] T041 [P] [US5] RLS assertion: a co-member can `SELECT` the other's `profile_cards`
  row but gets zero rows from `profiles` directly, in `scripts/verify-migrations.sh`
- [ ] T042 [P] [US5] RLS assertion (placeholder, to be filled in by feature 005 per
  plan.md's Constitution Check row VIII): assert no content table exists that any
  non-owner role can query — passes trivially today, becomes meaningful once `005` lands
- [ ] T043 [US5] E2E: two org members, one views the member list, confirm no personal
  content (flows) is reachable from that view, extending `tests/e2e-qa/auth-org-invite.spec.ts`

### Implementation for User Story 5

- [ ] T044 [US5] Confirm `src/app/org/[orgId]/members/page.tsx` (from T038) renders only
  `profile_cards` data (name) + membership role/status — audit for any accidental join
  against `profiles` or flow data
- [ ] T045 [US5] Add a `COMMENT ON TABLE` (or migration-adjacent doc note) on every
  future-content-table placeholder reminding implementers of the §B structural rule
  before `005` adds `practice_reflections`

**Checkpoint**: The trust foundation is provably in place before cohort/billing work adds
more surface area on top of it.

---

## Phase 6: User Story 3 — Graduation grants a time-boxed membership automatically (P1)

**Goal**: Marking a cohort member graduated immediately and idempotently grants a 90-day
entitlement (FR-010, FR-011, FR-012).

**Independent Test**: Mark a cohort member graduated, confirm immediate entitled access
with a 90-day end date; marking twice does not stack or extend.

### Tests for User Story 3

- [ ] T046 [P] [US3] Unit test for `app_grant_ytt_completion` idempotency (second call is
  a no-op) in `tests/integration/rls/cohort-graduation.test.ts`
- [ ] T047 [P] [US3] Unit test for `app_entitlements()` union correctness — grant +
  active subscription both present, neither lost — in `tests/unit/entitlements/resolve.test.ts`
- [ ] T048 [P] [US3] RLS assertion: a non-authorized org member calling
  `app_grant_ytt_completion` gets `insufficient_privilege`, in `scripts/verify-migrations.sh`
- [ ] T049 [US3] E2E: create cohort → enroll student → mark graduated → verify
  `app_entitlements()` reflects the grant within the same session, extending
  `tests/e2e-qa/auth-org-invite.spec.ts` (the One Om walkthrough's centerpiece)

### Implementation for User Story 3

- [ ] T050 [US3] Create `src/app/org/[orgId]/cohorts/[cohortId]/page.tsx` — cohort
  roster + mark-graduated action, calls `app_grant_ytt_completion`
- [ ] T051 [US3] Create `src/lib/entitlements/index.ts` — wraps `app_entitlements()` in
  React `cache()` (contracts/entitlements-api.md)
- [ ] T052 [US3] Add cohort-enrollment creation to the members/invite flow (T038/T039) so
  a student invited with a cohort context lands enrolled, not just a bare org member

**Checkpoint**: The One Om business loop (invite → accept → graduate → grant) works
end-to-end.

---

## Phase 7: User Story 4 — A practitioner subscribes and manages their own billing (P2)

**Goal**: Self-serve Stripe subscription lifecycle (FR-013 through FR-016).

**Independent Test**: Start checkout, complete payment, confirm entitled access turns on;
cancel and confirm access continues to period end.

### Tests for User Story 4

- [ ] T053 [P] [US4] Unit test: duplicate webhook delivery (same `stripe_event_id`)
  produces exactly one entitlement effect, in `tests/unit/entitlements/webhook-idempotency.test.ts`
- [ ] T054 [P] [US4] Unit test: canceled subscription continues access until
  `current_period_end`, then stops, in `tests/unit/entitlements/cancellation.test.ts`
- [ ] T055 [P] [US4] RLS assertion: `stripe_events` returns zero rows for any role other
  than `service_role`, in `scripts/verify-migrations.sh`
- [ ] T056 [US4] E2E: subscribe → view plan → cancel → confirm access persists to period
  end, in `tests/e2e-qa/auth-org-invite.spec.ts` or a dedicated billing spec

### Implementation for User Story 4

- [ ] T057 [US4] Create `src/app/billing/checkout/route.ts` — Stripe Checkout session
  creation, creates `stripe_customers` row if absent (contracts/billing-webhooks.md)
- [ ] T058 [US4] Create `src/app/billing/page.tsx` — plan view, Stripe customer portal
  link for manage/cancel
- [ ] T059 [US4] Create `src/app/api/webhooks/stripe/route.ts` — signature verification,
  `stripe_events` insert-or-noop idempotency, dispatch on `event.type`
  (contracts/billing-webhooks.md)
- [ ] T060 [US4] Seed `plan_features` rows for the launch plan tier(s)

**Checkpoint**: All five user stories independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T061 [P] Run `quickstart.md` end to end locally, fix any drift between the
  document and actual commands/paths
- [ ] T062 [P] Add copy-lint scan (even though this feature's user-facing strings are
  billing/invitation emails, not sadhana copy) confirming no manufactured-urgency
  language per plan.md's Constitution Check row VII note
- [ ] T063 Verify Lighthouse mobile score on the read view has not regressed below 90
  (RULE-L6) — confirm no render-blocking auth check was added to that path
- [ ] T064 [P] Session-refresh smoke test asserting an actual refreshed cookie value
  across a request boundary, not just a passing build (research.md item 2)
- [ ] T065 Update `CLAUDE.md` if any file path in this feature's Project Structure
  changed during implementation
- [ ] T066 Full run of `npm run test:coverage`, `npm run test:rls`
  (`scripts/verify-migrations.sh`), `npm run db:types:check`, and `npm run test:e2e` —
  all green before merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories. This phase's
  internal order matters: T007 (helpers) before T008 (identity/tenancy policies
  reference the helpers) before T009 (triggers reference `memberships`) before T012
  (cohorts reference org helpers) before T013/T014 (entitlements reference
  memberships/cohorts). T015–T023 can follow once the schema is stable.
- **User Stories (Phase 3–7)**: All depend on Phase 2 completion. Phase 5 (US5) is
  ordered before Phase 6/7 because it hardens the membership graph those stories add
  surface area on top of, but has no hard code dependency preventing reordering.
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories — can be the MVP checkpoint alone
- **US2 (P1)**: Independent of US1 at the data layer; both are needed for the full One
  Om loop
- **US5 (P1)**: Depends on US2's membership graph existing to have something to test
  against, but adds no new schema — pure verification + UI-surface audit
- **US3 (P1)**: Depends on US2 (needs an org + cohort + invited/accepted member to
  graduate)
- **US4 (P2)**: Independent of US2/US3's org graph — a solo user can subscribe with zero
  organizations

### Parallel Opportunities

- All Setup tasks marked [P] run in parallel
- Within Phase 2: T010/T011 (RPCs) parallel with each other once T008 lands; T015–T021
  parallel once the schema migrations are in; T022/T023 depend on all migrations existing
- Each user story's [P]-marked test tasks run in parallel with each other
- US1 and US4 can be staffed in parallel by different people once Phase 2 completes

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) → Phase 2 (Foundational, full) → Phase 3 (US1)
2. **STOP and VALIDATE**: solo sign-up + claim flow works, no regression to the "6am test"
3. Demo-ready: a v0.1 user can create an account without losing anything

### Incremental Delivery (matches the One Om acceptance anchor)

1. Setup + Foundational → foundation ready, RLS-assertion suite green
2. US1 → validate → demo (MVP)
3. US2 → validate → demo (org + invite loop)
4. US5 → validate (privacy boundary proven before more surface area is added)
5. US3 → validate → demo (**the One Om business loop closes here**)
6. US4 → validate → demo (self-serve revenue path)
7. Polish

### Parallel Team Strategy

Once Phase 2 is green: one person on US1, one on US2→US3 (they share the org graph and
are easiest to hand off together), one on US4 (fully independent). US5 is best done by
whoever finishes US2 first, since it's a verification pass on that same surface.
