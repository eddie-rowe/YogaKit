# Tasks: Voice and Copy-Lint

**Feature**: `009-voice-and-copy-lint` | **Plan**: [plan.md](./plan.md)

Status as of 2026-09-01. US1 and US2 are complete; US3 is not started.

## Phase 1 — US2: the voice standard (P1) ✅

| # | Task | FR | State |
|---|---|---|---|
| T001 | Write `VOICE.md` at the repo root | FR-001 | ✅ |
| T002 | Reference it from `CLAUDE.md`'s key artifacts list | FR-001 | ✅ |
| T003 | §2 — decision-first structure, with product and operational examples | FR-002 | ✅ |
| T004 | §3a/§3b — the vocabulary and constructions to avoid, incl. generated-text tells | FR-003 | ✅ |
| T005 | §4 — the non-coercive rule as a hard constraint, traced to Principle VII / RULE-C1–C6, with a worked before/after per rule | FR-004 | ✅ |
| T006 | Point at the constitution rather than restating it; precedence list in §7 | FR-005 | ✅ |
| T007 | §7 — how this sits with the constitution, guardrails, and `CLAUDE.md` | FR-006 | ✅ |
| T008 | §6 — the check's own limits, stated before the gate is trusted | FR-007 | ✅ |
| T009 | §3c — record the em-dash divergence from the source conventions | — | ✅ (research.md §5) |

## Phase 2 — US1: the mechanised check (P1) ✅

| # | Task | FR | State |
|---|---|---|---|
| T010 | `data/voice/voice-rules.json` — 6 rules as data, each with source rule, rationale, and a compliant/violating example pair | FR-017 | ✅ |
| T011 | `scripts/lib/copy-lint.mjs` — AST extraction (`extractCopy`) | FR-014 | ✅ |
| T012 | Entity decoding and typographic-apostrophe normalisation before matching | FR-014 | ✅ |
| T013 | Rule compilation and matching, incl. the co-occurrence form for RULE-C4 | FR-009–FR-012 | ✅ |
| T014 | Exception markers with a required rule id and a required reason; malformed markers reported | FR-016 | ✅ |
| T015 | Violation and report formatting — file, line, column, rule, source rule, matched substring | FR-013 | ✅ |
| T016 | `coverageLimits()` — the five limits, printed on every run, pass or fail | FR-018 | ✅ |
| T017 | `scripts/copy-lint.mjs` — tree walk, `--dir` flag, non-zero exit | FR-008 | ✅ |
| T018 | `package.json` → `lint:copy` | FR-008 | ✅ |
| T019 | `.github/workflows/ci.yml` — blocking step, **no `\|\| true`** | FR-019 | ✅ |
| T020 | `tests/unit/copy-lint/copy-lint.test.ts` — 62 cases in memory | FR-021 | ✅ |
| T021 | Add the pure module to `vitest.config.ts` `coverage.include` at 100% | FR-021 | ✅ |
| T022 | Run over today's `src/`; resolve the one hit | FR-022 | ✅ — one hit, a factual token expiry, resolved with a reasoned exception rather than a rewrite |
| T023 | Prove the gate fails: seeded violation via `--dir`, exit 1 | SC-002 | ✅ |

## Phase 3 — US3: operational writing (P2) — deferred

| # | Task | FR | State |
|---|---|---|---|
| T024 | Structural checks over PR bodies and spec text | FR-023 | ⬜ not started |
| T025 | Decision-first check on `DECISIONS.md` / `FRICTION.md` entries | FR-024 | ⬜ not started |

## Open against another feature

| # | Task | FR | Owner |
|---|---|---|---|
| T026 | Run the copy-lint at headless session-end gates | FR-020 | `007-autonomous-operations` — the gates do not exist yet |
