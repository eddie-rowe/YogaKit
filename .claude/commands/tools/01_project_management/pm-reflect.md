---
model: sonnet
description: PM Process Reflection
---

# /pm-reflect - PM Process Reflection

Review PM process effectiveness, analyze metrics, and identify improvements.

[Extended thinking: This workflow analyzes the PM loop's performance by examining cycle times and process bottlenecks. It generates insights and recommendations for improving the planning process.]

## Usage
```
/pm-reflect
```

## When to Use
- After completing major milestones
- At sprint/iteration boundaries
- When process feels inefficient
- Daily, as part of `/tools:01_project_management:autoretro`'s loop-closing sweep

## Agent Orchestration

| Task | Agent | Purpose |
|------|-------|---------|
| Metrics Analysis | **general-purpose** | Cycle time, throughput, trends |

## Execution

When invoked with `/pm-reflect`, execute these steps:

1. **Begin Reflection**
   **Output:**
   ```
   📊 Starting PM reflection workflow...
   ```

2. **Gather Historical Data**
   ```bash
   # Closed issues with timeline
   gh issue list --state closed --limit 50 --json number,title,createdAt,closedAt,labels,milestone

   # Merged PRs with timeline
   gh pr list --state merged --limit 30 --json number,title,createdAt,mergedAt
   ```

3. **Read Previous Planning Artifacts**
   - Read recent audits from `docs/planning/autopm/`
   - Read previous retro notes from `docs/planning/retro/` (there is no
     separate `roadmap.md` — the product ladder in `CLAUDE.md`, in dependency
     order, is the plan-vs-actual reference)

4. **Analysis Dimensions**

   | Dimension | Questions |
   |-----------|-----------|
   | Cycle Time | Avg time from issue creation to close? |
   | Ladder Accuracy | Is work landing on the next unshipped feature, or drifting? |
   | Process Bottlenecks | Where do issues get stuck? |
   | Planning Quality | Were descriptions sufficient? |
   | Momentum Health | Daily shipping frequency? Items stuck >3 days? |

5. **Momentum Score (Linear Method)**
   - **HIGH**: Daily commits, issues closed within cycle, no blockers
   - **MEDIUM**: Weekly shipping, some items slow, minor blockers
   - **LOW**: Multi-week stalls, many stuck items, major blockers
   - **STEADY-STATE-OWNER-BLOCKED**: backlog is fully owner-gated and the loop
     is shipping its connector-independent work as designed — not a failure
     state, do not conflate with LOW

6. **Generate Insights** (general-purpose agent)
   Analyze data and identify:
   - Trends in cycle time and throughput
   - Patterns in what gets delivered vs. the product ladder's stated order
   - Process improvement opportunities

7. **Generate Reflection Report**
   Write into `docs/planning/retro/YYYY-MM-DD.md` — the same file
   `/tools:01_project_management:autoretro`'s daily-retro-note step writes.
   **Append**, do not overwrite, a `## PM reflection` section:

   ```markdown
   ## PM reflection

   ### Executive Summary
   [2-3 sentences on overall PM effectiveness]

   ### Metrics
   | Metric | Value | Trend |
   |--------|-------|-------|
   | Avg issue cycle time | X days | ↑/↓/→ |
   | Throughput | N issues/week | - |

   ### Momentum Health
   | Indicator | Value | Status |
   |-----------|-------|--------|
   | Daily commit rate | X/day | ✅/⚠️ |
   | Items stuck >3 days | N | ✅/⚠️ |

   ### Ladder vs Actual
   - [x] Item 1 - Completed
   - [ ] Item 2 - Slipped

   ### Recommendations
   1. [Recommendation] - Expected impact
   ```

8. **Complete Reflection**
   **Output:**
   ```
   ✅ PM Reflection Complete

   📈 Key Metrics:
      • Cycle Time: X days
      • Throughput: N issues/week
      • Momentum: [HIGH/MEDIUM/LOW/STEADY-STATE-OWNER-BLOCKED]

   📁 Appended to: docs/planning/retro/YYYY-MM-DD.md
   ⏭️ Next: run '/tools:01_project_management:audit' to start the next planning cycle
   ```

## Completes the PM Loop

```
/tools:01_project_management:audit → /tools:01_project_management:autopm
   ↑                                                    │
   └──────── /tools:01_project_management:pm-reflect ───┘
```

## Output Location

Appended section inside `docs/planning/retro/YYYY-MM-DD.md`.
