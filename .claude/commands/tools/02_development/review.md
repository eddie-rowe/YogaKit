---
model: opus
description: Pull Request Review
argument-hint: "[pr#]"
---

# /review - Pull Request Review

Review pull requests with full context from the linked issue (plan, dev, validate comments).

[Extended thinking: Fetch the linked issue from the PR to understand what was planned, implemented, and validated. Use this context to perform a more informed code review. Focus on whether the implementation matches the plan.]

## Usage
```
/review <pr_number> [--no-fix]
```

## Options
- `--no-fix`: Skip auto-fix step (analysis only)

## Examples
```
/review 68
/review 123
/review 42 --no-fix
```

## Execution

When invoked with `/review <pr>`, execute these steps:

1. **Validate Input**
   ```
   # If no argument provided, show error:
   "❌ Please provide a PR number"

   # Show usage examples:
   "   /review 68"
   "   /review 123"

   # Parse PR number from argument
   ```

2. **Begin Review Process**
   **Output:**
   ```
   🔍 Starting pull request review workflow...
   📋 Reviewing PR: #{pr}
   ```

   *Note: Context is automatically initialized by UserPromptSubmit hook*

3. **Fetch PR Status**
   ```bash
   # Get PR details including linked issue
   gh pr view {pr} --json title,state,reviewDecision,statusCheckRollup,mergeable,reviews,body

   # Extract linked issue number from PR body (looks for "Closes #123")
   ```
   **Output:**
   ```
   📊 PR Status:
     Title: {title}
     State: {state}
     Linked Issue: #{issue_number}
     Reviews: {review_count} ({approved}/{changes_requested}/{pending})
     CI Status: {passing|failing|pending}
     Mergeable: {yes|no|conflicted}
   ```

4. **Fetch Issue Context**

   ```bash
   # Get linked issue with all comments
   gh issue view {issue_number} --comments
   ```

   **Extract from comments:**
   - **From `/plan`**: Architecture decision, implementation steps, testing requirements
   - **From `/dev`**: What was implemented, files changed
   - **From `/validate`**: Test results, validation status

   **Output:**
   ```
   📋 Implementation Context:

   Architecture: {FastAPI/PostgREST}
   Planned Steps: {count} steps
   Files Changed: {list from /dev}
   Validation: {passed/failed}
   ```

5. **Analyze Review Requirements**
   ```
   # Check branch protection rules
   gh api repos/{owner}/{repo}/branches/main/protection

   # Determine:
   # - Required approvals count
   # - Required status checks
   # - Dismiss stale reviews setting
   ```
   **Output:**
   ```
   📋 Review Requirements:
     Required Approvals: {count}
     Required Checks: {check_list}
     Current Status: {met|not_met}
   ```

6. **Request Reviews (if needed)**
   ```
   # If no reviews requested yet, suggest reviewers
   # Based on:
   # - CODEOWNERS file
   # - Recent contributors to changed files
   # - Team assignments

   gh pr edit {pr} --add-reviewer {reviewer1},{reviewer2}
   ```
   **Output:**
   ```
   👥 Review Requests:
     Requested: {reviewer_list}
     Status: Awaiting review
   ```

7. **Perform Automated Code Review**
   ```
   # Launch code-reviewer agent to analyze changes
   # This is the primary architecture compliance gate
   # (code-simplifier runs during /dev for style cleanup)
   # Check for:
   # - Code quality issues
   # - Security vulnerabilities
   # - Architectural compliance
   # - Test coverage
   # - Documentation completeness
   ```
   **Output:**
   ```
   🤖 Automated Review Results:

   ✅ Code Quality: {score}/10
   ✅ Security: No vulnerabilities found
   ✅ Architecture: Compliant with patterns
   ⚠️ Test Coverage: {coverage}% (target: 80%)
   ✅ Documentation: Complete

   📝 Suggestions:
     - {suggestion_1}
     - {suggestion_2}
   ```

8. **Auto-Fix Critical and High Priority Issues**

   *Skip this step if `--no-fix` flag was passed*

   If CRITICAL (🚨) or HIGH PRIORITY (⚠️) issues were found in Step 7:

   ```
   # Map issue types to specialized agents:
   #
   # | Issue Type                                | Agent              |
   # |-------------------------------------------|--------------------|
   # | Service layer violations (direct Supabase)| typescript-pro     |
   # | Missing singleton pattern                 | typescript-pro     |
   # | Missing error handling in services        | typescript-pro     |
   # | RLS policy missing/misconfigured          | sql-pro            |
   # | Missing database indexes                  | sql-pro            |
   # | Client Components used unnecessarily      | frontend-developer |
   # | Code style/simplification                 | code-simplifier    |
   # | FastAPI endpoint issues                   | backend-architect  |
   #
   # For each fixable issue:
   # 1. Invoke the appropriate agent with issue context and file path
   # 2. Agent reads affected files and applies fix
   # 3. Track which files were modified
   #
   # Issues that CANNOT be auto-fixed (skip these):
   # - Missing test coverage (requires understanding intent)
   # - Architecture decisions (requires human judgment)
   # - Complex security vulnerabilities (needs manual review)
   # - Business logic issues (domain-specific)
   ```

   **Example agent invocation:**
   ```
   Task({
     subagent_type: "typescript-pro",
     prompt: "Fix the following service layer violation in {file}:
       Issue: Direct Supabase query found at line {line}
       Current code: {code_snippet}
       Apply the fix following CLAUDE.md patterns:
       - Use appropriate service from services/domain/
       - Follow singleton pattern
       - Preserve existing functionality"
   })
   ```

   **Output:**
   ```
   🔧 Auto-Fix Results:

   Issues Found: {critical_count} critical, {high_count} high priority

   Fixes Applied:
   ✅ {issue_1}: Fixed by {agent_name}
   ✅ {issue_2}: Fixed by {agent_name}
   ⏭️ {issue_3}: Skipped (requires manual intervention)

   Files Modified: {file_list}
   ```

   **Commit fixes (if any applied):**
   ```bash
   git add -A
   git commit -m "fix(#{issue}): Auto-fix review findings

   - {fix_summary_1}
   - {fix_summary_2}

   Co-Authored-By: Claude Code <noreply@anthropic.com>"
   git push
   ```

   **Re-verify (if fixes applied):**
   ```
   # Re-run code-reviewer agent on modified files only
   # Update findings to reflect applied fixes
   ```

9. **Generate Review Summary (Post-Fix)**

   **Check implementation against plan:**
   - Did implementation follow the architecture decision?
   - Were all planned steps completed?
   - Do validation results look correct?

   ```
   # Create comprehensive review summary
   # Post as PR comment if significant findings
   ```
   **Output:**
   ```
   📝 Review Summary:

   This PR is {ready for merge|needs attention|blocked}

   Plan Compliance:
   ✅ Architecture matches plan
   ✅ All implementation steps completed
   ✅ Validation passed

   ✅ Passing: {list}
   ⚠️ Warnings: {list}
   ❌ Blocking: {list}

   💡 Next Steps:
     - {action_1}
     - {action_2}
   ```

10. **Complete Review**
   **Output:**
   ```
   ✅ Review complete for PR #{pr}

   📊 Final Status:
     Ready to Merge: {yes|no}
     Blocking Issues: {count}
     Auto-Fixes Applied: {fix_count}

   💡 Next step: '/test' to run local CI before merging
      Or: '/merge {pr}' if CI already passed
   ```

   *Note: Review status is automatically saved by PostToolUse hook*

## Review Checklist

The automated review checks for:

### Code Quality
- [ ] No ESLint/TypeScript errors
- [ ] Consistent code style
- [ ] No dead code or unused imports
- [ ] Proper error handling

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] SQL injection prevention
- [ ] XSS prevention

### Architecture
- [ ] Service layer patterns followed
- [ ] RLS policies for new tables
- [ ] Proper type definitions
- [ ] No circular dependencies

### Testing
- [ ] Unit tests for new functions
- [ ] Integration tests for APIs
- [ ] E2E tests for user flows
- [ ] Adequate coverage

### Documentation
- [ ] Code comments where needed
- [ ] Updated README if applicable
- [ ] API documentation current
- [ ] Migration notes included
