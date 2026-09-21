---
model: sonnet
description: Generate GitHub Issues
---

# /issues - Generate GitHub Issues

Generate well-structured GitHub issues from the roadmap. This is the handoff point to the SDLC loop.

[Extended thinking: This workflow is the handoff point between PM and SDLC loops. It converts roadmap milestones and deliverables into GitHub issues with proper structure, labels, and acceptance criteria. Issues created here are then processed by /plan → /dev → etc.]

## Usage
```
/issues
```

## Execution

When invoked with `/issues`, execute these steps:

1. **Begin Issue Generation**
   **Output:**
   ```
   📋 Starting issue generation workflow...
   ```

2. **Gather Context**
   - Read `docs/planning/roadmap.md` for milestones and deliverables
   - Read `docs/planning/vision.md` for acceptance criteria context
   - Check existing issues to avoid duplicates: `gh issue list --state all --limit 100`

3. **Issue Planning**
   For each deliverable in the roadmap:
   - Determine if it needs an issue (skip if already exists)
   - Classify issue type: feature, enhancement, bug, chore
   - Estimate complexity: small, medium, large
   - Identify parent milestone

4. **Issue Body Structure**
   - Titles should be self-explanatory ("feat: Add dark mode toggle")
   - Body is OPTIONAL for simple non-feature fixes (security/tech-debt/Dependabot) — only
     add context that isn't obvious from title.
   - Avoid "As a user..." format — describe concrete tasks.

   **MANDATORY for every `feat:` issue** (product feature work `/autodev` will build
   unattended — the acceptance criteria are how the code-reviewer and the merge gate know
   the feature is actually correct, not just green):

   ### Acceptance Criteria
   - Concrete, checkable outcomes copied from the increment acceptance gate
     (`docs/intelligence/implementation-roadmap.md`) or the `Acceptance:` line of the
     matching `specs/NNN/tasks.md` task. Each must be verifiable by a test or a
     playwright-cli run (e.g. "an emailed action URL resolves to success and writes a
     `feedback_event`", not "actions work").

   ### Test Requirements
   - The vitest test(s) to add/adjust (Red-first), named by path. State the assertion.

   ### Spec Reference
   - `specs/NNN/…` or `docs/intelligence/…` section this implements. **Never** reference
     `specs/001-daily-priority-briefing` — it is SUPERSEDED (see `decisions.md` 2026-07-23).

   ### Codebase Area
   - **Layer**: [Frontend | Backend | Database | Service | Full-stack]
   - **Primary directory**: `nextmove/src/…` | `nextmove/supabase/migrations/` | …
   - Scope each feature issue to ONE increment-slice / one Codebase Area so it stays
     small, testable, and safely auto-mergeable.

   ### Depends on
   - None — independently implementable
   OR
   - #[issue_number] ([reason])

5. **User Confirmation**
   Use AskUserQuestion to confirm:
   - "I've identified N items to create as issues. Review the list?"
   - Present summary table of proposed issues
   - Allow user to modify before creation

6. **Issue Creation**
   For simple issues (no cross-issue dependencies):
   ```bash
   gh issue create \
     --title "feat: [Title]" \
     --label "enhancement" \
     --milestone "Milestone Name"
   ```

   For milestone batches (3+ issues, likely for /team-dev):
   ```bash
   gh issue create \
     --title "feat: [Title]" \
     --body "$(cat <<'EOF'
   [Description if needed]

   ### Codebase Area
   - **Layer**: [Frontend | Backend | Database | Service | Full-stack]
   - **Primary directory**: `[main directory]`

   ### Depends on
   - None — independently implementable
   EOF
   )" \
     --label "enhancement" \
     --milestone "Milestone Name"
   ```

   **Issue Types and Labels:**
   | Type | Title Prefix | Labels |
   |------|-------------|--------|
   | Feature | `feat:` | enhancement |
   | Bug | `fix:` | bug |
   | Refactor | `refactor:` | refactor |
   | Docs | `docs:` | documentation |
   | Chore | `chore:` | chore |

7. **Sub-issues for Complex Items**
   For large items:
   - Create parent issue with overview
   - Create child issues for each component
   - Link children to parent in description

8. **Complete Issue Generation**
   **Output:**
   ```
   ✅ Issues Created

   📋 Created N new issues:
   | # | Title | Type | Layer | Depends on |
   |---|-------|------|-------|------------|
   | 123 | feat: Feature X | enhancement | Frontend | None |
   | 124 | feat: Feature Y | enhancement | Service | #123 |

   ⏭️ Ready for Development:
      • Sequential: '/plan <issue#>' → '/dev' → '/pr' (one at a time)
      • Parallel:   '/team-dev 123 124 125' (batch with Agent Teams)

   🔗 View issues: https://github.com/eddie-rowe/leadbindle/issues
   ```

## Handoff to SDLC

**Sequential** (one issue at a time):
```
/issues creates #123
    ↓
/plan 123 → /dev 123 → /validate 123 → /test → /pr 123
```

**Parallel** (batch of independent issues):
```
/issues creates #123, #124, #125
    ↓
/team-dev 123 124 125
```

Use `/team-dev` when 3+ issues in a milestone touch different areas of the codebase.
