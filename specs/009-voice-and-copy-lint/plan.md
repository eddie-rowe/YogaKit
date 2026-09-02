# Implementation Plan: Voice and Copy-Lint

**Branch**: `009-voice-and-copy-lint` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-voice-and-copy-lint/spec.md`

## Summary

Write the voice standard, then mechanise the part of it that is constitutional.

`VOICE.md` states how Krama writes, for product copy and operational writing alike, and
points at the constitution wherever the constitution already rules (US2). `npm run
lint:copy` then enforces the four rules that can be enforced mechanically — RULE-C1, C2,
C4, and a slice of C6 — as a **blocking** CI step (US1).

This is the RULE-C5 gate the constitution has asserted since v3.0.0 with no
implementation. It is built now, out of ladder order, because it is a hard prerequisite
for `005` and because two features immediately downstream write the most voice-sensitive
copy in the backlog: `003` US5's thirteen theme subheads (prose about grief and fear) and
`004`'s fifty-nine FRs. Linting copy as it is authored beats retrofitting it.

**This pass ships US1 and US2.** US3 (operational writing, P2) is deferred.

## Technical Context

**Language/Version**: Node 22 ESM (`.mjs` scripts), TypeScript 5.x for the scanned sources
**Primary Dependencies**: `typescript` (already a devDependency) for AST extraction. No
new runtime or dev dependency is added
**Storage**: `data/voice/voice-rules.json` — version-controlled rules as data
**Testing**: Vitest, in memory. The pure module is in `vitest.config.ts`'s
`coverage.include` at the existing 100% threshold
**Target Platform**: CI (`.github/workflows/ci.yml`) and the developer's terminal
**Project Type**: Repository tooling. Ships no UI and no runtime code
**Constraints**: Must not touch `src/lib/friction/` or `src/lib/validator/` — those
modules author no copy and lint noise on the RULE-H6 path is worse than no coverage.
Must not add a check to any request path. Must state its own coverage limits in output
**Scale/Scope**: 60 files, 343 extracted strings, 6 rules today

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against constitution v3.0.0 (`.specify/memory/constitution.md`):

| Principle | Check | Result |
|---|---|---|
| I. Safety is Sovereign | No sequencing, no safety logic, no pose data touched. | PASS (N/A) |
| II. The Teacher Decides | RULE-T3, no black box: the check names the rule, the source rule, the matched substring, and the file position on every hit, so a failure is actionable without reading the checker. | PASS |
| III. Deterministic Authority | Pure regex matching over a parsed AST. No AI call, no network, no database, anywhere. The friction engine and validator-lite are untouched and out of scan scope. | PASS |
| IV. Embodied Intelligence | RULE-E4 forbids the engine authoring teacher voice. This feature writes *about* voice and checks it; it authors no cue. `VOICE-AI-TELLS` is scoped so real cues ("unlock the hips", "elevate the ribs") pass — see research.md §4. | PASS |
| V. Open Data | No entitlement, no gating, no pose data change. `data/poses/` is deliberately out of scan scope: authored open data is not product copy. | PASS |
| VI. Lightweight and Accessible | Build-time only. Ships no bytes to the client. | PASS |
| VII. Compassion Over Compliance | **This feature is Principle VII's enforcement mechanism.** RULE-C5 requires a CI-gating copy-lint; it now exists, blocking, with no `\|\| true`. RULE-C1/C2/C4 are mechanised; C3 and C5's own scope, and most of C6, are not mechanisable and are stated as uncovered. | PASS — and closes the standing gap |
| VIII. Consent-Scoped Visibility | No table, no policy, no user data read or written. | PASS (N/A) |

No violations requiring Complexity Tracking justification.

### Where the spec and the code disagree

1. **FR-020 cannot be satisfied and is not claimed.** It requires the check run at
   headless session-end gates. Those gates are `007`, which has no implementation. The CI
   step is the gate that exists; FR-020 stays open against `007`.
2. **FR-008's "user-facing route and component directories" needed a decision, not a
   reading.** Resolved to `src/app` and `src/components`, with `src/lib` excluded on
   RULE-H6 grounds. research.md §3.
3. **The spec assumes the rule set is small and static.** It is small; it is not static —
   it is data (`data/voice/voice-rules.json`) precisely so it can grow without a code
   change. research.md §4.

## Project Structure

### Documentation (this feature)

```text
specs/009-voice-and-copy-lint/
├── plan.md                  # This file
├── research.md              # Phase 0 output — the six decisions, incl. two only building revealed
├── spec.md
└── tasks.md
```

### Source (repository root)

```text
VOICE.md                              # NEW (US2) — the standard, referenced from CLAUDE.md
data/voice/voice-rules.json           # NEW (US1) — the checked rules, as data
scripts/
├── lib/copy-lint.mjs                 # NEW (US1) — pure: extraction, matching, formatting
└── copy-lint.mjs                     # NEW (US1) — thin: walk the tree, print, exit
tests/unit/copy-lint/copy-lint.test.ts # NEW (US1) — 62 cases, in memory, 100% of the module
vitest.config.ts                      # copy-lint.mjs added to coverage.include
.github/workflows/ci.yml              # NEW blocking step, no `|| true`
package.json                          # `lint:copy`
CLAUDE.md                             # points at VOICE.md (FR-001)
```

## Phasing

| Phase | Story | Ships this pass |
|---|---|---|
| 1 | US2 — the voice standard | ✅ |
| 2 | US1 — the mechanised check, blocking in CI | ✅ |
| 3 | US3 — operational writing checks (P2) | deferred |

**US2 before US1, against the FR numbering.** The authority document is what the lint
encodes. Writing the checker first means inventing the rules twice and then reconciling
two versions of them, and the reconciliation is where a rule quietly changes meaning.

## Complexity Tracking

No constitutional violations require justification.
