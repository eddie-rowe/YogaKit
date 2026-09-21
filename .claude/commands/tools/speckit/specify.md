# Create Feature Spec

Creates a new feature spec directory and `spec.md` from a feature description.

**Feature description**: $ARGUMENTS

---

## Steps

### 1. Read constitution + determine spec number

Read `.specify/memory/constitution.md`. Run:
```bash
bash .specify/scripts/next-spec-number.sh
```
Slug the feature description into kebab-case. The spec folder will be `specs/NNN-feature-slug/`.

### 2. Understand the feature

If `$ARGUMENTS` is a GitHub issue number (e.g. `#42`), fetch the issue with:
```bash
gh issue view 42
```
Otherwise use the description directly.

Read `.specify/templates/spec.md` to understand the required format.

### 3. Draft the spec

Create `specs/NNN-feature-slug/spec.md` with:

**Header**
- Feature Branch: `NNN-feature-slug`
- Created: today's date (YYYY-MM-DD)
- Status: Draft
- Input: reference to the source description

**User Stories** (P1 first, P2 next, P3 for future phases)
- Each story: scenario narrative, priority rationale, independent test, acceptance scenarios
- Stories must be testable in isolation

**Edge cases** (at least 5 — cover: empty data, integration failure, timezone edge, feedback loop, billing edge)

**Functional Requirements**
- Group by domain area
- Number FR-001 sequentially
- Check every requirement against constitution principles:
  - Principle I: Does this help the owner act?
  - Principle II: Is the five-part format specified for any AI-generated output?
  - Principle III: Is the low-confidence path handled?
  - Principle IV: Is any new data storage minimized and owner-deletable?
  - Principle VI: Is observability called out for any new cron/background job?
  - Principle VII: Is this feature gated to the right tier?

**Success Criteria**
- At least one SC per P1 user story
- SC-001 through SC-NNN, each measurable (%, time, count)

**Assumptions** — list explicit assumptions about user behavior, integration behavior, scope

**Clarifications** — empty stub (will be populated by `/tools:speckit:clarify`)

### 4. Verify

Check the spec against the constitution. Flag any violations as `⚠️ CONSTITUTION VIOLATION: [Principle N]` inline in the spec before reporting complete.

### 5. Create checklist stub

Create `specs/NNN-feature-slug/checklists/requirements.md` from `.specify/templates/checklist.md` with type = "Requirements". Leave all items unchecked.

### 6. Report

Output:
- Path of the created spec
- Count of user stories (P1 / P2 / P3)
- Count of functional requirements
- Any constitution flags
- Suggested next command: `/tools:speckit:clarify NNN-feature-slug`
