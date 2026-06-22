# Krama — Development Guide

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at:
`specs/001-krama-mvp-spec/plan.md`

Key artifacts:
- Constitution (non-negotiables): `.specify/memory/constitution.md`
- Spec (what & why):              `specs/001-krama-mvp-spec/spec.md`
- Plan (how, stack, structure):   `specs/001-krama-mvp-spec/plan.md`
- Data model (TypeScript types):  `specs/001-krama-mvp-spec/data-model.md`
- Pipeline API contract:          `specs/001-krama-mvp-spec/contracts/pipeline-api.md`
- Pose library schema:            `specs/001-krama-mvp-spec/contracts/pose-library-schema.md`
- Tasks:                          `specs/001-krama-mvp-spec/tasks.md`
- Quickstart:                     `specs/001-krama-mvp-spec/quickstart.md`
<!-- SPECKIT END -->

## Non-negotiables (from constitution)

- Safety layer runs last, always. No sequence reaches the UI before validation passes.
- AI output is untrusted — the rules engine and safety layer always have final authority.
- No student-identifying information in AI prompts (categorical descriptors only).
- Rules engine and safety layer: 100% unit test line coverage, mandatory.
- Pose library lives in `data/poses/` as version-controlled JSON. CI validates schema.
- No auth, no database, no login in v1. Local-first.

## Commands

```bash
npm run dev           # start dev server
npm test              # all tests
npm run validate:poses # validate pose library JSON against schema
npm run test:e2e      # Playwright E2E
```

## Pipeline order (immutable)

AI propose → rules engine constrain → safety validate → show to teacher
