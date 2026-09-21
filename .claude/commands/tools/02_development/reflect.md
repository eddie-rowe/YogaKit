---
model: sonnet
description: Development Session Reflection
---

# /reflect - Development Session Reflection

Analyze the current development session, identify patterns from work completed, and capture learnings.

## Usage
```
/reflect [scope]
```

## Examples
```
/reflect
/reflect typescript
/reflect testing
```

## Execution

When invoked with `/reflect [scope]`, execute these steps:

1. **Parse Parameters**
   ```
   # Default scope: "session" if not specified

   # Valid scopes: session, typescript, testing, database
   ```

2. **Gather Session Context**

   Review the current conversation to identify:
   - What issue/task was being worked on
   - Files that were created, modified, or read
   - Errors encountered and how they were resolved
   - Tests that were run and their outcomes
   - Tools and commands that were used

   **Output:**
   ```
   🔍 Session Analysis

   📋 Task Context:
     Issue: #{issue_number} - {issue_title}
     Phase: {planning|development|testing|deployment}
     Duration: {approximate_session_length}

   📁 Files Touched:
     Created: {count}
     Modified: {count}
     Read: {count}
   ```

3. **Phase 1: Challenge Analysis**

   Identify challenges encountered during the session:
   - Errors and exceptions that occurred
   - Debugging steps taken
   - Solutions that worked vs. didn't work
   - External blockers (missing dependencies, API issues, etc.)

   **Output:**
   ```
   🔧 Challenges Encountered:

   Errors Resolved:
     - {error_1}: {resolution}
     - {error_2}: {resolution}

   Debugging Insights:
     - {insight_1}
     - {insight_2}

   Blockers:
     - {blocker_1}: {status}
   ```

4. **Phase 2: Pattern Recognition**

   Identify recurring patterns from the session:
   - Code patterns that were applied
   - Service layer usage patterns
   - Testing patterns
   - Common fixes or adjustments

   **Output:**
   ```
   📊 Patterns Identified:

   Successful Approaches:
     - {pattern_1}
     - {pattern_2}

   Anti-patterns Avoided:
     - {antipattern_1}
     - {antipattern_2}

   Code Quality Notes:
     - {note_1}
     - {note_2}
   ```

5. **Phase 3: Knowledge Capture**

   Extract learnings that should be remembered:
   - Project-specific knowledge discovered
   - Codebase conventions identified
   - Integration points understood
   - Configuration details learned

   **Output:**
   ```
   💡 Key Learnings:

   Codebase Insights:
     - {insight_1}
     - {insight_2}

   Technical Discoveries:
     - {discovery_1}
     - {discovery_2}

   Future Reference:
     - {reference_1}
     - {reference_2}
   ```

6. **Phase 4: Improvement Suggestions**

   Based on the session, suggest improvements:
   - Workflow optimizations
   - Missing documentation
   - Potential refactoring opportunities
   - Test coverage gaps

   **Output:**
   ```
   ⚡ Suggested Improvements:

   Workflow:
     - {improvement_1}
     - {improvement_2}

   Documentation Gaps:
     - {gap_1}
     - {gap_2}

   Technical Debt:
     - {debt_1}
     - {debt_2}
   ```

7. **Generate Reflection Report**

   **REQUIRED:** Create reflection summary and save to the retro directory.

   Execute these commands to save the report:
   ```bash
   # Always create the directory first (idempotent)
   mkdir -p docs/planning/retro

   # Determine filename based on context:
   # - If working on an issue: YYYY-MM-DD-reflection-{issue_number}.md
   # - Otherwise: YYYY-MM-DD-reflection.md

   # Write the full reflection report to the file using the Write tool
   # Path: docs/planning/retro/YYYY-MM-DD-reflection-{issue}.md
   ```

   **Report must include:**
   - Date and issue context
   - Files touched summary
   - Challenges and resolutions
   - Patterns identified
   - Key learnings
   - Suggested improvements
   - Action items

   **Output:**
   ```
   📝 Reflection Summary:

   Session Accomplishments:
     ✅ {accomplishment_1}
     ✅ {accomplishment_2}

   Remaining Work:
     ⏳ {remaining_1}
     ⏳ {remaining_2}

   Action Items for Next Session:
     - [ ] {action_1}
     - [ ] {action_2}
   ```

8. **Commit Reflection Report**

   ```bash
   # Stage the reflection report
   git add docs/planning/retro/

   # Commit with descriptive message
   git commit -m "docs(#{issue}): add reflection report

   Captures session learnings, patterns, and action items.

   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
   ```

9. **Complete Reflection**
   **Output:**
   ```
   ✅ Reflection complete!

   📊 Session Summary:
     Task: {task_description}
     Status: {completed|in_progress|blocked}
     Challenges: {challenge_count}
     Learnings: {learning_count}

   📂 Report saved and committed: docs/planning/retro/YYYY-MM-DD-reflection.md

   💡 Next Steps:
     - '/tools:02_development:pr {issue}' to create PR
   ```

## Report Storage

Reflection reports are saved to `docs/planning/retro/` with the naming convention:
- `YYYY-MM-DD-reflection.md` - Standard session reflection
- `YYYY-MM-DD-reflection-{issue}.md` - Issue-specific reflection

Reports include:
- Session summary
- Challenges and resolutions
- Patterns identified
- Key learnings
- Action items for continuation

## Scope Options

| Scope | Focus Area | Analysis Focus |
|-------|------------|----------------|
| `session` | Full session (default) | Everything in current conversation |
| `typescript` | Frontend code | TypeScript patterns, React components |
| `testing` | Test work | Test patterns, coverage, failures |
| `database` | Database work | Migrations, RLS, queries |

## What Gets Analyzed

This reflection analyzes context from the current Claude session:

1. **Conversation History** - Tasks requested, solutions provided
2. **Tool Usage** - Files read/written, commands run, searches performed
3. **Error Handling** - Errors encountered and resolutions
4. **Decision Points** - Choices made and rationale

## Integration

Pairs well with:
- `/tools:02_development:autodev` - Continue development with insights applied
- `/tools:02_development:test` - Verify changes before reflection
- `/tools:02_development:pr` - Capture learnings before PR creation
