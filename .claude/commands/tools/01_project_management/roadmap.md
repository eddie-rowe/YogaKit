---
model: sonnet
description: Implementation Roadmap
---

# /roadmap - Implementation Roadmap

Create or update the implementation roadmap with milestones, priorities, and dependencies.

[Extended thinking: This workflow transforms vision gaps and research findings into an actionable roadmap with milestones, priorities, and dependencies. It also creates/updates GitHub milestones to track progress.]

## Usage
```
/roadmap
```

## Execution

When invoked with `/roadmap`, execute these steps:

1. **Begin Roadmap Planning**
   **Output:**
   ```
   🗺️ Starting roadmap planning workflow...
   ```

2. **Gather Context**
   - Read `docs/planning/vision.md` for goals and gaps
   - Read recent research from `docs/planning/research/`
   - Read current roadmap if exists: `docs/planning/roadmap.md`
   - Check current GitHub milestones: `gh api repos/{owner}/{repo}/milestones`

3. **Prioritization**
   Consider factors for ordering work:
   | Factor | Question |
   |--------|----------|
   | **Dependencies** | What must be done first? |
   | **Value** | What delivers the most impact? |
   | **Risk** | What has the most uncertainty? |
   | **Effort** | What can be done quickly? |

   Use AskUserQuestion if prioritization is unclear.

4. **Scoping Checklist (Linear Method)**
   Before finalizing a milestone, verify:
   - Can it be completed in **1-3 weeks** with **1-3 people**?
   - Can individual deliverables be done in **hours**, not days?
   - If NO: break into sequential **stages**

   Example:
   - TOO BIG: "Build complete IoT integration"
   - RIGHT SIZE: "Stage 1: Device discovery API" (1 week)

5. **Milestone Definition**
   For each major goal:
   - Define clear scope and boundaries
   - List key deliverables
   - Identify acceptance criteria
   - Estimate relative effort (S/M/L/XL)
   - Note dependencies on other milestones

6. **GitHub Milestone Sync**
   ```bash
   # Create milestone
   gh api repos/{owner}/{repo}/milestones -f title="v2.0 - Feature Name" -f description="..."

   # Update existing
   gh api repos/{owner}/{repo}/milestones/{number} -X PATCH -f title="..."
   ```

7. **Generate Roadmap Document**
   Create or update `docs/planning/roadmap.md`:

   ```markdown
   # Product Roadmap

   **Last Updated:** YYYY-MM-DD

   ## Current Focus
   [What we're working on now]

   ## Milestones

   ### Milestone 1: [Name]
   **Status:** [Not Started / In Progress / Complete]
   **Target:** [Date or Sprint]
   **GitHub Milestone:** [link]

   **Key Deliverables:**
   - [ ] Deliverable 1

   **Acceptance Criteria:**
   - ...

   **Dependencies:** None / [list]
   **Effort Estimate:** [S/M/L/XL]

   ## Parking Lot
   Items considered but not currently scheduled

   ## Risks & Mitigations
   | Risk | Impact | Mitigation |
   |------|--------|------------|
   ```

8. **Complete Roadmap**
   **Output:**
   ```
   ✅ Roadmap Updated
   📁 Roadmap saved: docs/planning/roadmap.md
   🏁 GitHub milestones synchronized
   💡 Next steps: '/issues' or '/kanban'
   ```

## Output Location

- `docs/planning/roadmap.md` (living document)
- GitHub milestones (synchronized)
