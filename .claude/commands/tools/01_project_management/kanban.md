---
model: haiku
description: Optimize Project Board
---

# /kanban - Optimize Project Board

Analyze and optimize the GitHub project board for effective work management.

[Extended thinking: This workflow analyzes the project board state, identifies issues needing attention (stale, blocked, misprioritized), and suggests or performs optimizations to keep work flowing smoothly.]

## Usage
```
/kanban
```

## Execution

When invoked with `/kanban`, execute these steps:

1. **Begin Board Optimization**
   **Output:**
   ```
   📊 Starting kanban optimization workflow...
   ```

2. **Gather Board State**
   ```bash
   # Get all open issues with details
   gh issue list --state open --json number,title,labels,milestone,createdAt,updatedAt,assignees --limit 100

   # Get open PRs
   gh pr list --state open --json number,title,createdAt,updatedAt,isDraft,reviewDecision
   ```

3. **Analysis Categories**

   | Category | Criteria | Action |
   |----------|----------|--------|
   | **Stale Issues** | No activity 14+ days | Close, update, or reassign |
   | **Blocked Items** | "blocked" label or mentions | Resolve or document |
   | **Priority Inversion** | Low priority getting attention over high | Rebalance focus |
   | **WIP Overload** | Too many in progress | Complete before starting new |
   | **Orphaned Items** | No milestone or labels | Categorize or close |

4. **Present Board Health Report**
   ```
   📊 Board Health Report

   📈 Summary:
      • Open Issues: N
      • Open PRs: N
      • Stale Items: N
      • Blocked Items: N

   Board Health: [Good/Needs Attention/Critical]

   🕐 Stale Issues (14+ days inactive):
      #123 - Title (last activity: 21 days ago)

   🚫 Potentially Blocked:
      #125 - Title (mentions "waiting on")

   ❓ Needs Categorization:
      #126 - No milestone assigned
   ```

5. **User Interaction**
   Use AskUserQuestion:
   - "Would you like me to add comments to stale issues asking for status?"
   - "Should I close any of these stale issues?"
   - "Would you like to assign milestones to orphaned issues?"

6. **Board Actions**
   Based on user direction:
   ```bash
   # Add comment to stale issue
   gh issue comment 123 --body "👋 Status check: This issue has been inactive for 2+ weeks."

   # Add label
   gh issue edit 123 --add-label "needs-triage"

   # Close stale issue
   gh issue close 123 --comment "Closing due to inactivity."
   ```

7. **Complete Optimization**
   **Output:**
   ```
   ✅ Board Optimization Complete

   Actions Taken:
      • Added status check comments to N stale issues
      • Labeled N issues as needs-triage
      • Closed N abandoned issues

   💡 Recommendations:
      • Focus on completing #123 before starting new work

   ⏭️ Next steps: '/audit' or '/pm-reflect'
   ```

## Board Health Indicators

| Status | Meaning |
|--------|---------|
| Good | Active work, clear priorities, no blockers |
| Needs Attention | Some stale items or unclear priorities |
| Critical | Many stale items, blockers, or priority issues |
