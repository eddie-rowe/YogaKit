# Implementation Plan: Auth, Tenancy & Billing Foundation

**Branch**: `002-auth-tenancy-billing` | **Date**: 2026-08-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-auth-tenancy-billing/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Establish the identity, organization, entitlement, and billing substrate the rest of the
v1.0 platform pivot builds on: accounts (solo or organization-affiliated), a many-to-many
organization graph (schools/studios/certifying bodies, memberships, invitations), a
unified entitlement resolver (personal subscription ∪ org seat ∪ time-boxed grant), and
Stripe-backed billing. The concrete acceptance loop is One Om School of Yoga creating an
org and cohort, inviting a student, the student accepting, One Om marking them graduated,
and that action producing a 90-day entitlement grant — all while a solo v0.1 user's
existing local-first flows keep working exactly as before. Technical approach: Next.js
App Router (existing stack) + Supabase (Postgres, Auth) for identity/tenancy/billing
tables and RLS, Stripe for payment lifecycle, ported and hardened patterns from the
NextMove reference implementation (three-client Supabase split, `SECURITY DEFINER` RLS
helpers generalized from single-tenant to many-to-many, `verify-migrations.sh`-style RLS
assertions in CI) — explicitly fixing the four gaps NextMove has (no generated types, no
session-refreshing middleware, no committed `supabase/config.toml`, no `/auth/callback`).

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js (App Router, matches `001`'s existing stack), Node.js runtime (Vercel, Fluid Compute)
**Primary Dependencies**: `@supabase/supabase-js` + `@supabase/ssr` (three-client split: browser, server-with-cookies, service-role), Stripe SDK (`stripe` Node package), `zod` (env schema validation, request/webhook payload validation)
**Storage**: Supabase Postgres (source of truth for accounts, organizations, memberships, invitations, entitlements, billing records); IndexedDB remains the existing local read cache for flows (unchanged by this feature — `003`/`004` migrate flow storage itself)
**Testing**: Vitest (existing unit suite, unaffected by this feature — friction engine and validator-lite stay untouched per Principle III); a new RLS-assertion suite run against bare Postgres in CI (ported from NextMove's `scripts/verify-migrations.sh` pattern, extended for the many-to-many org graph); Playwright for the auth/invite-acceptance E2E smoke path (`playwright.config.qa.ts`)
**Target Platform**: Web (mobile-first, existing PWA), deployed on Vercel; Supabase project for Postgres + Auth
**Project Type**: Web application (Next.js monolith — no separate backend/frontend split; API routes and Server Components live in `src/app/`)
**Performance Goals**: Sign-up-to-usable-account in under 60 seconds (SC-001); entitlement change reflected within 5 seconds of a graduation action (SC-004); no regression to the existing Lighthouse mobile score ≥ 90 on the read view (constitution RULE-L6 — this feature must not add render-blocking auth checks to the read path)
**Constraints**: Auth required to write, never to read a cached flow (RULE-L4); pose/meridian/quote data readable with zero entitlement check (RULE-O6/O7); friction engine and validator-lite MUST remain untouched, zero DB/network dependency (RULE-H6); every `SECURITY DEFINER` RLS helper MUST pin `search_path` and be revoked from `public`/granted to `authenticated` only; every write RLS policy MUST carry both `USING` and `WITH CHECK`
**Scale/Scope**: Initial launch scale is small (one certifying-body customer, One Om, plus existing solo users) but the org graph MUST be many-to-many from day one (a studio that is also a certifying body is one org with two kinds) — this is a correctness requirement, not a performance one, since NextMove's single-tenant-per-user model does not transfer

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against constitution v3.0.0 (`.specify/memory/constitution.md`):

| Principle | Check | Result |
|---|---|---|
| I. Safety is Sovereign | Not applicable — this feature adds no sequence-generation or safety logic. | PASS (N/A) |
| II. The Teacher Decides; the App Proposes | Not applicable — no app-generated sequencing content in this feature. | PASS (N/A) |
| III. Deterministic Authority, AI Optional | RULE-H6 requires the friction engine and validator-lite have zero DB/network dependency. This feature does not touch `src/lib/friction/` or `src/lib/validator/` at all — it only adds identity/org/billing tables and code paths that are disjoint from the sequencing pipeline. | PASS |
| IV. Embodied Intelligence | Not applicable — no sequencing content. | PASS (N/A) |
| V. Open Data, Sustainable Product | RULE-O6 requires pose/meridian/quote data stay readable with no account/subscription/entitlement, and any server mirror be a one-way generated artifact. RULE-O7 requires entitlement logic gate features only, never open data or a user's own records. This feature does not touch `data/poses/`; the `app_entitlements()` resolver and its call sites are scoped to gating cloud/org features, and FR-017/FR-018 explicitly require open-data and own-content reads stay entitlement-free. | PASS |
| VI. Lightweight and Accessible | RULE-L3/L4 require the pose library stay static/bundled (untouched here) and require auth-to-write-never-to-read for cached data. This feature's entitlement/auth logic must not gate reading a flow already in the IndexedDB cache — FR-018 encodes this. RULE-L7 (telemetry carries no user content) applies to any new instrumentation this feature adds (auth events, billing events) — must log event *types*, never identifying payloads. | PASS, with an explicit design constraint carried into data-model.md and research.md |
| VII. Compassion Over Compliance | Not applicable — this feature has no Daily Sadhana copy surface (streaks, lapse prompts). Any user-facing copy this feature does add (invitation emails, billing emails) is not sadhana-specific and outside RULE-C5's copy-lint scope, but MUST still avoid manufactured urgency (e.g., no fake "invitation expires in 2 hours!" countdown pressure). | PASS (N/A for the CI copy-lint gate; informal note carried into UX) |
| VIII. Consent-Scoped Visibility | RULE-V1/V2 require practice *content* tables have no column a policy could join against org/cohort/teacher; RULE-V9 (V5) requires a CI test proving a teacher cannot read a student's content. This feature does not create any content table (no journal/reflection table exists yet — that's `005`), but it DOES create the org/cohort/membership graph those future tables will attach to. The design must make the *coming* content/signal split possible without a later migration fighting this feature's schema — see `docs/design/002-schema.md` §B for the structural argument, stubbed into this feature as a placeholder RLS test asserting the *absence* of any content table teachers can query, to be filled in by `005`. | PASS, with a forward-compatibility obligation carried into Phase 1 design |

No violations requiring Complexity Tracking justification.

**Post-Phase-1 re-check**: See `research.md` and `data-model.md` — the design does not introduce any content table, keeps the pose mirror as a one-way generated artifact with a single `service_role`-only write path, and every helper function follows the `SECURITY DEFINER` hardening rules. Re-affirmed: PASS on all rows above.

## Project Structure

### Documentation (this feature)

```text
specs/002-auth-tenancy-billing/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── auth-flows.md
│   ├── org-membership-api.md
│   ├── entitlements-api.md
│   └── billing-webhooks.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)

docs/design/
└── 002-schema.md         # Full schema design (this plan's Phase 1, reproduced from the
                           # approved platform-pivot plan's Appendix A/B/C/D/F/G)
```

### Source Code (repository root)

This is **Option 1: single project**, matching the existing `001` structure — Next.js
App Router monolith, no separate backend/frontend split. New code for this feature is
additive to the existing tree:

```text
src/
├── app/
│   ├── auth/
│   │   ├── callback/route.ts       # PKCE exchangeCodeForSession (NEW — NextMove lacks this)
│   │   ├── confirm/route.ts        # OTP verifyOtp for email-link flow (NEW)
│   │   └── sign-in/page.tsx        # Google + email sign-in UI (NEW)
│   ├── org/
│   │   ├── new/page.tsx            # Create-organization flow (NEW)
│   │   ├── [orgId]/
│   │   │   ├── members/page.tsx    # Membership list, invite UI (NEW)
│   │   │   └── cohorts/
│   │   │       └── [cohortId]/page.tsx  # Cohort roster, mark-graduated action (NEW)
│   │   └── invitations/
│   │       └── accept/page.tsx     # Invitation acceptance landing page (NEW)
│   ├── billing/
│   │   ├── page.tsx                 # Plan view, manage/cancel entry point (NEW)
│   │   └── checkout/route.ts        # Stripe Checkout session creation (NEW)
│   └── api/
│       └── webhooks/
│           └── stripe/route.ts      # Stripe webhook receiver + stripe_events ledger (NEW)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client (NEW, ported pattern)
│   │   ├── server.ts                 # Server client w/ cookies (NEW, ported pattern)
│   │   └── service.ts                # service_role client, server-only guard (NEW)
│   ├── entitlements/
│   │   └── index.ts                  # Wraps app_entitlements() in React cache() (NEW)
│   ├── env.ts                        # zod env schema, fail-fast at boot (NEW, ported)
│   ├── crypto.ts                     # AES-256-GCM envelope for integration_connections (NEW, ported)
│   └── utils/
│       └── logger.ts                 # Structured logger, Datadog trace correlation (NEW, ported)
├── proxy.ts                          # Session refresh (NOT middleware.ts — see research.md
│                                      # on Next 16.2.9's dual-filename gotcha) (NEW)
├── types/
│   └── database.ts                   # `supabase gen types typescript` output, committed (NEW)
├── lib/friction/                     # UNCHANGED — no DB dependency added (Principle III)
├── lib/validator/                    # UNCHANGED — no DB dependency added (Principle III)
└── lib/pose-types.ts                 # UNCHANGED

supabase/
├── config.toml                       # Committed, with preview-URL redirect allowlist (NEW)
└── migrations/
    ├── <ts>_helper_functions.sql      # SECURITY DEFINER RLS helpers (NEW)
    ├── <ts>_identity_tenancy.sql      # profiles, profile_cards, organizations, memberships,
    │                                  # invitations, integration_connections (NEW)
    ├── <ts>_cohorts.sql                # cohorts, cohort_enrollments, cohort_teachers (NEW)
    ├── <ts>_entitlements_billing.sql   # plan_features, stripe_customers, subscriptions,
    │                                  # seat_assignments, entitlement_grants, stripe_events (NEW)
    └── <ts>_org_escalation_triggers.sql # last-owner / self-promotion guard triggers (NEW)

scripts/
├── verify-migrations.sh              # RLS isolation assertions, ported + extended (NEW)
└── db-types-check.sh                 # CI drift check for src/types/database.ts (NEW)

tests/
├── unit/entitlements/                # app_entitlements() resolution logic (client-side wrapper) (NEW)
├── integration/rls/                  # Cross-tenant isolation, last-owner, invitation-reuse cases (NEW)
└── e2e-qa/auth-org-invite.spec.ts    # Sign up → create org → invite → accept → graduate walk (NEW)
```

**Structure Decision**: Single Next.js project (Option 1), extending the existing `001`
tree in place per the plan's "evolve YogaKit, don't fork" decision. All new server-only
code (service-role client, webhook handlers, migrations) is additive under `src/lib/`,
`src/app/api/`, and `supabase/`; nothing in `src/lib/friction/` or `src/lib/validator/`
is touched, keeping Principle III's isolation intact.

## Complexity Tracking

*No entries — no Constitution Check violations required justification.*
