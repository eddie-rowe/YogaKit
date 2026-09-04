# Yoga Kit — Development Guide

<!-- SPECKIT START -->
`docs/krama-v0.1-spec.md` is the historical, human-facing spec for the original
local-first v0.1 product — it is superseded (not deleted) by the v1.0 platform pivot.
For the current plan, read: `specs/004-sequencing-composer/plan.md`

The v1.0 platform pivot (multi-tenant, authenticated, billed) ships as five product
features, in dependency order: `002-auth-tenancy-billing` → `003-pose-library` →
`004-sequencing-composer` → `005-daily-sadhana` → `006-profile-settings`. The full
approved plan (schema design, reference-implementation patterns, verification checklist)
lives at `/Users/eddie.rowe/.claude/plans/i-met-with-giaconda-declarative-dewdrop.md`.

Three further features carry the operating patterns ported from
`docs/BEST_PRACTICES_FROM_NEXTMOVE.md`, and are not part of the product ladder above:
`007-autonomous-operations` (headless-session done-gates and work consumption),
`008-observability-as-code` (monitors/SLOs as version-controlled manifests), and
`009-voice-and-copy-lint` (the RULE-C5 copy-lint). **`009` US1/US2 shipped in `448ee6a`**:
`npm run lint:copy` is a blocking CI job, which clears the hard prerequisite it held over
`005`. `009` US3 (operational-writing checks, P2) is still open.

Key artifacts:
- Constitution (non-negotiables):       `.specify/memory/constitution.md` (v3.0.0)
- Historical v0.1 spec (superseded):    `docs/krama-v0.1-spec.md`
- Pose field dictionary + tiers:        `docs/krama-atlas.md`
- UI/testid guardrails:                 `docs/krama-guardrails.md`
- v0.1 spec/plan (machine-facing, historical): `specs/001-krama-mvp-spec/`
- 002 spec (auth/tenancy/billing):       `specs/002-auth-tenancy-billing/spec.md`
- 002 plan + schema design:              `specs/002-auth-tenancy-billing/plan.md`,
  `docs/design/002-schema.md`
- 003 spec + plan (pose library):        `specs/003-pose-library/spec.md`,
  `specs/003-pose-library/plan.md`, `specs/003-pose-library/tasks.md`
- 003 copy awaiting sign-off:            `specs/003-pose-library/contracts/theme-taxonomy.md`,
  `specs/003-pose-library/contracts/score-explanation.md`
- 004 spec + plan (sequencing composer):  `specs/004-sequencing-composer/spec.md`,
  `specs/004-sequencing-composer/plan.md`, `specs/004-sequencing-composer/research.md`,
  `specs/004-sequencing-composer/data-model.md`, `specs/004-sequencing-composer/tasks.md`
- 004 author-boundary contract:           `specs/004-sequencing-composer/contracts/flow-sharing.md`
- UX design research (21 reports):      `docs/design-research/README.md`
- Per-feature staged UX decisions:      `specs/00{3,4,5,6}-*/design-input.md`
- Voice standard (product + ops copy): `VOICE.md` — the authority the copy-lint encodes;
  checked rules live as data in `data/voice/voice-rules.json`
- Ported operating patterns:            `docs/BEST_PRACTICES_FROM_NEXTMOVE.md`
- Running friction log:                 `FRICTION.md`
- Why-we-chose log:                     `DECISIONS.md`
<!-- SPECKIT END -->

## Non-negotiables (from constitution v3.0.0)

- The friction engine and validator-lite stay fully deterministic and client-side, no
  matter what else moves to a server: no AI call, no database read/write, no network
  call, anywhere in their path (Principle III, RULE-H6). The parked AI-proposal stage
  from v0.2 remains parked — see `DECISIONS.md`.
- The friction engine is a pure function over Tier-1 pose geometry; its weights live in
  one exported constant (tuning is data, not code).
- The engine derives structure with reasoning; it never authors cues, movement names, or
  teacher voice.
- Friction engine and validator-lite: 100% unit test line coverage, mandatory (CI-enforced
  via `vitest run --coverage`).
- Pose library lives in `data/poses/` as version-controlled JSON, tagged by entry tier
  (Tier-1 required, Tier-2 backfilled opportunistically). CI validates schema and Tier-1
  completeness. This data stays readable with no account, subscription, or entitlement,
  even though the application is commercial as of v1.0 (RULE-O6/O7).
- v1.0 introduces accounts, organizations, and Postgres as the source of truth for
  user-authored data — but auth is required only to *write*; reading a flow already in
  the client-side cache MUST work offline, with no login (RULE-L3/L4, the "6am test").
- Practice *content* (journal, reflections, mood/energy, flow notes) is visible only to
  its author, enforced at the table/RLS layer, never by application code. Practice
  *signals* (check-in dates, streaks, milestones) may be visible to a cohort teacher by
  default, revocable in one interaction (Principle VIII).
- No streak may reset to zero; no lapse copy may use guilt, shame, urgency, or a
  countdown (Principle VII, CI-enforced by copy-lint).
- Telemetry (Datadog RUM) carries page views, errors, and web vitals only — never
  pose/flow/note/journal content.

## Commands

```bash
npm run dev           # start dev server
npm test              # all tests
npm run validate:poses # validate pose library JSON against schema (+ Tier-1 completeness report)
npm run test:e2e      # Playwright E2E
```

## Engine order (immutable, v0.1)

Teacher composes → friction engine derives seam indicators → validator-lite warns (never
blocks) → read view. No AI in this path. When AI returns in v0.2 (Suggest button), it may
only propose — the deterministic engine and any safety layer stay downstream and
authoritative (constitution Principle III).
