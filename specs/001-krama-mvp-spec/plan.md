# Implementation Plan: Krama MVP (v0.1)

**Branch**: `001-krama-mvp-spec` | **Date**: 2026-06-22 | **Amended**: 2026-08-17
**Spec**: [spec.md](spec.md) | **Locked spec**: `docs/krama-v0.1-spec.md`

## Amendment note (2026-08-17)

This plan previously described an AI-first three-stage pipeline with a serverless
Anthropic proxy. `docs/krama-v0.1-spec.md` locks a fully deterministic v0.1 instead. This
rewrite drops the AI runtime dependency, adds the friction engine and local storage, and
re-derives the Constitution Check against constitution 2.0.0. See `DECISIONS.md`.

## Summary

Krama is a mobile-first, offline-first Progressive Web App for building and reading yoga
flows. A teacher (in v0.1, primarily a self-practitioner) composes a flow by hand from
the pose library; a build-time-precomputed friction engine derives a seam indicator
between adjacent poses from pure pose geometry; a lightweight validator surfaces two
craft warnings (never blocking); the result renders in a read view built to survive "the
6am test." There is no AI call anywhere in this critical path. All pose data lives in the
repository as version-controlled JSON, loaded at build time. Persistence is entirely
client-side (localStorage/IndexedDB via `idb`); flows export to a single portable,
schema-versioned `.krama.json` file. There is no server component, no database, and no
auth.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Next.js 15/16 (App Router, PWA), Vitest (unit/integration
  tests), Playwright (E2E), Tailwind CSS, `idb` (IndexedDB wrapper), ajv (JSON Schema
  validation), Datadog RUM (telemetry — page views, errors, web vitals only)
**Storage**: localStorage/IndexedDB (client-side, via `idb`) for flows; JSON files in
  repo (build-time pose/flow data); no server-side database
**Testing**: Vitest for unit and integration; Playwright for E2E smoke; unit coverage
  mandatory (100% lines) for the friction engine and validator-lite
**Target Platform**: PWA installable on iOS and Android; mobile-first responsive;
  offline-capable for the read view and Compose after first load
**Project Type**: Web application (Next.js full-stack, statically generated pose/flow
  data, zero server-side runtime dependency for the core loop)
**Performance Goals**: Lighthouse mobile score ≥ 90 on the read view; friction pair
  matrix precomputed at build time (no runtime calculation cost in Compose)
**Constraints**: No server-side database; no auth; no login; no user accounts; API key
  handling is moot — there is no AI call in v0.1; pose and flow library bundled at build
  time (not runtime fetch)
**Scale/Scope**: Single-user local-first; no concurrent user requirements; pose library
  ~63 poses (superset per `DECISIONS.md`); flows up to ~30 items across 6 phases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*
*Re-derived against constitution 2.0.0 (2026-08-17). See `.specify/memory/constitution.md`.*

| Rule | Status | Notes |
|------|--------|-------|
| RULE-S1 Safety layer runs last, nothing shown before validation | ✅ PASS (v0.1 scope) | No constraint input in v0.1; validator-lite runs before render, warnings only |
| RULE-S2 Contraindications remove/replace, never warn | ✅ PASS (v0.1 scope note) | Nothing to enforce yet — no roster/constraint input exists. Deferred to v0.2 roster |
| RULE-S3 Safety-relevant code pure TypeScript, fully unit-tested | ✅ PASS | Friction engine + validator-lite, 100% line coverage |
| RULE-S4 Rules + safety work without AI | ✅ PASS | Trivially true — v0.1 has no AI path at all |
| RULE-S5 Unavailable props block poses | 🟡 DEFERRED | No props-availability input in v0.1; carried to v0.2 |
| RULE-T1 Every app-proposed item has "why" | ✅ PASS (rescoped) | Applies to friction `reasons[]`, not teacher-authored notes |
| RULE-T2 Every pose has at least one alternate | 🟡 DEFERRED to v0.2 | No alternates surface in v0.1 (no Suggest button yet) |
| RULE-T3 Every transition has "why" | ✅ PASS (rescoped) | Seam indicator's `reasons[]` satisfies this for app-derived content |
| RULE-T4 Hold times/notes editable without regen | ✅ PASS | Compose edits are direct, no regeneration step exists |
| RULE-T5 No field is un-overridable | ✅ PASS | Teacher-authored fields are the only fields; all are editable |
| RULE-H1 (III) Deterministic engine runs after teacher input, ahead of render | ✅ PASS | Compose → friction engine → validator-lite → read view |
| RULE-H2 AI (when present) is untrusted, proposes only | N/A in v0.1 | No AI in this build; rule binds when v0.2's Suggest returns |
| RULE-H3 Deterministic engine has final authority over structure | ✅ PASS | No AI output exists to override in v0.1 |
| RULE-H4 (weights) Friction weights live in one exported constant | ✅ PASS | `src/lib/friction/index.ts` exports `WEIGHTS` |
| RULE-H5 Deterministic layer works standalone | ✅ PASS | Trivially true — it's the only layer |
| RULE-E1 Theme/energetic framing on app-generated content | 🟡 DEFERRED to v0.2 | No theme-generation surface in v0.1 |
| RULE-E2 Intensity curve validated for audience | 🟡 DEFERRED to v0.2 | No roster/audience input in v0.1 |
| RULE-E3 "Why" references measured deltas, not invented | ✅ PASS | Friction `reasons[]` derived only from Tier-1 geometry deltas |
| RULE-E4 Transitions semantically connected | ✅ PASS | Friction engine scores every adjacent pair |
| RULE-O1 No paywall | ✅ PASS | No auth, no payment anywhere in the app |
| RULE-O2 Pose library in repo as plaintext | ✅ PASS | JSON in `/data/poses` |
| RULE-O3 Every pose has attribution | ✅ PASS | `source` field, CI-enforced |
| RULE-O4 No copyrighted material without license | ✅ PASS | CI validation required |
| RULE-O5 Contributing guide + CI validation | ✅ PASS | `CONTRIBUTING.md` + schema validation in CI |
| RULE-L1 Installable PWA | ✅ PASS | `public/manifest.json`, service worker |
| RULE-L2 Offline core functionality | ✅ PASS | Compose + read view work offline after first load |
| RULE-L3 Pose + flow library bundled at build | ✅ PASS | Static JSON import; `data/flows/*.krama.json` |
| RULE-L4 No auth required | ✅ PASS | Local-first, no accounts anywhere |
| RULE-L5 Graceful degradation | ✅ PASS | No AI dependency to degrade from in v0.1 |
| RULE-L6 Lighthouse ≥ 90 on the read view | ✅ PASS | SC-008 |
| RULE-L7 Telemetry never carries user content | ✅ PASS | Datadog RUM scoped to page views/errors/web vitals only |

**Post-design re-check**: All applicable rules pass. Five rules (S5, T2, E1, E2, and
RULE-H2's binding half) are explicitly deferred to v0.2 because v0.1 ships no
roster/constraint input and no AI proposal stage for them to apply to — not because they
were weakened. See `DECISIONS.md` and the spec's "Deferred to v0.2" appendix.

## Project Structure

### Documentation (this feature)

```text
specs/001-krama-mvp-spec/
├── plan.md                    # This file
├── research.md                # Phase 0 output
├── data-model.md              # Phase 1 output
├── quickstart.md              # Phase 1 output
├── contracts/
│   ├── friction-engine.md     # friction() signature, weights, reason templates
│   ├── flow-file-format.md    # .krama.json schema + schema_version handling
│   ├── pose-library-schema.md # JSON schema for pose records, Tier-1/Tier-2
│   └── pipeline-api.md        # PARKED — v0.2 AI proposal contract, see DECISIONS.md
└── tasks.md                    # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
data/
├── poses/               # Pose library JSON files, one per pose (~63)
├── flows/               # Built-in flows as .krama.json (3 in v0.1)
├── meridians/           # Meridian/Five-Element mapping data (Tier-2, parked from lenses UI)
├── quotes/              # Quote collection with attribution
└── schemas/             # JSON Schema files for CI validation

src/
├── app/
│   ├── page.tsx                 # Home: today's flow, new flow, built-ins
│   ├── compose/                 # Manual flow composition
│   ├── flows/                   # Flow library (saved + built-in), [id] detail
│   ├── read/[id]/                # Read view (the 6am artifact) + print stylesheet
│   ├── poses/                    # Pose library browse/detail (unchanged from existing)
│   ├── learn/                    # Stub tab ("soon")
│   ├── dimensions/  (parked)      # v0.2 AI-era dimension input — not in nav
│   ├── sequence/     (parked)     # v0.2 legacy sequence review/export — not in nav
│   ├── sequences/    (parked)     # v0.2 legacy reference sequence list — not in nav
│   └── api/generate/ (parked)     # v0.2 AI proposal serverless route — not called
├── components/
│   ├── layout/          # AppHeader (five-tab nav: Home/Compose/Flows/Poses/Learn)
│   ├── compose/          # Search-add, item row, phase group, layer chips, seam indicator
│   ├── read/              # Phase section, breath-mark notation, print layout
│   └── poses/            # PoseCard, detail sections (unchanged)
├── lib/
│   ├── friction/          # friction(), WEIGHTS constant, reason templates, pair-matrix build script
│   ├── validator/          # validator-lite: laterality + no-closing-stillness warnings
│   ├── storage/            # localStorage/IndexedDB via idb; .krama.json export/import
│   ├── flow/                # Flow, FlowItem, Phase, Block types (renamed from pipeline/Sequence)
│   ├── pose-library/        # Pose data access layer (build-time JSON) — unchanged
│   ├── pipeline/  (parked)   # v0.2 AI pipeline stages — see README.md in this dir
│   └── reference-sequences/ (parked) # superseded by data/flows/*.krama.json
└── data/                     # re-export of /data for build-time access

tests/
├── unit/
│   ├── friction/            # Friction engine unit tests (100% line coverage, mandatory)
│   ├── validator/            # Validator-lite unit tests (100% line coverage, mandatory)
│   ├── storage/               # .krama.json export/import round-trip
│   └── pose-library/          # Pose library schema validation tests
├── integration/                # Compose → save → export → import flows
└── e2e/                        # Playwright smoke tests keyed to docs/krama-guardrails.md

public/
├── manifest.json        # PWA manifest
└── sw.js                 # Service worker
```

**Structure Decision**: Next.js App Router web application, single codebase, no server
component in the critical path. The friction engine and validator-lite live in
`src/lib/friction/` and `src/lib/validator/`; both are pure, synchronous TypeScript with
no I/O. The parked AI pipeline (`src/lib/pipeline/`, `/api/generate`, `/dimensions`,
`/sequence`, `/sequences`) stays on disk, unlinked from nav, per `DECISIONS.md` — it is
the starting point for v0.2's Suggest button, not dead code to be deleted.

## Complexity Tracking

No constitution violations. Deferred rules (S5, T2, E1, E2) are scope notes, not
violations — they apply to inputs/stages that don't exist in v0.1 and therefore have
nothing to check yet. No complexity justification required.
