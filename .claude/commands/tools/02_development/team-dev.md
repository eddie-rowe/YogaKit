---
model: opus
description: Parallel issue processing with Agent Teams
argument-hint: "[issue# issue# issue# ...]"
---

# /team-dev - Parallel Issue Processing with Agent Teams

Process multiple GitHub issues in parallel using Claude Code Agent Teams. Analyzes dependencies between issues, groups them into parallelizable waves, and dispatches teammates to implement concurrently.

[Extended thinking: This is the orchestrator command. The lead (you) never implements code directly. You plan all issues centrally to detect file conflicts and dependencies, then spawn teammates to implement in parallel waves. Between waves, you review, merge, and pull latest main so the next wave builds on merged code. Each teammate runs /tdd → /dev → /pr for their assigned issue.]

## Usage
```
/team-dev 99 100 101 102 103 104 105 106 107
/team-dev 42 43 44
```

## Prerequisites
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json` env
- All issue numbers must reference open GitHub issues
- Issues should have clear titles and descriptions (see Issue Design section below)

## Architecture

```
Phase 1: LEAD plans all issues (sequential, centralized)
Phase 2: TEAMMATES implement per wave (parallel, up to 3)
Phase 3: LEAD reviews and merges wave (sequential, centralized)
Repeat Phases 2-3 for each wave
Phase 4: LEAD runs consolidated reflection
```

### Why This Split

| Step | Who | Why |
|------|-----|-----|
| `/plan` | Lead | Needs cross-issue context to detect file conflicts and build dependency graph |
| `/tdd` | Teammate | Scoped to one issue — no cross-issue dependencies |
| `/dev` | Teammate | Implements one issue per branch following the plan |
| `/pr` | Teammate | Creates PR from their branch — independent per issue |
| `/review` | Lead | Opus-level review needs full project context; sequential |
| `/merge` | Lead | Inherently sequential — each merge affects the next |
| `/finalize` | Lead | Quick, cheap, lead already has context from review |
| `/reflect` | Lead | Consolidated reflection across ALL issues — more valuable than per-issue |

## Execution

When invoked with `/team-dev <issue1> <issue2> ...`, execute these steps:

### Phase 1: Centralized Planning

1. **Validate Input**
   ```
   # Parse all issue numbers from arguments
   # If fewer than 2 issues provided:
   "⚠️ For a single issue, use '/plan' → '/dev' → '/pr' directly.
    /team-dev is designed for batch processing 2+ issues."
   ```

2. **Fetch All Issues**
   For each issue number, fetch details:
   ```bash
   gh issue view {number} --json number,title,state,body,labels,milestone
   ```
   Verify all issues are open. Report any closed/missing issues and proceed with valid ones.

3. **Run /plan for Each Issue**
   Execute `/plan {issue}` sequentially for each issue. This posts an implementation plan comment to each GitHub issue containing:
   - Files to create/modify (critical for dependency analysis)
   - Database changes
   - Service layer changes
   - Component dependencies
   - Testing requirements

   **Output after each plan:**
   ```
   ✅ Planned {current}/{total}: #{issue} - {title}
   ```

4. **Build Dependency Graph**

   After ALL plans are complete, analyze the plan comments to build a dependency graph:

   **4a. Extract file lists from each plan:**
   ```bash
   # For each issue, fetch the /plan comment and extract "Files to Modify" section
   gh issue view {number} --json comments --jq '.comments[-1].body'
   ```

   Parse out the `### Files to Modify` section from each plan to get the file list per issue.

   **4b. Detect file conflicts:**
   ```
   For each pair of issues (i, j):
     files_i = files from issue i's plan
     files_j = files from issue j's plan
     overlap = files_i ∩ files_j
     if overlap is not empty:
       Mark issues i and j as CONFLICTING
       Record conflicting files
   ```

   **4c. Detect component/schema dependencies:**
   ```
   For each pair of issues (i, j):
     If issue i creates a component/table that issue j references:
       Mark j as DEPENDS_ON i
   ```

   **4d. Assign waves using topological sort:**
   ```
   Wave 1: Issues with no dependencies and no conflicts with each other
   Wave 2: Issues whose dependencies are all in Wave 1 (+ no intra-wave conflicts)
   Wave 3: Issues whose dependencies are all in Waves 1-2 (+ no intra-wave conflicts)
   ...continue until all issues assigned
   ```

   **Conflict resolution within waves:**
   - If two issues conflict (same files), put them in separate waves
   - Prefer putting the simpler issue first (fewer files to modify)
   - Maximum 3 issues per wave (concurrency limit)

5. **Present Wave Plan to User**

   Use AskUserQuestion to confirm the wave assignments:
   ```
   Wave Plan for {N} issues:

   Wave 1: #{a} ({title}), #{b} ({title}), #{c} ({title})
     → No dependencies, no file conflicts

   Wave 2: #{d} ({title}), #{e} ({title})
     → Depends on Wave 1: #{d} needs #{a}'s components

   Wave 3: #{f} ({title})
     → Depends on Wave 2: #{f} needs #{d}'s status system

   Estimated: {N} waves, ~{time} per wave

   Proceed with this plan?
   ```

   Options: "Proceed", "Reorder waves", "Remove issues"

### Phase 2: Parallel Implementation (Per Wave)

For each wave:

6. **Announce Wave Start**
   ```
   🌊 Starting Wave {n}/{total_waves}
   Issues: #{a} ({title}), #{b} ({title}), #{c} ({title})
   ```

7. **Spawn Teammates**

   Spawn one teammate per issue in the wave (max 3 concurrent). Use Sonnet model for teammates.

   **Spawn prompt for each teammate:**
   ```
   You are implementing GitHub issue #{issue}: {title}

   IMPORTANT: You are a teammate in an agent team. Your job is to implement
   this single issue and create a PR. Do NOT modify files outside your
   assigned scope.

   ## Your Implementation Plan
   {paste the full /plan comment content for this issue}

   ## Your Assigned Files
   Only create/modify these files:
   {file list from the plan}

   ## Instructions
   Execute these steps in order:

   1. Make sure you are on the main branch and it is up to date:
      git checkout main && git pull origin main

   2. Create your feature branch:
      git checkout -b {issue_number}-{slugified-title}

   3. Run /tdd {issue_number}
      - This writes failing tests based on the plan
      - Verify the tests fail (Red phase)

   4. Run /dev {issue_number}
      - This implements the feature to make tests pass
      - Follow the plan exactly — do not make architecture decisions

   5. Run /pr {issue_number}
      - This creates a PR with context from all issue comments
      - Note the PR number from the output

   6. When done, message the lead:
      "DONE: Issue #{issue_number} — PR #{pr_number} created"

   If you encounter errors:
   - Try to resolve them within your assigned files
   - If blocked, message the lead: "BLOCKED: Issue #{issue_number} — {description}"
   ```

8. **Monitor Teammates**

   While teammates are working:
   - Watch for "DONE" or "BLOCKED" messages
   - If a teammate reports BLOCKED, assess the issue and either:
     - Message the teammate with guidance to unblock
     - If unrecoverable, note the issue for the next wave or manual handling
   - Track completion: `{completed}/{total_in_wave} teammates done`

9. **Wait for Wave Completion**

   All teammates in the wave must either finish (DONE) or be marked as failed (BLOCKED) before proceeding. Do NOT start Phase 3 until the wave is complete.

   ```
   ✅ Wave {n} complete: {succeeded}/{total} succeeded
   {If any failed: "⚠️ Failed: #{issue} — will retry in a later wave or flag for manual handling"}
   ```

### Phase 3: Sequential Quality Gate (Per Wave)

10. **Review and Merge Each PR**

    For each successful PR from the wave, sequentially:

    ```
    For each PR in wave:
      a. /review {pr_number}
         - Opus reviews implementation against plan
         - If CRITICAL issues found: message teammate to fix, wait, re-review
         - If only minor issues: note them but proceed

      b. /merge {pr_number}
         - Squash merge to main
         - Verify CI passes
         - If merge conflict: resolve or rebase

      c. /finalize {issue_number}
         - Close issue with journey summary
         - Generate prompting log
    ```

11. **Update Main Branch**
    ```bash
    git checkout main && git pull origin main
    ```
    This ensures the next wave's teammates start from the latest merged code.

12. **Report Wave Results**
    ```
    🌊 Wave {n} Results:
    ✅ Merged: #{a} (PR #{x}), #{b} (PR #{y}), #{c} (PR #{z})
    ❌ Failed: #{d} — {reason} (will retry)
    📊 Progress: {completed_issues}/{total_issues} issues done
    ```

### Repeat Phases 2-3

Continue spawning waves until all issues are processed.

Handle failed issues:
- Issues that failed in a wave get added to a retry queue
- Retry once in a subsequent wave
- If still failing after retry, report to user for manual handling

### Phase 4: Wrap-Up

13. **Consolidated Reflection**

    After all waves complete, run a single `/reflect` covering the entire batch:
    - Patterns across all issues
    - Cross-cutting insights
    - Workflow meta-learning about the agent teams process
    - What could be parallelized better next time

14. **Final Report**
    ```
    🏁 /team-dev Complete

    📊 Summary:
    Issues processed: {N}
    Waves: {W}
    PRs merged: {M}
    Failed/deferred: {F}

    📋 Issues Completed:
    | Issue | Title | PR | Wave |
    |-------|-------|----|------|
    | #99 | Lead Detail Page | #200 | 1 |
    | #103 | User Settings | #201 | 1 |
    | ...  | ... | ... | ... |

    {If any failed:}
    ⚠️ Issues Requiring Manual Attention:
    | Issue | Title | Reason |
    |-------|-------|--------|
    | #104 | Lead Status | Merge conflict with #102 |

    💡 Reflection saved to: docs/reports/reflections/{date}-team-dev.md
    ```

## Error Recovery

| Scenario | Recovery |
|----------|----------|
| Teammate `/dev` fails | Lead messages teammate with fix guidance; if unrecoverable, defer to next wave |
| Teammate `/tdd` fails | Lead messages teammate to skip TDD and proceed with `/dev` directly |
| PR has merge conflicts | Lead resolves conflicts manually or asks teammate to rebase on latest main |
| Teammate goes idle/stuck | Lead sends nudge message; if no response, spawn replacement teammate |
| Wave partially completes | Merge completed PRs, carry failed issues to retry queue |
| CI fails on merged PR | Lead investigates, creates hotfix, continues with next wave |
| All teammates in wave fail | Stop, report to user, ask for guidance before continuing |

## Concurrency Limits

- **Max 3 teammates per wave** — Balances parallelism with cost and conflict risk
- **1 wave at a time** — Next wave starts only after current wave is fully merged
- **Sequential merges within a wave** — Prevents merge conflicts between PRs

## Cost Expectations

| Batch Size | Waves (est.) | Token Multiplier vs Sequential |
|------------|-------------|-------------------------------|
| 2-3 issues | 1 wave | ~2-3x (but finishes in 1 pass) |
| 4-6 issues | 2 waves | ~3x (vs 4-6 sequential passes) |
| 7-9 issues | 3 waves | ~3x (vs 7-9 sequential passes) |
| 10+ issues | 4+ waves | ~3-4x (consider splitting into two /team-dev runs) |

## When NOT to Use /team-dev

Use sequential `/plan` → `/dev` → `/pr` instead when:
- **Single issue** — No parallelism benefit
- **All issues touch the same files** — Everything will serialize anyway
- **Issues require human design decisions mid-implementation** — Teammates can't pause for input
- **Exploratory/unclear issues** — Better to process one at a time with more oversight

## Comparison with Ralph Loop

| Feature | Ralph Loop | /team-dev |
|---------|-----------|-----------|
| Execution | Sequential | Parallel waves |
| Speed | 1x per issue | Up to 3x per wave |
| Cost | 1x | ~3x |
| Conflict risk | None | Low (wave-gated) |
| Error recovery | Manual restart | Retry queue |
| Best for | Well-defined sequential work | Independent parallel work |
| Quality gates | Same SDLC steps | Same SDLC steps |
