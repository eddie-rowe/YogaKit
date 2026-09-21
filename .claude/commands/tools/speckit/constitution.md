# Update Product Constitution

Regenerates `.specify/memory/constitution.md` from the current product context.

**Spec / context**: $ARGUMENTS (optional — if provided, read that spec for any principle updates)

---

## Steps

### 1. Read current state

Read all of the following:
- `.specify/memory/constitution.md` (current constitution)
- `docs/specify_prompt_smb_copilot.md` (product thesis + core principles)
- `docs/next-move-design-doc.md` (design context)
- `INTENTIONS.md`, `PERSONAE.md`, `USER_JOURNEYS.md` (if non-empty)
- The plan.md from `$ARGUMENTS` spec if provided (for any new principle entries in the Constitution Check table)

### 2. Identify changes

Compare the current constitution against the source documents. Flag:
- Any principle that has been violated and needs a stronger gate statement
- Any new delivery surface that has been added (needs an entry in the Interaction Model section)
- Any stack change (needs a tech standards update)
- Any monetization tier change
- Any new "never do" constraint discovered in the specs

### 3. Update the constitution

Rewrite `.specify/memory/constitution.md` with:
- All 7 principles (I–VII) intact, with updated gate statements if needed
- Updated Interaction Model section if new surfaces exist
- Updated Technical Standards if stack changed
- A `**Version**` bump and today's date

### 4. Report

Output a brief diff summary: what changed and why. If nothing changed, say so.

## Notes

- Never remove an existing principle without flagging it as a deliberate decision
- Principle gate statements should be actionable yes/no checks, not vague guidance
- The constitution is the source of truth for all `/tools:speckit:analyze` checks
