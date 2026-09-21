# Clarify Spec

Appends a `## Clarifications` section to the target spec with questions and recorded answers.

**Spec**: $ARGUMENTS (folder name like `001-daily-priority-briefing`, or empty for most recent)

---

## Steps

### 1. Locate the spec

If `$ARGUMENTS` is empty, find the most recent spec directory:
```bash
ls -d specs/[0-9][0-9][0-9]-*/ | sort | tail -1
```
Read `specs/$ARGUMENTS/spec.md` and `specs/$ARGUMENTS/plan.md` (if it exists).

Read `.specify/memory/constitution.md`.

### 2. Identify ambiguities

Scan the spec for:
- Requirements that have multiple valid interpretations
- User stories with unstated assumptions about external system behavior
- Edge cases that reference behavior not defined elsewhere
- Any gap between the spec and the constitution principles (especially Principles I, II, III, VII)
- Success criteria that are not yet measurable (missing baseline data)
- Any place where the spec says "TBD", "to be confirmed", or is silent on a necessary decision

### 3. Compose questions

For each ambiguity, write a clarification question with:
- **Q:** The question, specific enough to have an answerable response
- **Impact:** Which requirements or stories it affects
- **Default if not answered:** The assumption the implementation will use

Aim for 3–8 questions. Don't ask about things that are already clear.

### 4. Check for existing answers

If the spec already has a `## Clarifications` section, read it. Only add new questions for gaps not already covered.

### 5. Update spec.md

Find the `## Clarifications` section (or the end of `## Assumptions`) and append:

```markdown
## Clarifications

### Open questions

| # | Question | Impact | Default |
|---|---|---|---|
| CL-001 | {{question}} | {{affected FRs}} | {{default assumption}} |

### Resolved

| # | Question | Answer | Resolved by | Date |
|---|---|---|---|---|
| (none yet) | | | | |
```

If a `## Clarifications` section already exists with the table structure, add new rows rather than replacing.

### 6. Report

List each question added. Note if any question should be answered before running `/tools:speckit:plan`.

Suggested next command: `/tools:speckit:plan $ARGUMENTS` (after questions are answered or defaults are accepted)
