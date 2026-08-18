# Yoga Kit — Development Guide

<!-- SPECKIT START -->
The locked human-facing spec for v0.1 is `docs/krama-v0.1-spec.md` — read it first.
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at:
`specs/001-krama-mvp-spec/plan.md`

Key artifacts:
- Locked spec (v0.1, human-facing):  `docs/krama-v0.1-spec.md`
- Pose field dictionary + tiers:     `docs/krama-atlas.md`
- UI/testid guardrails:              `docs/krama-guardrails.md`
- Constitution (non-negotiables): `.specify/memory/constitution.md`
- Spec (what & why, derived):     `specs/001-krama-mvp-spec/spec.md`
- Plan (how, stack, structure):   `specs/001-krama-mvp-spec/plan.md`
- Data model (TypeScript types):  `specs/001-krama-mvp-spec/data-model.md`
- Friction engine contract:       `specs/001-krama-mvp-spec/contracts/friction-engine.md`
- Flow file format:               `specs/001-krama-mvp-spec/contracts/flow-file-format.md`
- Pose library schema:            `specs/001-krama-mvp-spec/contracts/pose-library-schema.md`
- Tasks:                          `specs/001-krama-mvp-spec/tasks.md`
- Quickstart:                     `specs/001-krama-mvp-spec/quickstart.md`
- Running friction log:           `FRICTION.md`
- Why-we-chose log:               `DECISIONS.md`
<!-- SPECKIT END -->

## Non-negotiables (from constitution v2.0.0)

- v0.1 is fully deterministic: no AI call anywhere in the critical path. The AI proposal
  stage from the prior spec is parked (not deleted) for v0.2 — see `DECISIONS.md`.
- The friction engine is a pure function over Tier-1 pose geometry; its weights live in
  one exported constant (tuning is data, not code).
- The engine derives structure with reasoning; it never authors cues, movement names, or
  teacher voice.
- Friction engine and validator-lite: 100% unit test line coverage, mandatory.
- Pose library lives in `data/poses/` as version-controlled JSON, tagged by entry tier
  (Tier-1 required, Tier-2 backfilled opportunistically). CI validates schema and Tier-1
  completeness.
- No auth, no database, no login in v1. Local-first (localStorage/IndexedDB), with
  `.krama.json` export/import as the portability story.
- No student-identifying information anywhere — v0.1 has no constraint/roster input at
  all, and this stays true if/when it's added in v0.2.
- Telemetry (Datadog RUM) carries page views, errors, and web vitals only — never
  pose/flow/note content.

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
