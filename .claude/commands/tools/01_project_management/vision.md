---
model: opus
description: Product Vision Definition
---

# /vision - Product Vision Definition

Define or refine the product vision and identify gaps between current state and goals.

[Extended thinking: This workflow manages the living vision document. It reviews existing vision, gathers user input on goals and priorities, defines success metrics, and identifies gaps that need to be addressed. The vision gaps feed into research and roadmap planning.]

## Usage
```
/vision
```

## Execution

When invoked with `/vision`, execute these steps:

1. **Begin Vision Definition**
   **Output:**
   ```
   🎯 Starting vision definition workflow...
   ```

2. **Review Existing Vision**
   - Read `docs/planning/vision.md` if it exists
   - Read recent audit from `docs/planning/audits/` for current state context
   - Identify what has changed since last vision update

3. **Gather User Input**
   Use AskUserQuestion tool to clarify:
   - "What are your top 3 priorities for this project right now?"
   - "Are there any new goals or features you want to add to the vision?"
   - "What constraints should we consider (time, budget, technical)?"
   - "What does success look like for the next milestone?"

4. **Define Success Metrics**
   Based on user input, define measurable success criteria:
   - User-facing metrics (features, UX improvements)
   - Technical metrics (performance, coverage, reliability)
   - Business metrics if applicable (integrations, automation)

5. **Gap Analysis with Linear Method**
   Compare current state (from audit) with desired state (from user input).

   | Classification | Question | Priority |
   |----------------|----------|----------|
   | **BLOCKER** | Does this prevent users from adopting/using the product? | Immediate |
   | **HIGH ENABLER** | Does this significantly increase value? | This cycle |
   | **LOW ENABLER** | Nice-to-have improvement? | Parking lot |

   Examples:
   - "No login flow" = BLOCKER (can't use product)
   - "Real-time updates" = HIGH ENABLER (major value add)
   - "Dark mode" = LOW ENABLER (workaround exists)

6. **Generate Vision Document**
   Create or update `docs/planning/vision.md`:

   ```markdown
   # Product Vision

   ## Mission Statement
   [One sentence describing the project's purpose]

   ## Current Version Goals
   **Target:** [version or milestone name]

   ### Priority 1: [Goal Name]
   - Description: ...
   - Success Criteria: ...
   - Current Status: [from audit]

   ## Success Metrics
   | Metric | Target | Current |
   |--------|--------|---------|
   | ... | ... | ... |

   ## Constraints
   - Time: ...
   - Technical: ...

   ## Vision Gaps
   ### Gap 1: [Name]
   - **Classification:** BLOCKER | HIGH ENABLER | LOW ENABLER
   - Current State: ...
   - Desired State: ...
   - Research Needed: [yes/no]
   ```

7. **Complete Vision**
   **Output:**
   ```
   ✅ Vision Updated
   📁 Vision saved: docs/planning/vision.md
   💡 Next steps: '/research <topic>' or '/roadmap'
   ```

## Output Location

`docs/planning/vision.md` (living document, updated in place)
