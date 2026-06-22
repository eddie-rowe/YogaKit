# Implementation Plan: Krama MVP

**Branch**: `001-krama-mvp-spec` | **Date**: 2026-06-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-krama-mvp-spec/spec.md`

## Summary

Krama is a mobile-first Progressive Web App for yoga teachers. A three-stage hybrid
pipeline — AI proposal → deterministic rules engine → safety validation — generates
safe, coherent sequences across multi-dimensional inputs. All pose data, meridian
mappings, and quotes live in the repository as version-controlled JSON, loaded at build
time. Persistence is client-side only in v1 (IndexedDB). The only server component is
a single serverless function proxying the Anthropic API; the AI key never reaches the
client. The deterministic rules engine and safety layer are fully unit-tested and
operate independently of the AI layer.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Next.js 15 (App Router, PWA), Anthropic SDK (server-side
  only), Vitest (unit tests), Tailwind CSS, Radix UI (accessible primitives)
**Storage**: IndexedDB (client-side, via idb library); JSON files in repo (build-time
  data); no server-side database in v1
**Testing**: Vitest for unit and integration; Playwright for E2E; unit coverage
  mandatory for rules engine and safety layer
**Target Platform**: PWA installable on iOS and Android; mobile-first responsive;
  offline-capable for saved sequences and the timer view
**Project Type**: Web application (Next.js full-stack, statically generated data,
  serverless AI proxy)
**Performance Goals**: AI-assisted generation < 30 seconds (P95); rules-engine-only
  fallback < 5 seconds; Lighthouse mobile score ≥ 90 on the sequence-delivery view
**Constraints**: No server-side database; no auth; no login; no user accounts in v1;
  API key server-side only; pose library bundled at build time (not runtime fetch)
**Scale/Scope**: Single-user local-first in v1; no concurrent user requirements;
  pose library ~40–200 poses at P1 seed; sequences up to ~20 poses

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| RULE-S1 Safety layer runs last, sequence not shown before validation | ✅ PASS | serverless handler enforces order |
| RULE-S2 Contraindications remove/replace, never warn | ✅ PASS | FR-015, FR-015a |
| RULE-S3 Safety layer pure TypeScript, fully unit-tested | ✅ PASS | Vitest; adversarial tests required |
| RULE-S4 Rules + safety work without AI | ✅ PASS | FR-006 fallback |
| RULE-S5 Unavailable props block poses | ✅ PASS | FR-005, FR-009 |
| RULE-T1 Every pose has "why" | ✅ PASS | FR-012 |
| RULE-T2 Every pose has at least one alternate | ✅ PASS | FR-018 |
| RULE-T3 Every transition has "why" | ✅ PASS | FR-013 |
| RULE-T4 Hold times/cues editable without regen | ✅ PASS | FR-019 |
| RULE-T5 No field is un-overridable | ✅ PASS | FR-019 |
| RULE-H1 Three discrete stages with typed interfaces | ✅ PASS | see data-model.md |
| RULE-H2 Rules engine runs before safety layer | ✅ PASS | pipeline enforced in handler |
| RULE-H3 Safety-corrected version shown, not AI draft | ✅ PASS | |
| RULE-H4 AI treated as untrusted | ✅ PASS | FR-006c |
| RULE-H5 Fallback to rules engine on AI unavailability | ✅ PASS | FR-006 |
| RULE-E1 Theme maps to body focus + meridian + framing | ✅ PASS | FR-007 |
| RULE-E2 Intensity curve validated for audience | ✅ PASS | FR-015 + FR-015a |
| RULE-E3 "Why" references teacher dimensions | ✅ PASS | FR-012 |
| RULE-E4 Transitions semantically connected | ✅ PASS | FR-013 |
| RULE-O1 No paywall | ✅ PASS | architecture: no auth, no payment |
| RULE-O2 Pose library in repo as plaintext | ✅ PASS | JSON in /data |
| RULE-O3 Every pose has attribution | ✅ PASS | FR-009 slug + source fields |
| RULE-O4 No copyrighted material without license | ✅ PASS | CI validation required |
| RULE-O5 Contributing guide + CI validation | ✅ PASS | schema validation in CI |
| RULE-L1 Installable PWA | ✅ PASS | Next.js PWA config |
| RULE-L2 Offline core functionality | ✅ PASS | service worker + IndexedDB |
| RULE-L3 Pose library bundled at build | ✅ PASS | static JSON import |
| RULE-L4 No auth required for P1/P2 | ✅ PASS | local-first |
| RULE-L5 AI failure = graceful fallback | ✅ PASS | FR-006 |
| RULE-L6 Lighthouse ≥ 90 on delivery view | ✅ PASS | SC-010, performance goal |

**Post-design re-check**: All 29 rules pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-krama-mvp-spec/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── pipeline-api.md  # Serverless generate endpoint contract
│   └── pose-library-schema.md  # JSON schema for pose records
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
data/
├── poses/               # Pose library JSON files (one per pose or grouped)
├── meridians/           # Meridian/Five-Element mapping data
├── quotes/              # Quote collection with attribution
└── schemas/             # JSON Schema files for CI validation

src/
├── app/                 # Next.js App Router pages and layouts
│   ├── page.tsx         # Home / dimension input
│   ├── sequence/        # Sequence review and editing
│   ├── deliver/         # Timer / teleprompter view
│   └── library/         # Saved sequence library (P2)
├── components/          # Shared UI components
│   ├── dimensions/      # Dimension input controls
│   ├── sequence/        # Sequence display, pose card, swap modal
│   ├── deliver/         # Timer, progress bar, cue card
│   └── export/          # Cue sheet print view
├── lib/
│   ├── session/         # Session defaults and context resolution
│   │   └── defaults.ts  # resolveDefaults() — fills unset dimensions with sensible values
│   ├── pipeline/        # The three-stage pipeline
│   │   ├── types.ts     # Shared TypeScript interfaces between stages
│   │   ├── propose.ts   # Stage 1: AI proposal (server-side only)
│   │   ├── constrain.ts # Stage 2: Rules engine (deterministic)
│   │   └── validate.ts  # Stage 3: Safety layer (deterministic, final authority)
│   ├── pose-library/    # Pose data access layer (build-time JSON)
│   ├── meridians/       # Meridian/element data access
│   └── storage/         # IndexedDB wrappers for local persistence (P2)
├── app/api/
│   └── generate/        # Route handler: serverless AI proxy + pipeline orchestrator
└── data/                # (symlink or re-export of /data for build-time access)

tests/
├── unit/
│   ├── pipeline/        # Rules engine and safety layer unit tests (mandatory)
│   └── pose-library/    # Pose library data validation tests
├── integration/         # End-to-end pipeline tests with mocked AI
└── e2e/                 # Playwright browser tests for critical UI flows

public/
├── manifest.json        # PWA manifest
└── sw.js                # Service worker (generated)
```

**Structure Decision**: Next.js App Router web application. Single codebase — no
separate backend repo. The pipeline lives in `src/lib/pipeline/`; the serverless Route
Handler in `src/app/api/generate/` is the only server component. Pose data in `/data/`
is committed to the repository and imported at build time, not fetched at runtime.

## Complexity Tracking

No constitution violations. No complexity justification required.
