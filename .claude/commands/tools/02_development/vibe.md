---
model: sonnet
description: Start Vibe Coding Session
argument-hint: "[intention]"
---

# /vibe - Start Vibe Coding Session

Express your coding intention, and the system handles all GitHub/git setup automatically.

[Extended thinking: Parse the user's intention, match it to an existing milestone, create a GitHub issue, and set up a feature branch - all so the user can start coding immediately without ceremony.]

## Usage
```
/vibe "what you want to work on"
```

## Examples
```
/vibe "improve the dashboard UI"
/vibe "fix the login bug we discussed"
/vibe "add caching to the search API"
/vibe "refactor the enrichment service"
```

## Agent Orchestration

| Step | Agent | Purpose |
|------|-------|---------|
| Parse Intention | **general-purpose** | Extract actionable title from intention |
| Milestone Match | **general-purpose** | Match intention to existing milestone |
| Issue Creation | **general-purpose** | Create GitHub issue with proper labels |
| Branch Setup | **general-purpose** | Pull latest main, create feature branch |

## Execution

When invoked with `/vibe <intention>`, execute these steps:

### 1. Validate Input
```
# If no argument provided:
"❌ Please describe what you want to work on"
"Example: /vibe 'improve the dashboard UI'"
```

### 2. Parse Intention
**Output:**
```
🎯 Parsing intention: "{user's intention}"
```

Analyze the intention to extract:
- **Action type**: feat, fix, refactor, docs, test, chore
- **Title**: Concise, descriptive title (e.g., "Improve dashboard UI components")
- **Scope**: Optional scope (e.g., dashboard, api, auth)

### 3. Identify Applicable Milestone

```bash
# Fetch all open milestones
gh api repos/Lead-Bindle/leadbindle/milestones --jq '.[] | select(.state=="open") | {number, title, description}'
```

**Match intention to milestone using these heuristics:**
- UI/frontend work → Look for UI, Dashboard, or Frontend milestones
- API/backend work → Look for API, Backend, or Infrastructure milestones
- Bug fixes → Look for milestone containing the affected feature
- New features → Look for milestone matching the feature area
- If no clear match → Suggest creating without milestone or ask user

**Output (matched):**
```
🎯 Matched milestone: M08 - Lead Detail View
```

**Output (no match):**
```
⚠️ No matching milestone found
   Will create issue without milestone assignment
```

### 4. Create GitHub Issue

Determine the appropriate label:
- `feat:` or `add:` → "enhancement"
- `fix:` or `bug:` → "bug"
- `refactor:` → "refactor"
- `docs:` → "documentation"
- Default → "enhancement"

```bash
# With milestone
gh issue create \
  --title "{type}: {AI-generated title}" \
  --body "$(cat <<'EOF'
## Intention
{user's original intention}

## Notes
Started via `/vibe` command

---
*Created by vibe coding session*
EOF
)" \
  --milestone "{milestone_title}" \
  --label "{label}"

# Without milestone (if no match)
gh issue create \
  --title "{type}: {AI-generated title}" \
  --body "$(cat <<'EOF'
## Intention
{user's original intention}

## Notes
Started via `/vibe` command

---
*Created by vibe coding session*
EOF
)" \
  --label "{label}"
```

**Output:**
```
📋 Created issue #167: Improve dashboard UI components
   Milestone: M08 - Lead Detail View
```

### 5. Prepare Branch

```bash
# Ensure we're on main and up to date
git checkout main
git pull origin main

# Create feature branch with issue number prefix
# Slugify the title: lowercase, replace spaces with hyphens, remove special chars
git checkout -b {issue_number}-{slugified-title}
```

**Example branch names:**
- `167-improve-dashboard-ui-components`
- `168-fix-login-validation-error`
- `169-add-caching-to-search-api`

**Output:**
```
🔀 Branch created: 167-improve-dashboard-ui-components
```

### 6. Complete Setup

**Final Output:**
```
═══════════════════════════════════════════════════════════
✅ Vibe session started!
═══════════════════════════════════════════════════════════

📋 Issue: #167 - Improve dashboard UI components
🎯 Milestone: M08 - Lead Detail View
🔀 Branch: 167-improve-dashboard-ui-components

You're ready to code! When done, run '/finalize' to:
  → Create PR
  → Run review
  → Merge if CI passes

💡 Happy vibing!
═══════════════════════════════════════════════════════════
```

## Error Handling

| Error | Recovery |
|-------|----------|
| `gh` not authenticated | Prompt user to run `gh auth login` |
| Git working directory dirty | Warn user, suggest stashing or committing |
| Branch already exists | Offer to checkout existing branch or create new |
| Network error | Retry with exponential backoff |

## Success Criteria

- GitHub issue created with proper labels and milestone
- Feature branch created from latest main
- User is on the feature branch and ready to code
- Clear instructions for completing the session with `/finalize`
