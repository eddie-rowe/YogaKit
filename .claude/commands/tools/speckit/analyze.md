# Cross-Artifact Analysis

Checks all spec artifacts for internal consistency and constitution compliance. Run before implementation begins and after each major phase.

**Spec**: $ARGUMENTS (folder name like `001-daily-priority-briefing`, or empty for most recent)

---

## Steps

### 1. Read everything

Read all of:
- `.specify/memory/constitution.md`
- `specs/$ARGUMENTS/spec.md`
- `specs/$ARGUMENTS/plan.md`
- `specs/$ARGUMENTS/research.md`
- `specs/$ARGUMENTS/data-model.md`
- `specs/$ARGUMENTS/quickstart.md`
- `specs/$ARGUMENTS/tasks.md`
- `specs/$ARGUMENTS/contracts/*.md` (all of them)
- `specs/$ARGUMENTS/checklists/*.md` (all of them)

### 2. Check 1 — Constitution compliance

For each of the 7 principles, verify the spec implements it correctly:

| Principle | Gate question | Pass? |
|---|---|---|
| I. Action over dashboards | Does every AI output have a suggested next step + deep link? | |
| II. Five-part format | Does every owner-facing recommendation implement all 5 parts? | |
| III. Confidence-gated | Is there a low-confidence path defined? Is "all clear" state handled? | |
| IV. Data sacred | Are all OAuth tokens encrypted? Is Gmail body excluded? RLS on all tables? | |
| V. Test-first | Are TDD tasks defined for scoring, signals, action-token handler? | |
| VI. Observable | Does every Inngest function have logScope? Every provider call emit a metric? | |
| VII. WTP rises | Are tier limits enforced? Does the trial-end cite actual usage? | |

### 3. Check 2 — Spec ↔ plan consistency

- Every FR in spec.md should have at least one corresponding task in tasks.md. List any FRs with no task.
- Every task in tasks.md should trace back to a FR or user story. List any orphan tasks.
- The project structure in plan.md should account for all files mentioned in tasks.md.

### 4. Check 3 — Data model ↔ contracts consistency

- Every table column referenced in a contract should exist in data-model.md.
- Every event field in `contracts/inngest-events.md` should map to a DB column or derived value.
- Every FK in data-model.md should be referenced by at least one contract or task.

### 5. Check 4 — Contracts ↔ tasks consistency

- Every contract endpoint/event should have at least one task implementing it.
- Every contract should have an observability row (Datadog metric, logScope).

### 6. Check 5 — Tasks ↔ checklists consistency

- Every checklist item that's spec-dependent (e.g., "all new Inngest functions use logScope") should be satisfiable based on the task list.
- List any checklist items that cannot be evaluated from the current artifacts.

### 7. Check 6 — Quickstart completeness

The quickstart must be runnable top-to-bottom:
- Does it reference environment variables that are not documented in the steps?
- Does it assume any external services that are not set up in the steps?
- Does the manual trigger URL match a route in the project structure?

### 8. Report

Output a report with these sections:

#### Summary
```
Constitution: N/7 principles pass | N warnings | N failures
Spec↔Plan: N FRs covered | N missing | N orphan tasks
Data↔Contracts: N consistent | N gaps
Contracts↔Tasks: N covered | N missing implementations
Checklists: N items evaluable | N need investigation
Quickstart: Runnable / Not runnable (list gaps)
```

#### Issues (grouped by severity)

**BLOCKER** — must resolve before implementation:
- [list issues]

**WARNING** — should resolve before implementation:
- [list issues]

**INFO** — worth noting, not blocking:
- [list issues]

#### Suggested fixes

For each BLOCKER or WARNING, suggest the specific file and section to update.

Suggested next command (if no BLOCKERs): `/tools:speckit:implement $ARGUMENTS`
