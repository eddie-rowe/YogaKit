---
model: haiku
description: Issue Finalization
argument-hint: "[issue#]"
---

# /finalize - Issue Finalization

Finalize completed issues with documentation updates, prompting logs, and closing notes. Also completes vibe coding sessions with PR creation, review, and merge.

[Extended thinking: Detect if this is a vibe session (branch has issue number prefix) or explicit issue finalization. For vibe sessions: create PR, run review, wait for CI, merge if passing. For explicit: compile the full development journey from all issue comments, create prompting log, and close the issue.]

## Usage
```
/finalize              # Auto-detect from current branch (vibe session)
/finalize <issue_number>  # Explicit issue finalization
```

## Examples
```
/finalize              # Complete vibe session on branch 167-improve-ui
/finalize 65           # Finalize issue #65 explicitly
/finalize 123          # Finalize issue #123 explicitly
```

## Agent Orchestration

| Step | Agent | Purpose |
|------|-------|---------|
| Detection | **general-purpose** | Detect vibe session or explicit issue |
| PR Creation | **general-purpose** | Create PR linking to issue |
| Review | **general-purpose** | Run /review workflow |
| CI Wait | **general-purpose** | Monitor GitHub Actions status |
| Merge | **general-purpose** | Merge if all checks pass |
| Documentation | **general-purpose** | Update README, API docs if needed |
| Prompting Log | **general-purpose** | Create development journey log |
| Issue Summary | **general-purpose** | Generate closing comment |
| Close Issue | **general-purpose** | Close with labels, link PRs |

## Execution

When invoked with `/finalize` or `/finalize <issue>`, execute these steps:

### 1. Detect Mode

```bash
# Get current branch
BRANCH=$(git branch --show-current)

# Extract issue number from branch name (e.g., 167-improve-dashboard-ui)
BRANCH_ISSUE=$(echo "$BRANCH" | grep -oE '^[0-9]+')

# Determine mode
if [ -n "$1" ]; then
  # Explicit issue provided
  ISSUE="$1"
  MODE="explicit"
elif [ -n "$BRANCH_ISSUE" ]; then
  # Vibe session detected
  ISSUE="$BRANCH_ISSUE"
  MODE="vibe"
else
  echo "❌ Not on a feature branch and no issue number provided."
  echo "Usage: /finalize <issue_number>"
  exit 1
fi
```

**Output (vibe mode):**
```
🎯 Vibe session detected
   Branch: 167-improve-dashboard-ui-components
   Issue: #167
```

**Output (explicit mode):**
```
📋 Finalizing issue: #65
```

---

## Vibe Session Mode (Auto-detected from branch)

### 2. Check for Uncommitted Changes

```bash
# Check for uncommitted changes
git status --porcelain
```

**If uncommitted changes exist:**
```
⚠️ You have uncommitted changes:
   M src/components/Dashboard.tsx
   M src/lib/utils.ts

These won't be included in the PR. Commit them first or proceed without.
```

### 3. Push Branch to Remote

```bash
git push -u origin "$BRANCH"
```

**Output:**
```
📤 Pushed branch: 167-improve-dashboard-ui-components
```

### 4. Create Pull Request

```bash
# Get issue title
ISSUE_TITLE=$(gh issue view "$ISSUE" --json title --jq '.title')

# Get commit summary for PR body
COMMITS=$(git log main..HEAD --oneline)
DIFF_STATS=$(git diff --stat main...HEAD)

# Create PR
gh pr create \
  --title "feat(#$ISSUE): $ISSUE_TITLE" \
  --body "$(cat <<EOF
## Summary
Closes #$ISSUE

## Changes
\`\`\`
$DIFF_STATS
\`\`\`

## Commits
$COMMITS

---
*Created by \`/finalize\` - vibe coding session*
EOF
)"
```

**Output:**
```
🚀 PR #168 created: feat(#167): Improve dashboard UI components
   https://github.com/Lead-Bindle/leadbindle/pull/168
```

### 5. Run Code Review

Invoke the `/review` workflow on the newly created PR.

**Output:**
```
🔍 Running code review on PR #168...
   (Review results will be added as PR comments)
```

### 6. Wait for CI

```bash
# Wait for GitHub Actions checks to complete
gh pr checks "$PR_NUMBER" --watch
```

**Output (in progress):**
```
⏳ Waiting for CI...
   ⏳ lint: in progress
   ⏳ typecheck: in progress
   ⏳ test: in progress
```

**Output (success):**
```
✅ All CI checks passed:
   ✅ lint: passed
   ✅ typecheck: passed
   ✅ test: passed
```

**Output (failure):**
```
❌ CI failed:
   ✅ lint: passed
   ❌ typecheck: failed
   ⏳ test: skipped

Fix the issues and run '/finalize' again.
```

### 7. Merge PR (if CI passes)

```bash
# Only if all checks pass
gh pr merge "$PR_NUMBER" --squash --delete-branch
```

**Output:**
```
✅ PR #168 merged and branch deleted
```

### 8. Get Milestone Progress

```bash
# Get milestone info from issue
MILESTONE_NUM=$(gh issue view "$ISSUE" --json milestone --jq '.milestone.number // empty')

if [ -n "$MILESTONE_NUM" ]; then
  gh api "repos/Lead-Bindle/leadbindle/milestones/$MILESTONE_NUM" --jq '{
    title: .title,
    open: .open_issues,
    closed: .closed_issues
  }'
fi
```

### 9. Complete Vibe Session

**Final Output (success):**
```
═══════════════════════════════════════════════════════════
✅ Vibe session complete!
═══════════════════════════════════════════════════════════

📋 Issue #167: Closed
🚀 PR #168: Merged
🔀 Branch: Deleted

📊 Milestone Progress:
   M08 - Lead Detail View
   [████████░░] 8/10 (80%)
   2 issues remaining

💡 Ready for next vibe session: /vibe "your next intention"
═══════════════════════════════════════════════════════════
```

**Final Output (CI failed):**
```
═══════════════════════════════════════════════════════════
⚠️ Vibe session paused - CI failed
═══════════════════════════════════════════════════════════

📋 Issue #167: Still open
🚀 PR #168: Awaiting fixes
🔀 Branch: 167-improve-dashboard-ui-components

❌ Failed checks:
   - typecheck: Type error in Dashboard.tsx

💡 Fix the issues and run '/finalize' again
═══════════════════════════════════════════════════════════
```

---

## Explicit Issue Mode (Issue number provided)

### 2. Begin Finalization
**Output:**
```
📝 Starting issue finalization workflow...
📋 Finalizing issue: {issue}
```

### 3. Fetch Complete Issue Journey

```bash
# Get issue with all comments
gh issue view {issue} --comments

# Get linked PR
gh pr list --search "closes:#{issue}" --json number,title,mergedAt
```

**Extract from comments:**
- **From `/plan`**: Original requirements, architecture decision, planned steps
- **From `/dev`**: Implementation summary, files changed
- **From `/validate`**: Test results, validation status
- **From `/pr`**: PR link, status

**Output:**
```
📋 Development Journey:
  Plan: ✅ Architecture decided, {step_count} steps planned
  Dev: ✅ {file_count} files changed
  Validate: ✅ E2E tests passed
  Deploy: ✅ PR #{pr} merged
```

### 4. Documentation Update (if needed)
Review all changes and update if necessary:
- README.md if new features were added
- API documentation if endpoints changed
- Architecture diagrams if structure changed

### 5. Generate Prompting Log (local only)
Create log file at `.claude/logs/{date}/issue-{issue}.md`:

```markdown
# Issue {issue} - Prompting Log
Date: {date}
Branch: {branch name}

## Prompt
[Original issue description and requirements]

## Todos Generated
[List of subtasks created during development]

## Summary
[What was implemented, key decisions, challenges overcome]

## Next Steps
[Follow-up work, improvements, related issues]

## Follow-up Prompt
[Suggested prompt for continuing or enhancing this work]
```

### 6. Create Closing Comment

Compile comprehensive closing comment from journey data:

```bash
gh issue comment {issue_number} --body "$(cat <<'EOF'
## Issue Completed ✅

### Summary
{Brief description of what was implemented - from /dev comment}

### Architecture
{Architecture decision and rationale - from /plan comment}

### Implementation
- Files changed: {list from /dev comment}
- Tests: {results from /validate comment}

### Pull Request
- PR: #{pr_number}
- Merged: {merge_date}

### Journey
| Phase | Status |
|-------|--------|
| /plan | ✅ Completed |
| /dev | ✅ Completed |
| /validate | ✅ Passed |
| /pr | ✅ PR Created |
| /review | ✅ Approved |
| /merge | ✅ Merged |

---
*Finalized by `/finalize` - Prompting log saved locally*
EOF
)"
```

### 7. Close GitHub Issue

```bash
# Close the issue
gh issue close {issue_number}

# Add completion label
gh issue edit {issue_number} --add-label "completed"
```

### 8. Complete Finalization
**Output:**
```
✅ Issue #{issue} finalized successfully!

📊 Summary:
  - Documentation updated
  - Prompting log created
  - GitHub issue closed with summary
  - Context archived and reset

💡 This completes the full development lifecycle for issue #{issue}
🎯 Ready for next issue!
```

## Error Handling

| Error | Recovery |
|-------|----------|
| No issue detected | Prompt for explicit issue number |
| PR creation fails | Show error, suggest manual creation |
| CI timeout | Show status, suggest checking GitHub Actions |
| Merge conflicts | Prompt user to resolve conflicts |
| Issue already closed | Skip closing, show warning |

## Success Criteria

- Vibe mode: PR created, reviewed, and merged (if CI passes)
- Explicit mode: Documentation reflects all changes
- Prompting log captures development journey
- GitHub issue has comprehensive closing notes
- Context is archived for future reference
- Team can understand what was done and why
