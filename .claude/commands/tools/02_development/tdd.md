---
model: sonnet
description: TDD Test Writing
argument-hint: "[issue#]"
---

# /tdd - TDD Test Writing

Write failing tests based on the implementation plan before development begins. Follows Test-Driven Development methodology.

[Extended thinking: Analyze the implementation plan from `/plan` and write comprehensive failing tests that define the expected behavior. Tests should cover unit, integration, and E2E scenarios as specified in the plan's Testing Requirements section.]

## Usage
```
/tdd <issue_number_or_url>
```

## Examples
```
/tdd 123
/tdd #123
/tdd https://github.com/user/repo/issues/123
```

> **Prerequisite:** Run `/plan <issue>` first to create the implementation plan with testing requirements.

## Agent Invocation Instructions

When this command lists agents in orchestration tables or says "Use [agent-name]":
1. **Invoke the Task tool** with `subagent_type` set to the agent name
2. **Provide context** in the prompt including:
   - The issue number/URL
   - Testing requirements from the `/plan` comment
   - Specific test scenarios to write
3. **Wait for completion** before proceeding to dependent agents
4. **Run independent agents in parallel** when possible (multiple Task calls in one message)

**Example:**
- Instruction: "Use `tdd-guide` to write failing tests"
- Execution: `Task(subagent_type="tdd-guide", prompt="Write failing tests for issue #X based on the testing requirements in the plan comment. Requirements: [context from plan]. Follow TDD Red-Green-Refactor methodology.")`

## Reading the Plan

Before writing tests, fetch and parse the implementation plan from the GitHub issue:

1. **Fetch issue and comments**: Use `gh issue view <number> --comments`
2. **Find the plan comment**: Look for the implementation plan comment from `/plan`
3. **Extract testing requirements**:
   - Unit Tests section
   - Integration Tests section
   - E2E Tests section
   - Files to be created/modified (for test file paths)
4. **Follow the plan's test requirements exactly**

> **Important:** If no plan exists, prompt the user to run `/plan <issue>` first.

## Agent Orchestration

| Agent | Purpose |
|-------|---------|
| **tdd-guide** | Write failing tests based on plan's testing requirements |

## Execution

When invoked with `/tdd <issue>`, execute these steps:

1. **Validate Input**
   ```
   # If no argument provided, show error:
   "Please provide an issue number or URL"

   # Parse issue number from various formats (123, #123, URL)
   ```

2. **Begin TDD Workflow**
   **Output:**
   ```
   Starting TDD test writing workflow...
   Analyzing issue: {issue}
   ```

3. **Fetch Issue and Plan**

   - Parse issue number from various formats (123, #123, URL)
   - Fetch issue details: `gh issue view <number> --comments`
   - **Find the implementation plan** in comments (from `/plan`)
   - If no plan found: "No implementation plan found. Run `/plan <issue>` first."
   - Extract testing requirements:
     - Unit Tests checklist
     - Integration Tests checklist
     - E2E Tests checklist
     - Files to modify (for determining test file paths)

4. **Determine Test File Paths**

   Based on the plan's "Files to Modify" section, determine corresponding test file paths:
   - `frontend/src/services/domain/X/XService.ts` -> `frontend/src/services/domain/X/__tests__/XService.test.ts`
   - `frontend/src/components/features/X/Y.tsx` -> `frontend/src/components/features/X/__tests__/Y.test.tsx`
   - `frontend/src/app/api/X/route.ts` -> `frontend/src/app/api/X/__tests__/route.test.ts`
   - E2E tests go in `frontend/e2e/`

5. **Write Failing Tests**

   Use Task tool with `subagent_type="tdd-guide"`:

   **Prompt:** "Write failing tests for issue #{issue} based on the testing requirements from the plan:

   **Unit Tests Required:**
   [List from plan]

   **Integration Tests Required:**
   [List from plan]

   **E2E Tests Required:**
   [List from plan]

   **Files to be implemented:**
   [List from plan]

   Follow TDD methodology:
   1. Write tests that define expected behavior
   2. Tests MUST fail initially (functions don't exist yet)
   3. Use proper mocking for external dependencies (Supabase, etc.)
   4. Cover edge cases (null, empty, invalid input, errors)
   5. Test names should describe what's being tested

   Create test files at the appropriate paths following project conventions."

   **Agent Output:**
   - Test files created with failing tests
   - Summary of tests written and their purposes

6. **Verify Tests Fail**

   ```bash
   # Run the new tests to verify they fail
   cd frontend && npm test -- --testPathPattern="<test-file-pattern>" --passWithNoTests
   ```

   Tests should fail because the implementation doesn't exist yet. This confirms the "Red" phase of TDD.

7. **Post Test Summary to GitHub Issue**

   ```bash
   gh issue comment {issue_number} --body "$(cat <<'EOF'
   ## TDD Tests Written

   **Test Files Created:**
   - `path/to/test1.test.ts` - [purpose]
   - `path/to/test2.test.tsx` - [purpose]

   ### Unit Tests
   - [ ] `describe('FunctionName')` - [what it tests]
   - [ ] `describe('AnotherFunction')` - [what it tests]

   ### Integration Tests
   - [ ] `describe('API /endpoint')` - [what it tests]

   ### E2E Tests
   - [ ] `test('user flow description')` - [what it tests]

   **Status:** All tests failing (expected - implementation pending)

   ---
   *Generated by `/tdd` - Run `/dev {issue}` to implement and make tests pass*
   EOF
   )"
   ```

8. **Complete TDD Setup**
   **Output:**
   ```
   TDD setup complete
   Test files created and verified failing
   Summary posted to issue #{issue}
   Next step: '/dev {issue}' to implement and make tests pass
   ```
