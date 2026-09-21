# Generate Task List

Creates `tasks.md` from `plan.md` and `research.md`.

**Spec**: $ARGUMENTS (folder name like `001-daily-priority-briefing`, or empty for most recent)

---

## Steps

### 1. Read all inputs

Read:
- `specs/$ARGUMENTS/spec.md` (user stories + FRs as acceptance criteria)
- `specs/$ARGUMENTS/plan.md` (project structure + milestones)
- `specs/$ARGUMENTS/research.md` (Phase 0 decisions + constraints)
- `specs/$ARGUMENTS/data-model.md` (tables → migration tasks)
- `specs/$ARGUMENTS/contracts/*.md` (endpoints/events → implementation tasks)
- `.specify/memory/constitution.md` (TDD gates, observability requirements)
- `.specify/templates/tasks.md`

### 2. Build the task list

Create `specs/$ARGUMENTS/tasks.md` with:

**Phase organization**: Match the milestone table from plan.md. Typical phases:
0. Setup (scaffold, env, auth, DB migrations)
1. Foundational (first integration, basic pipeline)
2–N. Feature phases (one per major user story P1, P2, P3)

**Per task format**:
```
- [ ] **TXXX** `path/to/file.ts` — one-line description [TDD] [P]
  - Depends on: TXXX, TXXX
  - TDD: `tests/path/file.test.ts` — what the failing test covers
  - Acceptance: specific behavior to verify
```

**[TDD] tag**: Required on any task that touches `services/scoring/`, `services/signals/`, or action-token handler. Also mark tasks that implement a new Inngest event or a new API endpoint with business logic.

**[P] tag**: Mark tasks that can run in parallel within their phase (no shared file writes, no sequential dependency).

**Dependency rule**: A task depends on another if it imports from it, migrates a table it creates, or builds UI over an API it establishes.

**Task granularity**: One file per task where possible. If a task spans multiple files, the primary file is listed and the others are in the acceptance criteria.

### 3. Add milestone gates

At the end of each phase, add a gate task:
```
- [ ] **TXXX** PHASE N GATE — run `npm test` + `npx tsc --noEmit`. All tests green, no type errors.
  - Acceptance: CI equivalent passes locally before proceeding to next phase
```

### 4. Identify MVP stop condition

After the minimum P1 stories are implementable (US1, US2, US3), add a comment:
```
<!-- MVP STOP: Tasks above this line constitute Phase 1 MVP. Validate with design partners before proceeding. -->
```

### 5. Build the dependency graph

After the task list, add a text dependency graph showing the critical path:
```
T001 → T002 → T003 → ...
                    ↓
T010 [P] ——————————→ T020 (MVP gate)
T011 [P] ——————————↑
```

### 6. Build the schedule table

Map tasks to the weekly milestone table from plan.md. Each row: Week, Tasks (T-numbers), Deliverable (the independent test from the user story).

### 7. Report

Output:
- Total task count
- Count with [TDD] tag
- Count with [P] tag
- Estimated critical path length (number of sequential [non-P] tasks)
- Suggested next command: `/tools:speckit:checklist $ARGUMENTS` then `/tools:speckit:analyze $ARGUMENTS`
