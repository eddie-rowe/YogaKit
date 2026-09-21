---
model: sonnet
description: Feature Development
argument-hint: "[issue#]"
---

# /dev - Feature Development

Implement features following the plan from `/plan`. Requires a planned GitHub issue.

[Extended thinking: Implement the plan specified in the GitHub issue. Do not make architecture decisions - follow what /plan has defined. Focus on code quality, service layer patterns, and test coverage.]

## Usage
```
/dev <issue_number_or_url>
```

## Examples
```
/dev 123
/dev #123
/dev https://github.com/user/repo/issues/123
```

> **Prerequisite:** Run `/plan <issue>` first to create the implementation plan.

## Agent Invocation Instructions

When this command lists agents in orchestration tables or says "Use [agent-name]":
1. **Invoke the Task tool** with `subagent_type` set to the agent name
2. **Provide context** in the prompt including:
   - The issue number/URL or feature description
   - Relevant requirements and acceptance criteria
   - Prior analysis context from `/plan` if available
   - Specific task for this agent to complete
3. **Wait for completion** before proceeding to dependent agents
4. **Run independent agents in parallel** when possible (multiple Task calls in one message)

**Example:**
- Instruction: "Use `typescript-pro` to implement service layer"
- Execution: `Task(subagent_type="typescript-pro", prompt="Implement the service layer for issue #X following the plan in the issue comments. Requirements: [context from plan]. Use singleton pattern, proper typing.")`

## Reading the Plan

Before implementing, fetch and parse the implementation plan from the GitHub issue:

1. **Fetch issue and comments**: Use `gh issue view <number> --comments`
2. **Find the plan comment**: Look for the implementation plan comment from `/plan`
3. **Extract key details**:
   - Architecture decision (FastAPI or PostgREST)
   - Database schema changes
   - Service layer design
   - Component structure
   - Files to create/modify
4. **Follow the plan exactly** - do not deviate or make architecture decisions

> **Important:** If no plan exists, prompt the user to run `/plan <issue>` first.

## Agent Orchestration

### Schema Implementation (if plan requires database changes)
| Agent | When to Use |
|-------|-------------|
| **sql-pro** | Implement database schema changes specified in the plan |

**When invoking sql-pro, ensure these requirements are met:**
- Auth optimization: Use `(SELECT auth.uid())` not bare `auth.uid()`
- FK indexes: Every foreign key column must have an index
- Function security: All functions must have `SET search_path = ''`
- Timestamp conventions: `created_at`/`updated_at` with auto-update triggers
- Primary keys: UUID for domain entities, BIGSERIAL for time-series

### Implementation (based on analysis)
| Agent | When to Use |
|-------|-------------|
| **typescript-pro** | Always - Frontend service layer (mandatory singleton pattern) |
| **frontend-developer** | If UI components needed - Next.js Server/Client patterns |
| **backend-architect** | Only if FastAPI backend required |

### Quality Assurance (after implementation)
| Agent | When to Use |
|-------|-------------|
| **code-simplifier** | Always - Refine code for clarity and consistency |

## Execution

When invoked with `/dev <argument>`, execute these steps:

1. **Validate Input**
   ```
   # If no argument provided, show error:
   "❌ Please provide either an issue number or feature description"

   # Parse argument to determine if GitHub issue (number/URL) or feature description
   ```

2. **Begin Development**
   **Output:**
   ```
   ⚡ Starting feature development workflow...
   ```

3. **Fetch Issue and Plan**

   - Parse issue number from various formats (123, #123, URL)
   - Fetch issue details: `gh issue view <number> --comments`
   - **Find the implementation plan** in comments (from `/plan`)
   - If no plan found: "⚠️ No implementation plan found. Run `/plan <issue>` first."
   - Extract: architecture decision, schema changes, files to modify, implementation steps

4. **Execute Development Following the Plan**

   **Implementation Process (follow plan order):**
   1. Use `sql-pro` if plan specifies database changes
   2. Use `typescript-pro` for service layer implementation
   3. Use `frontend-developer` for UI components
   4. Use `backend-architect` only if plan specifies FastAPI work
   5. Use `code-simplifier` to refine recently written code

   **Key Rules:**
   - Follow the plan exactly - do not make architecture decisions
   - Run independent agents in parallel when possible
   - If plan is unclear, ask user for clarification

5. **Architecture Requirements**

   All implementations must ensure:
   - **Service Layer**: Mandatory for all data operations
   - **RLS Policies**: Multi-tenant farm data protection
   - **No Direct DB Calls**: Components must use services only
   - **Type Safety**: Full TypeScript and Python typing
   - **CLAUDE.md Compliance**: Follow all project patterns

6. **Create Branch and Commit**

   ```bash
   # Create branch from issue number and title
   git checkout -b {issue_number}-{slugified-title}

   # Stage all changes
   git add .

   # Commit with descriptive message
   git commit -m "feat(#{issue_number}): [brief description]

   Implements the plan from /plan. See issue for details.

   🤖 Generated with Claude Code"

   # Push to remote and set upstream
   git push -u origin {branch_name}
   ```

7. **Post Development Summary to Issue**

   ```bash
   gh issue comment {issue_number} --body "$(cat <<'EOF'
   ## Development Complete

   **Branch:** `{branch_name}` ([view](../../tree/{branch_name}))

   ### Changes Made
   - [list of files changed with brief descriptions]

   ### Tests Added
   - [list of tests written]

   ### Summary
   [Brief description of what was implemented]

   ---
   *Generated by `/dev` - Run `/validate {issue}` to test*
   EOF
   )"
   ```

8. **Complete Development**
   **Output:**
   ```
   ✅ Development complete
   🌿 Branch: {branch_name} pushed to origin
   📝 Summary posted to issue #{issue}
   💡 Next step: '/validate {issue}' to test the implementation
   ```
