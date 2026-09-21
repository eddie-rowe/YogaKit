---
model: haiku
description: Generate Changelog
---

# /changelog - Generate Changelog

Generate a changelog from recent GitHub activity to track progress and maintain accountability.

[Extended thinking: This workflow creates a changelog to track progress and maintain momentum. Per Linear Method, publishing updates regularly combats the psychological challenge when momentum feels slow.]

## Usage
```
/changelog [scope]
```

## Modes

- **Standalone (default, weekly scope)** — run by hand, 7-day lookback, writes
  its own dated file.
- **Daily fold-in (`scope=daily`)** — invoked from
  `/tools:01_project_management:autoretro`, 24-hour lookback, folds its output
  into today's retro note (`docs/planning/retro/YYYY-MM-DD.md`) instead of
  writing a separate file. Use this mode whenever called from `/autoretro`.

## When to Use

- Weekly standalone (every Friday or Monday)
- After major releases
- Daily, automatically, as part of `/autoretro`'s loop-closing sweep

## Execution

When invoked with `/changelog [scope]`, execute these steps:

1. **Begin Changelog Generation**
   **Output:**
   ```
   📝 Starting changelog generation...
   ```

2. **Gather Activity Data**
   Collect GitHub activity over the lookback window (7 days standalone, 24
   hours if `scope=daily`):
   ```bash
   # Merged PRs
   gh pr list --state merged --limit 30 --json number,title,mergedAt,labels,author

   # Closed issues
   gh issue list --state closed --limit 50 --json number,title,closedAt,labels

   # Recent commits
   git log --since="<window>" --oneline --format="%h %s" | head -30
   ```

3. **Categorize by Type**
   Group items by label/prefix:
   | Category | Prefix/Label |
   |----------|--------------|
   | Features | `feat:`, `enhancement` |
   | Fixes | `fix:`, `bug` |
   | Improvements | `refactor:`, `chore:`, `docs:` |

4. **Calculate Metrics**
   - Total PRs merged in window
   - Total issues closed in window
   - Compare to previous window if data exists

5. **Emit Changelog**

   **Standalone mode** — create `docs/planning/retro/YYYY-MM-DD-changelog.md`:

   ```markdown
   # Changelog - Week of YYYY-MM-DD

   ## Shipped This Week

   ### Features
   - feat: [Title] (#123) - @author

   ### Fixes
   - fix: [Title] (#124) - @author

   ### Improvements
   - refactor: [Title] (#125) - @author

   ## Metrics
   | Metric | This Week | Trend |
   |--------|-----------|-------|
   | PRs merged | N | ↑/↓/→ |
   | Issues closed | N | ↑/↓/→ |

   ## Highlights
   [Notable achievements or milestones]
   ```

   **Daily fold-in mode** — append a `### Shipped today` subsection (features
   / fixes / improvements + counts) directly into
   `docs/planning/retro/YYYY-MM-DD.md`, the file the calling `/autoretro` step
   is already writing. Do not create a separate file.

6. **Complete Changelog**
   **Output (standalone):**
   ```
   ✅ Changelog Generated
   📁 Saved: docs/planning/retro/YYYY-MM-DD-changelog.md

   📊 This Week:
      • N features shipped
      • N bugs fixed
      • N issues closed

   💡 Next steps: Share with stakeholders or run '/tools:01_project_management:pm-reflect'
   ```
   **Output (daily fold-in):** one line — "Changelog folded into
   docs/planning/retro/YYYY-MM-DD.md: N features / N fixes / N improvements."

## Linear Method Principle

*"At times, when you feel things not moving as fast, you can look back at how much you achieved already."*

Publishing changelogs regularly:
- Creates accountability
- Combats demoralization during slow periods
- Builds credibility with stakeholders

## Output Location

`docs/planning/retro/YYYY-MM-DD-changelog.md` (standalone) or a section inside
`docs/planning/retro/YYYY-MM-DD.md` (daily fold-in, called from `/autoretro`).
