---
model: haiku
description: Feature Validation
argument-hint: "[issue#]"
---

# /validate - Feature Validation

Comprehensively validate feature implementation by testing against Vercel preview deployments.

[Extended thinking: Validate feature implementation by reading context from GitHub issue comments (plan + dev summary), wait for Vercel preview deployment to be ready, then run Playwright E2E tests against the preview URL. Also run unit tests locally. Post combined validation results back to the issue.]

## Usage
```
/validate <issue_number>
```

## Examples
```
/validate 65
/validate 123
```

## Agent Invocation Instructions

When this command lists agents in orchestration tables:
1. **Invoke the Task tool** with `subagent_type` set to the agent name
2. **Provide context** in the prompt including:
   - The issue number and requirements
   - Git diff summary of changes to validate
   - Specific validation scenarios to test
3. **Wait for completion** before proceeding

## Agent Orchestration

| Agent | Purpose |
|-------|---------|
| **playwright-tester** | UI/UX validation, screenshot evidence, user flow testing |

## Execution

When invoked with `/validate <issue>`, execute these steps:

1. **Validate Input**
   ```
   # If no argument provided, show error:
   "❌ Please provide an issue number"

   # Parse issue number from argument
   ```

2. **Begin Validation**
   **Output:**
   ```
   🔍 Starting feature validation workflow...
   📋 Validating implementation for issue: {issue}
   ```

3. **Fetch Context from GitHub**

   ```bash
   gh issue view {issue_number} --comments
   ```

   **Extract from comments:**
   - **From `/plan` comment**: E2E test scenarios, acceptance criteria
   - **From `/dev` comment**: Branch name, files changed, implementation summary

   If no `/dev` comment found:
   ```
   ⚠️ No development summary found. Run `/dev {issue}` first.
   ```

4. **Ensure Correct Branch**

   ```bash
   # Get current branch
   current_branch=$(git branch --show-current)

   # If not on the issue branch, checkout from remote
   if [[ "$current_branch" != "{expected_branch}" ]]; then
       echo "📥 Checking out branch: {branch_name}"
       git fetch origin {branch_name}
       git checkout {branch_name}
   fi
   ```

5. **Wait for Vercel Preview Deployment**

   **Output:**
   ```
   ⏳ Waiting for Vercel preview deployment...
   ```

   Query GitHub Deployments API for the preview deployment:
   ```bash
   # Get the current branch
   BRANCH=$(git branch --show-current)

   # Get the latest deployment for this branch
   DEPLOYMENT_ID=$(gh api "repos/{owner}/{repo}/deployments?ref=$BRANCH&per_page=1" --jq '.[0].id // empty')

   if [[ -z "$DEPLOYMENT_ID" ]]; then
       echo "⚠️ No deployment found for branch $BRANCH"
       echo "💡 Push changes to trigger a Vercel deployment"
       # Fall back to local testing
   fi
   ```

   Poll for deployment status (max 5 minutes):
   ```bash
   MAX_ATTEMPTS=30
   ATTEMPT=0

   while [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; do
       STATUS=$(gh api "repos/{owner}/{repo}/deployments/$DEPLOYMENT_ID/statuses" --jq '.[0].state // "pending"')

       if [[ "$STATUS" == "success" ]]; then
           echo "✅ Deployment ready!"
           break
       elif [[ "$STATUS" == "failure" || "$STATUS" == "error" ]]; then
           echo "❌ Deployment failed with status: $STATUS"
           break
       fi

       echo "⏳ Deployment status: $STATUS (attempt $((ATTEMPT + 1))/$MAX_ATTEMPTS)"
       sleep 10
       ATTEMPT=$((ATTEMPT + 1))
   done

   if [[ $ATTEMPT -ge $MAX_ATTEMPTS ]]; then
       echo "⚠️ Deployment timed out after 5 minutes"
   fi
   ```

6. **Get Preview URL**

   Extract the preview URL from the deployment:
   ```bash
   # Get the target_url from the deployment status
   PREVIEW_URL=$(gh api "repos/{owner}/{repo}/deployments/$DEPLOYMENT_ID/statuses" --jq '.[0].target_url // .[0].environment_url // empty')

   if [[ -z "$PREVIEW_URL" ]]; then
       # Try to get from deployment payload
       PREVIEW_URL=$(gh api "repos/{owner}/{repo}/deployments/$DEPLOYMENT_ID" --jq '.payload.web_url // empty')
   fi

   if [[ -n "$PREVIEW_URL" ]]; then
       echo "🌐 Preview URL: $PREVIEW_URL"
   else
       echo "⚠️ Could not find preview URL, falling back to local testing"
       PREVIEW_URL="http://localhost:3000"
   fi
   ```

7. **Change Analysis**
   - Run `git diff main...HEAD` to see all changes
   - Cross-reference with files listed in `/dev` summary
   - Identify frontend components, backend endpoints, database changes

8. **Run Unit Tests**

   ```bash
   npm run test:run
   ```

   Capture results:
   - Number of tests passed/failed
   - Any test failures with details

9. **Run E2E Tests Against Preview**

   Install Playwright browsers if needed:
   ```bash
   npx playwright install chromium --with-deps 2>/dev/null || npx playwright install chromium
   ```

   Run E2E tests with the preview URL:
   ```bash
   PREVIEW_URL="$PREVIEW_URL" npm run test:e2e
   ```

   **For additional scenario-specific tests**, use the **playwright-tester** agent to:
   - Navigate to relevant pages on the preview
   - Interact with new/modified features
   - Execute E2E scenarios from the `/plan` comment
   - Take screenshots of key functionality

10. **Execute Plan E2E Scenarios**

    Run the E2E tests specified in the `/plan` comment:
    ```
    ### Testing Requirements (from /plan)
    **E2E Tests (for /validate):**
    - [ ] [user flow to test]
    ```

    For each scenario:
    - Execute the user flow with Playwright against preview URL
    - Capture screenshot evidence
    - Mark pass/fail

11. **Validation Checks**
    | Check | Description |
    |-------|-------------|
    | Functionality | Feature works as intended |
    | Responsive | Works on different screen sizes |
    | Error Handling | Edge cases handled gracefully |
    | Accessibility | Standards met (keyboard nav, contrast, labels) |
    | Integration | Works with existing features |

12. **Post Validation Report to Issue**

    ```bash
    gh issue comment {issue_number} --body "$(cat <<'EOF'
    ## Validation Report

    **Branch:** `{branch_name}`
    **Preview URL:** {preview_url}
    **Validated by:** `/validate`

    ### Unit Test Results
    - **Total:** {total_tests}
    - **Passed:** {passed_tests} ✅
    - **Failed:** {failed_tests} ❌

    ### E2E Test Results (Against Preview)
    | Scenario | Status | Notes |
    |----------|--------|-------|
    | Homepage loads | ✅ Pass | |
    | Responsive design | ✅ Pass | Mobile & tablet viewports |
    | No console errors | ✅ Pass | |
    | [scenario from plan] | ✅ Pass | |

    ### Validation Checklist
    - [x] Functionality works as intended
    - [x] Responsive on different screen sizes
    - [x] Error handling for edge cases
    - [x] Accessibility standards met
    - [x] Integration with existing features

    ### Summary
    [Overall assessment and any issues found]

    ---
    *Generated by `/validate` - Run `/reflect` to capture learnings, then `/pr {issue}` to create PR*
    EOF
    )"
    ```

13. **Complete Validation**
    **Output:**
    ```
    ✅ Validation complete
    📝 Validation report posted to issue #{issue}
    🌐 Tested against: {preview_url}
    💡 Next step: '/reflect' to capture session learnings
    ```
