---
model: sonnet
description: Project State Snapshot
---

# /audit - Project State Snapshot

Capture a comprehensive snapshot of the project's current state including codebase, GitHub board, key metrics, and production observation insights.

[Extended thinking: This workflow captures a snapshot of the project including codebase structure, GitHub project board state, open issues/PRs, and key metrics. The output serves as the foundation for vision refinement and roadmap planning.]

## Usage
```
/audit
```

## Agent Orchestration

| Task | Agent | Purpose |
|------|-------|---------|
| Codebase Analysis | **Explore** | Feature completeness, tech debt, architecture health |
| GitHub State | **general-purpose** | Issues, PRs, project board |
| Metrics | **general-purpose** | Test coverage, CI status, dependencies |

## Execution

When invoked with `/audit`, execute these steps:

1. **Begin Audit**
   **Output:**
   ```
   🤖 Starting project audit...
   📊 Gathering codebase, board, metrics, and observation data
   ```

2. **Read Observation Digests**
   - Check for recent observation digests in `docs/observation/autoobs/*.md` (last 4 weeks)
   - Extract key insights: system health trends, SLO compliance, findings, recommended actions

3. **Codebase Analysis** (Explore agent)
   Analyze the YogaKit codebase structure against the product ladder in
   `CLAUDE.md` (`002-auth-tenancy-billing` → `003-pose-library` →
   `004-sequencing-composer` → `005-daily-sadhana` → `006-profile-settings`):
   - Current feature completeness by product feature (see `specs/00{2,3,4,5,6}-*/tasks.md`)
   - Technical debt indicators (TODO comments, deprecated patterns, missing tests)
   - Architecture health (friction-engine/validator-lite determinism intact,
     100% engine unit-test line coverage, Tier-1 pose completeness)
   - Recent changes and their impact

4. **GitHub Project State**
   Use gh CLI to gather:
   ```bash
   gh issue list --state open --limit 50    # Open issues
   gh pr list --state open                  # Open PRs
   gh issue list --state closed --limit 20  # Recently closed
   ```
   - Label counts (`ready-for-dev`, `auto-ok`, `auto/needs-human`) stand in
     for a project board — there is no separate GitHub Project board yet.

5. **Metrics Collection**
   - Check test coverage if available (`npm run test:coverage`)
   - Check recent CI/CD build status (`.github/workflows/ci.yml`)
   - Count files by type and location
   - Identify dependency versions and updates needed

6. **Generate Audit Report**
   Create `docs/planning/autopm/YYYY-MM-DD.md`:

   ```markdown
   # Project Audit - YYYY-MM-DD

   ## Executive Summary
   [2-3 sentence overview of project health]

   ## Codebase State
   ### Feature Completeness
   | Feature | Status | Notes |
   |---------|--------|-------|
   | 002-auth-tenancy-billing | ... | ... |
   | 003-pose-library | ... | ... |
   | 004-sequencing-composer | ... | ... |
   | 005-daily-sadhana | ... | ... |
   | 006-profile-settings | ... | ... |

   ### Technical Debt
   - [ ] Item 1

   ### Architecture Health
   - Friction-engine/validator-lite determinism: intact/violated
   - Engine unit-test line coverage: X%
   - Tier-1 pose completeness: X%

   ## GitHub State
   ### Open Issues: N
   [Top 5 by priority]

   ### Open PRs: N
   [List with status]

   ## Metrics
   - Test coverage: X%
   - Build status: passing/failing
   - Dependencies needing updates: N

   ## Observation Insights
   - Overall status: {HEALTHY/DEGRADED/AT-RISK}
   - SLO Compliance: {X}/{Y} SLOs
   - Findings from the Observation Loop

   ## Recommended Focus Areas
   1. ...
   2. ...
   ```

7. **Complete Audit**
   **Output:**
   ```
   ✅ Audit Complete
   📁 Report saved: docs/planning/autopm/YYYY-MM-DD.md
   💡 Next steps: '/tools:01_project_management:vision' or '/tools:01_project_management:kanban'
   ```

## Observation Loop Integration

The audit reads from the Observation Loop to inform PM planning:
- **System health trends** - Is the app stable or degrading?
- **SLO compliance** - Which SLOs need attention?
- **Findings** - What did the last `/tools:03_observation:autoobs` sweep flag?
- **Recommended actions** - What should PM prioritize?

## Output Location

`docs/planning/autopm/YYYY-MM-DD.md`
