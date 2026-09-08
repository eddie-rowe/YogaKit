# Implementation Plan: Observability as Code

**Branch**: `datadog-integration` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-observability-as-code/spec.md`

## Summary

YogaKit ships one 28-line RUM component today, and it has never actually initialized in
production — its env var names don't match anything configured. This plan turns
telemetry on for real, for the first time, and wraps it in the declarative,
diff-then-apply discipline `docs/BEST_PRACTICES_FROM_NEXTMOVE.md` §B5 ported from a
working 30-day-unattended reference implementation: monitors and SLOs as version-controlled
JSON manifests (`datadog/`), applied by a dry-run-first sync tool
(`scripts/datadog/sync.mjs`), documented by one guide (`docs/OBSERVABILITY.md`) that
states the content-free invariant before any query detail, and enforced by an automated
check (`scripts/check-telemetry-content-free.mjs`) rather than by convention.

Scope for this pass, per owner direction (see `research.md`): target `us5.datadoghq.com`
with this repo's own `.env.local` credentials; full parity with NextMove's manifest
types (monitors, SLOs, synthetics, dashboards, logs-metrics, service-catalog) — which
amends the spec's stated dashboard exclusion, recorded in `DECISIONS.md`; add
`@vercel/otel` server tracing so the availability SLO measures something real; create the
YogaKit RUM application in Datadog as part of this work; and ship the `/autoobs` command
runnable by hand, with Feature 007's full scheduler/digest loop left out.

**This pass ships US1, US2, and US4.** US3 (the observability guide) ships as a
byproduct of US1/US2/US4 rather than a separate phase, because FR-016-019 describe one
document, not a fourth deliverable.

## Technical Context

**Language/Version**: Node 22 ESM (`.mjs` scripts, matching `copy-lint.mjs` /
`validate-poses.mjs`), TypeScript 5.x for the app-side instrumentation
**Primary Dependencies**: `@datadog/browser-rum` (already present, v7.8.0) +
`@datadog/browser-rum-nextjs` (NEW) for client RUM; `@vercel/otel` + `@opentelemetry/api`
(NEW) for server tracing; no new dependency for the sync tool or the content-free check —
both are plain `.mjs`, matching the repo's existing script pattern
**Storage**: `datadog/**/*.json` manifests, version-controlled; no database changes
**Testing**: Vitest, in memory. `scripts/lib/datadog-sync.mjs` and
`scripts/lib/telemetry-check.mjs` join `vitest.config.ts`'s `coverage.include` allow-list
at the existing 100% threshold
**Target Platform**: Vercel (Next.js 16 App Router) for the app; developer's terminal +
CI for the sync tool and content-free check
**Project Type**: Web app (single Next.js project) plus repository tooling
**Constraints**: RULE-L7 (telemetry carries page views/errors/web vitals only — never
pose/flow/note/journal content); RULE-L6 (Lighthouse mobile ≥90 on the read view — bounds
added client weight); RULE-H6 (no telemetry call in the friction engine or
validator-lite path); FR-026 (existing RUM posture — full sampling, replay off,
interaction/resource/long-task tracking off, `mask` privacy — is a floor, not
renegotiable); FR-003 (no tool mode mutates live config without an explicit `--apply`)
**Scale/Scope**: ~28 manifest files across 6 object types; one sync tool; one content-free
check; one observability guide; RUM + APM wired into a Next.js app with no prior working
telemetry

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against constitution v3.0.0 (`.specify/memory/constitution.md`):

| Principle | Check | Result |
|---|---|---|
| I. Safety is Sovereign | No sequencing or safety logic touched. | PASS (N/A) |
| II. The Teacher Decides | No AI proposal path touched. | PASS (N/A) |
| III. Deterministic Authority, AI Optional | No AI call anywhere in the telemetry, sync, or check path. The sync tool's diff/apply is deterministic; the content-free check is pure pattern matching, not an LLM call. | PASS |
| IV. Embodied Intelligence | No teacher-voice authoring. Alert message bodies are identifier-only (FR-023), enforced by the same check. | PASS |
| V. Open Data, Sustainable Product | Pose library untouched; `datadog/` and `scripts/datadog/` are operational tooling, not product data. | PASS (N/A) |
| VI. Lightweight and Accessible | RULE-L6 governs client weight directly — verified in Phase 4 (Lighthouse mobile ≥90 with RUM live). RULE-L7 is this feature's central constraint, carried through every phase (scrub-before-send, content-free CI check). | PASS — with an explicit verification step |
| VII. Compassion Over Compliance | No lapse/streak copy touched. Alert and digest prose (§5 operational writing, VOICE.md) is reviewed, not lint-scanned — `lint:copy` only scans `src/app`/`src/components`. | PASS (N/A for lint scope; VOICE.md §5 governs prose review) |
| VIII. Consent-Scoped Visibility | No practice-content table or RLS policy touched. The content/signal line this principle draws is exactly what RULE-L7 mirrors for telemetry — the v3.0.0 addendum treats misclassifying one as equal in severity to misclassifying the other, which is why FR-021's automated check exists rather than relying on review. | PASS |

No violations requiring Complexity Tracking justification. The dashboard-scope amendment
(widening 008's stated exclusion) is a spec-assumption change, not a constitution
violation, and is recorded in `DECISIONS.md` rather than here.

### Where the spec and the plan diverge, and why

1. **Dashboards, synthetics, service-catalog, and logs-metrics are in scope**, though the
   spec's Assumptions section states "dashboards are deliberately excluded." Amended by
   explicit owner direction for full NextMove parity — see `research.md` §5 and the
   `DECISIONS.md` entry this plan adds.
2. **FR-026's "extend the existing... integration" is read as "extend the posture,"** not
   "extend the working wiring" — there is no working wiring today (`research.md` §1). This
   plan replaces the plumbing while holding the posture fixed.
3. **US3's "one observability guide" ships as one section of `docs/OBSERVABILITY.md`
   assembled across US1/US2/US4's phases**, not as an independent phase — the guide's
   content (env vars, queries, content-free statement) is a description of what US1/US2/US4
   build, and writing it before they exist would mean guessing at the interface.
4. **007's scheduler is out of scope.** FR-014/FR-015 (degrade-not-abort, owner-gated
   credential-failure classification) are read as constraints the `/autoobs` command
   text must state, not as infrastructure this branch builds — the digest issue,
   escalation ladder, and cron/scheduler are 007's.

## Project Structure

### Documentation (this feature)

```text
specs/008-observability-as-code/
├── plan.md                  # This file
├── research.md              # Phase 0 output — 8 decisions, incl. what's actually live
├── data-model.md             # Phase 1 output — manifest entity shapes
├── quickstart.md             # Phase 1 output — sync tool + content-free check walkthrough
├── spec.md
├── checklists/requirements.md
└── tasks.md
```

### Source (repository root)

```text
src/
├── instrumentation-client.ts       # NEW — replaces src/components/DatadogRum.tsx
├── instrumentation.ts              # NEW — @vercel/otel registration
├── app/
│   ├── global-error.tsx            # NEW — error boundary, forwards through scrubber
│   └── error.tsx                   # NEW — error boundary, forwards through scrubber
└── lib/
    ├── telemetry/
    │   └── scrub.ts                 # NEW — pure: scrubViewUrl, scrubErrorMessage
    ├── utils/logger.ts              # EXTENDED — dd.trace_id/span_id, top-level error.*
    └── dd-service-name.ts           # NEW — normalizeServiceName, ported from NextMove

datadog/                             # NEW — manifests, one concern per file
├── README.md
├── monitors/*.json
├── slos/*.json
├── synthetics/{api,browser}/*.json
├── dashboards/*.json
├── logs-metrics/*.json
└── service-catalog/yogakit.yaml

scripts/
├── datadog/
│   └── sync.mjs                     # NEW — thin: CLI parsing, pup/REST calls, table output
├── lib/
│   ├── datadog-sync.mjs             # NEW — pure: diff, validation, tag matching
│   └── telemetry-check.mjs          # NEW — pure: content-free assertion
└── check-telemetry-content-free.mjs # NEW — thin: file walk, exit code

tests/unit/
├── telemetry/scrub.test.ts          # NEW
├── datadog/sync.test.ts             # NEW
└── telemetry-check/check.test.ts    # NEW

docs/
├── OBSERVABILITY.md                 # NEW — US3, FR-016-019
├── observation/.gitkeep             # NEW — 007-shared, dated outputs land here
├── routine_runs/autoobs/
│   └── system-instructions.md       # NEW
└── planning/routine-log.md          # NEW

.claude/commands/autoobs.md          # NEW

.env.example                         # EXTENDED — Datadog vars documented (FR-017)
vitest.config.ts                     # coverage.include: scrub.ts, datadog-sync.mjs, telemetry-check.mjs
.github/workflows/ci.yml             # NEW blocking content-free-check step; datadog-ci junit upload (continue-on-error)
package.json                         # datadog:diff, datadog:apply, datadog:validate
DECISIONS.md                         # NEW entry — dashboard-scope amendment
```

## Phasing

| Phase | Story | Ships this pass |
|---|---|---|
| 1 | US4 — instrumentation cannot leak practice content (scrubber, error boundaries, content-free check) | ✅ |
| 2 | US1 — alerting reviewed in a PR (manifests + sync tool) | ✅ |
| 3 | US2 — headless routine can read production health unattended (OTel tracing, key-auth read path, `/autoobs`) | ✅ |
| 3.5 | US3 — one guide maps every routine to its telemetry | ✅ (assembled from 1-3, not independent) |
| — | 007's scheduler, label taxonomy, digest automation | deferred |

**US4 before US1/US2.** Enabling RUM against a real application without the scrubber in
place first would mean shipping a window, however brief, in which pose slugs reach
Datadog verbatim — the exact violation FR-020 exists to prevent. The scrubber and error
boundaries land, then get proven by the content-free check, before the RUM application
is created and wired live.

## Complexity Tracking

No constitutional violations require justification. The scope amendment (dashboards,
synthetics, service-catalog, logs-metrics beyond the spec's stated floor) is tracked in
`DECISIONS.md`, not here, per the distinction the constitution draws between a
constitutional violation and an assumption change.
