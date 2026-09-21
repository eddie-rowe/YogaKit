# Speckit Commands

Speckit is the spec-driven development workflow for NextMove. These commands guide a feature from description → spec → plan → tasks → implementation, with the product constitution checked at every step.

## Command Reference

| Command | When to use | Output |
|---|---|---|
| `/tools:speckit:constitution` | Product principles change; new delivery surface added | Updated `.specify/memory/constitution.md` |
| `/tools:speckit:specify` | Starting a new feature | `specs/NNN-feature/spec.md` |
| `/tools:speckit:clarify` | After spec review, before planning | `## Clarifications` section appended to `spec.md` |
| `/tools:speckit:plan` | After clarifications are resolved | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` |
| `/tools:speckit:tasks` | After plan is reviewed | `tasks.md` (107-style task list with TDD gates + parallel markers) |
| `/tools:speckit:checklist` | After tasks are written | Additional `checklists/*.md` (security, UX, ops, performance) |
| `/tools:speckit:analyze` | Before implementation begins; after each phase | Cross-artifact consistency report |
| `/tools:speckit:implement` | Tasks are ready; implementation begins | Code changes, PRs |

## Workflow

```
describe feature
    ↓
/tools:speckit:specify          → spec.md
    ↓
review + /tools:speckit:clarify → spec.md (+ Clarifications section)
    ↓
/tools:speckit:plan             → plan.md, research.md, data-model.md, contracts/, quickstart.md
    ↓
/tools:speckit:tasks            → tasks.md
    ↓
/tools:speckit:checklist        → checklists/security.md, checklists/ux.md, checklists/ops.md
    ↓
/tools:speckit:analyze          → consistency report (fix gaps before proceeding)
    ↓
/tools:speckit:implement        → code
```

## Constitution

The constitution lives at `.specify/memory/constitution.md`. Every command reads it before acting. Violations are flagged, not silently ignored.

## Argument convention

Commands that operate on an existing spec accept either:
- A spec folder name: `001-daily-priority-briefing`
- A relative path: `specs/001-daily-priority-briefing`
- No argument (defaults to most recent spec directory)
