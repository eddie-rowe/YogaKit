---
model: opus
description: Daily CEO Brief
---

# /ceo - Daily CEO Brief

Read the current business/project state and generate a dated morning brief: what matters most today, next 3 moves on the product ladder, and the specific questions whose answers make tomorrow's brief sharper.

[Extended thinking: This brief operates as a CEO lens, not a build tracker. It reads the constitution + voice standard + decision log + activity signal, synthesizes in VOICE.md style, and surfaces blockers, drift, and the highest-leverage next moves. It never writes to state files — read-only except for its own dated output. The owner is the human component; Claude is the mastermind machine that synthesizes signal into direction.]

## Usage
```
/ceo
```

## Agent Orchestration

| Step | Agent | Purpose |
|------|-------|---------|
| Foundation read | **Explore** | Ingest constitution, voice standard, decision/friction logs |
| State read | **Explore** | Ingest per-feature specs on the product ladder |
| Activity signal | **general-purpose** | git log, GitHub issues/PRs, yesterday's brief |
| Synthesis | **general-purpose** | Write dated brief to docs/planning/ceo-brief/ |

## Execution

When invoked with `/ceo`, execute these steps:

1. **Begin Brief**
   **Output:**
   ```
   🤖 Starting daily CEO brief...
   📋 Reading constitution + decision log + product-ladder state
   ```

2. **Read Foundation Layer** (Explore agent — read all in full)
   - `.specify/memory/constitution.md` (v3.0.0) — non-negotiables: friction-engine
     determinism, 100% engine coverage, Tier-1 pose completeness, RLS on practice
     content, no-zero-streak / no-guilt copy, telemetry content-free (RULE-L7)
   - `DECISIONS.md` (repo root) — why-we-chose log
   - `FRICTION.md` — friction-engine design log
   - `VOICE.md` — editorial rules (apply to every word of the brief output)
   - `CLAUDE.md` — product ladder and dependency order

3. **Read Operational State** (Explore agent — read all in full)
   - The current-focus feature's spec + plan + tasks under `specs/00{2,3,4,5,6}-*/`
     (whichever feature is next unshipped in the ladder
     `002-auth-tenancy-billing → 003-pose-library → 004-sequencing-composer →
     005-daily-sadhana → 006-profile-settings`)
   - `docs/planning/routine-log.md` — recent routine runs and their verdicts
   - `docs/observation/autoobs/<latest>.md` — most recent system-health digest
   - `docs/planning/retro/<latest>.md` — most recent daily retro note

4. **Read Activity Signal**
   ```bash
   # What moved in the last 24 hours
   git log --since="yesterday" --oneline
   git status --short

   # Open GitHub issues (MCP-native; degrades gracefully if unavailable)
   # mcp__github__search_issues / mcp__github__list_pull_requests

   # Locate yesterday's brief for continuity
   ls docs/planning/ceo-brief/ 2>/dev/null | sort | tail -2
   ```
   If yesterday's brief exists (second-to-last file in `docs/planning/ceo-brief/`),
   read it in full. Extract any unanswered questions from its
   "What I need from you" section.

5. **Synthesize and Write Brief**
   Create `docs/planning/ceo-brief/YYYY-MM-DD.md` using today's date:

   ```markdown
   # CEO Brief — YYYY-MM-DD

   ## TL;DR
   [One sentence. The single most important call the owner should make today.]

   ## State of the business
   - [3–5 bullets: what shipped, what's stuck, what changed]
   - [Be specific — name actual issue/PR numbers, features, decisions. Not "progress was made."]
   - [Reference the product ladder position and the latest autoobs verdict where relevant]

   ## Next 3 moves
   1. [Move — specific and actionable] — **Why:** [Tie to a named constitution
      non-negotiable, product-ladder feature, or open decision]
   2. [Move] — **Why:** [Same]
   3. [Move] — **Why:** [Same]

   ## What I need from you to make a better call tomorrow
   - [Specific question 1 — answerable in 1-2 sentences. Note where the answer
     should go: chat or DECISIONS.md]
   - [Specific question 2]
   - [Question 3 only if genuinely unresolved — do not pad]

   ## Drift / coherence flags
   [If any file contradicts another, name both files and the specific conflict.
   If no drift detected: "No drift detected — constitution, spec, and routine-log
   are aligned on [specific point]."]

   ## Yesterday's loop
   - Open questions still unanswered: [list from prior brief's "What I need from
     you" section — or "No prior brief found" if first run]
   - Decisions logged since last brief: [count + one-liners from DECISIONS.md
     entries newer than yesterday's brief date]
   ```

6. **Complete Brief**
   **Output:**
   ```
   ✅ CEO Brief Complete
   📁 Saved: docs/planning/ceo-brief/YYYY-MM-DD.md
   💡 Next: run '/tools:01_project_management:audit' for a deeper project snapshot
   ```

## VOICE.md compliance

Apply `VOICE.md`'s rules to every word of brief output — it is the authority;
this list is a quick-reference, not a substitute:

- Lead with TL;DR. No preamble, no "Great news," no context-setting paragraph.
- Specific owner-outcome language. Not "leverage synergies" or "drive alignment."
- Sentence-case headings (already in template).
- Separators: " — " (space-hyphen-space). No em-dashes, no en-dashes.
- Banned terms: delve, robust, stands as a testament, operationalize,
  transformative, cutting-edge.
- Evidence over assertion. If you say "the loop stalled" — name the issue
  numbers and their last-touch date.
- Numbers beat adjectives.

## Output Location

`docs/planning/ceo-brief/YYYY-MM-DD.md`
