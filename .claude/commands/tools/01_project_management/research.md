---
model: opus
description: Deep Research
argument-hint: "[topic]"
---

# /research - Deep Research

Research solutions, patterns, and approaches for specific topics or vision gaps.

[Extended thinking: This workflow performs deep research on topics identified in vision gaps or specified by the user. It uses web search, documentation lookup, and codebase analysis to evaluate options and make recommendations.]

## Usage
```
/research <topic>
```

## Examples
```
/research real-time notifications
/research "mobile app architecture"
/research IoT device integration patterns
/research Next.js 15 caching strategies
```

## Agent Orchestration

| Phase | Agent | Purpose |
|-------|-------|---------|
| Web Research | **search-specialist** | Best practices, industry standards, technology options |
| Docs Lookup | **Context7 MCP** | Fetch library documentation |
| Codebase | **Explore** | Find relevant existing implementations |

## Execution

When invoked with `/research <topic>`, execute these steps:

1. **Validate Input**
   ```
   # If no argument provided, show error:
   "❌ Please provide a research topic"
   ```

2. **Begin Research**
   **Output:**
   ```
   🔬 Starting deep research workflow...
   📚 Researching: {topic}
   ```

3. **Parse Research Topic**
   - Extract topic from argument
   - Check if topic relates to a known vision gap from context
   - Define research scope and questions to answer

4. **Research Execution** (search-specialist)
   Research the topic with focus on:
   - Best practices and industry standards
   - Implementation patterns in similar projects
   - Technology options and trade-offs
   - Common pitfalls and how to avoid them
   - Specific considerations for Next.js 15 + FastAPI + Supabase stack

5. **Documentation Lookup**
   If topic relates to a specific technology:
   - Use Context7 MCP to fetch relevant library documentation
   - `mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs`

6. **Codebase Analysis** (Explore)
   If topic relates to existing code:
   - Find relevant implementations already in the codebase
   - Identify patterns that could be extended

7. **Synthesis**
   Combine findings into actionable recommendations:
   - Recommended approach with justification
   - Alternative approaches considered
   - Implementation considerations
   - Estimated complexity/effort

8. **Generate Research Report**
   Create `docs/planning/research/YYYY-MM-DD-{topic-slug}.md`:

   ```markdown
   # Research: {Topic}

   **Date:** YYYY-MM-DD
   **Related Vision Gap:** [if applicable]

   ## Executive Summary
   [2-3 sentences with key recommendation]

   ## Findings

   ### Best Practices
   - ...

   ### Technology Options
   #### Option A: [Name]
   **Pros:** ...
   **Cons:** ...
   **Fit for our stack:** [Good/Moderate/Poor]

   ### Common Pitfalls
   - ...

   ## Recommendation
   **Recommended Approach:** [Option name]
   **Justification:** ...
   **Estimated Effort:** [Low/Medium/High]

   ## Sources
   - [Source 1](url)
   ```

9. **Complete Research**
   **Output:**
   ```
   ✅ Research Complete
   📁 Report saved: docs/planning/research/YYYY-MM-DD-{topic}.md
   💡 Next steps: '/roadmap' or '/issues'
   ```

## Output Location

`docs/planning/research/YYYY-MM-DD-{topic-slug}.md`
