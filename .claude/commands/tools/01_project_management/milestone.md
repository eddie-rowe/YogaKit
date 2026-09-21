---
model: haiku
description: Milestone Progress & Planning
argument-hint: "[progress|next]"
---

# /milestone - Milestone Progress & Planning

View milestone progress and find the next issue to work on.

[Extended thinking: Fetch milestone data from GitHub, calculate progress percentages, and present actionable insights about what to work on next.]

## Usage
```
/milestone           # Show all active milestones with progress
/milestone progress  # Detailed breakdown per milestone
/milestone next      # Suggest next issue to work on
```

## Examples
```
/milestone
/milestone progress
/milestone next
```

## Agent Orchestration

| Step | Agent | Purpose |
|------|-------|---------|
| Fetch Milestones | **general-purpose** | Get milestone data from GitHub API |
| Calculate Progress | **general-purpose** | Compute percentages and remaining work |
| Prioritize | **general-purpose** | Suggest next work based on due dates |

## Execution

### Default: `/milestone` - Overview

```bash
# Fetch all milestones (open and recently closed)
gh api repos/Lead-Bindle/leadbindle/milestones --jq '.[] | {
  number,
  title,
  state,
  open_issues,
  closed_issues,
  due_on,
  description
}'
```

**Calculate for each milestone:**
- Total issues: `open_issues + closed_issues`
- Progress percentage: `closed_issues / total * 100`
- Days remaining: `due_on - today` (if due date set)

**Generate progress bar:**
- 10 segments, each representing 10%
- `█` for completed, `░` for remaining

**Output:**
```
═══════════════════════════════════════════════════════════
                    📊 Milestone Progress
═══════════════════════════════════════════════════════════

M07: Operational Foundation
    [██████████] 10/10 (100%) ✅ Complete

M08: Lead Detail View
    [████████░░] 8/10 (80%)
    Due: 2026-02-15 (8 days remaining)

M09: Email Outreach
    [░░░░░░░░░░] 0/5 (0%)
    Due: 2026-03-01 (22 days remaining)

═══════════════════════════════════════════════════════════
💡 Run '/vibe "intention"' to start working
═══════════════════════════════════════════════════════════
```

### Subcommand: `/milestone progress` - Detailed Breakdown

```bash
# For each open milestone, get issues
gh api repos/Lead-Bindle/leadbindle/milestones --jq '.[] | select(.state=="open") | .number' | while read num; do
  gh issue list --milestone "$num" --json number,title,state,labels
done
```

**Output:**
```
═══════════════════════════════════════════════════════════
              📊 Detailed Milestone Breakdown
═══════════════════════════════════════════════════════════

M08: Lead Detail View [████████░░] 80%
────────────────────────────────────────────────────────────
✅ #145 - Add lead detail sidebar
✅ #146 - Implement contact info display
✅ #147 - Add company overview section
✅ #148 - Create activity timeline
✅ #149 - Add notes functionality
✅ #150 - Implement lead scoring display
✅ #151 - Add opportunity signals view
✅ #152 - Create export to CRM button
⬚ #153 - Add email integration
⬚ #154 - Implement task creation

M09: Email Outreach [░░░░░░░░░░] 0%
────────────────────────────────────────────────────────────
⬚ #160 - Design email template builder
⬚ #161 - Implement email sequence logic
⬚ #162 - Add tracking pixels
⬚ #163 - Create analytics dashboard
⬚ #164 - Implement A/B testing

═══════════════════════════════════════════════════════════
```

### Subcommand: `/milestone next` - Suggest Next Work

```bash
# Get all open issues across milestones, prioritize by due date
gh issue list --state open --json number,title,milestone,labels,createdAt \
  --jq 'sort_by(.milestone.dueOn // "9999-12-31") | .[0:5]'
```

**Prioritization logic:**
1. Issues in milestones with nearest due date
2. Issues with "priority" or "urgent" labels
3. Oldest issues first (prevent stale work)
4. Dependencies (unblocking others)

**Output:**
```
═══════════════════════════════════════════════════════════
                    🎯 Suggested Next Work
═══════════════════════════════════════════════════════════

Based on milestone due dates and priority:

1. #153 - Add email integration
   Milestone: M08 - Lead Detail View (due in 8 days)
   Labels: enhancement, frontend

2. #154 - Implement task creation
   Milestone: M08 - Lead Detail View (due in 8 days)
   Labels: enhancement, frontend

3. #160 - Design email template builder
   Milestone: M09 - Email Outreach (due in 22 days)
   Labels: enhancement, design-needed

═══════════════════════════════════════════════════════════
💡 Start with: /vibe "add email integration to lead detail view"
═══════════════════════════════════════════════════════════
```

## GitHub Project Board Links

For visual project management:
- **Kanban board**: https://github.com/orgs/Lead-Bindle/projects/1/views/1
- **Milestone breakdown**: https://github.com/orgs/Lead-Bindle/projects/1/views/3
- **All milestones**: https://github.com/Lead-Bindle/leadbindle/milestones

## Success Criteria

- Clear visualization of all milestone progress
- Accurate issue counts and percentages
- Actionable next steps with priority reasoning
- Links to continue workflow with `/vibe`
