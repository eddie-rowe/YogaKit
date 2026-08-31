# Phase / Arc Structure

**YogaKit surface:** `src/app/compose/ComposeClient.tsx` (phase creation/rename/item-assignment, `compose-phase-{phase-id}`), `src/app/read/[id]/ReadView.tsx` (phase grouping into `<section>`s, `read-phase-{phase-id}`), spec at `docs/krama-v0.1-spec.md` §5, testids in `docs/krama-guardrails.md`.
**Status:** built (partially — see gap below)

## The interaction problem
Ordered content often has real internal structure — a workout's warmup/strength/cooldown, a song's verse/chorus/bridge, a recipe's prep/cook/rest — that a flat list hides. Users need to *see* that structure at a glance (what block am I in, how much is left in it), *edit* it without friction (create, rename, reorder, dissolve a section), and *trust* a running per-section total (duration, reps, cost) without doing mental math. The hard part is doing all three with minimal chrome, since section headers compete for visual weight against the content they organize.

## Best in class

### 1. Hevy — iOS/Android/web workout logger, current 2026 feature set
- **What they do:** Exercises inside a workout can be grouped into supersets/circuits; each group gets a distinct color band down the left edge and a shared rest timer. "Smart Superset Scrolling" auto-advances the active view to the next exercise in the block as each set is logged, and multiple blocks can coexist in one routine, each independently colored.
- **Why it works:** The grouping is expressed as a thin color accent plus behavior (shared timer, auto-advance), not a heavy header — so the block reads as a property of the exercises, not a separate UI layer competing with them.
- **Source:** https://www.hevyapp.com/features/what-are-supersets/, https://help.hevyapp.com/hc/en-us/articles/36954623739415-Circuits-Intervals-and-Supersets-Explained-How-to-Build-Them-in-the-Hevy-App

### 2. Ableton Live — Arrangement View, Live 12 manual (current)
- **What they do:** Named locators sit on the timeline marking song sections (Intro, Verse, Chorus, Bridge). Double-clicking a locator renames it inline; clicking one jumps/loops playback to that region; Next/Previous Locator transport controls step between sections without scrolling.
- **Why it works:** The marker is decoupled from the content it labels — it's a thin strip on a ruler, not a box around the clips — so it never fights the actual track content for visual priority, and navigation-by-section (not just visual grouping) is a first-class citizen.
- **Source:** https://www.ableton.com/en/manual/arrangement-view/

### 3. Linear — Board/List views with grouping and collapsible swimlanes, 2026
- **What they do:** Board and list views group issues by Status, Cycle, Project, Priority, etc., rendering each group as a swimlane with a count/sum badge in the header; swimlanes collapse and expand independently, and cycles (Linear's sprint construct) show scope/capacity as a running total in the sidebar as issues are dragged in.
- **Why it works:** Group headers are typographic (label + numeric badge), never colored boxes, keeping every section skimmable at the same visual weight regardless of how many groups are open — and collapse state is per-group and persists, so a user's chosen focus survives a re-render.
- **Source:** https://linear.app/docs/use-cycles, https://linear.app/docs/board-layout

## Cross-cutting patterns
- Section labels are typography/color-accent, not boxes/cards — the label marks a boundary, it doesn't visually contain or outweigh the content.
- A running total (duration, count, capacity) lives in the section header itself, updating live as items move in/out, so users never sum manually.
- Reordering/renaming a section is inline (double-click to rename, drag to reorder) — no modal, no separate settings screen.
- Collapse/expand is per-section and, in serious tools (Linear), state persists across sessions rather than resetting.
- Section membership is a property of the item (locator position, group tag), not a rigid container — items can be reassigned between sections without restructuring the whole list.

## Anti-patterns observed
- Google Slides' inconsistent, hard-to-discover section support (some accounts see "Add Section," others don't) shows the cost of a half-shipped grouping feature — users fall back to manual divider slides and color-coding, which is exactly the "workaround" state YogaKit's phases must not degrade into.
- Ableton locators cannot be hidden/collapsed at all (no scoped section-fold), forcing users to zoom/scroll past sections they don't care about — a caution against building rename/reorder without ever adding collapse.

## Fold into YogaKit
- **quick win** — Add a summed-duration badge to each phase header in Compose (`ComposeClient.tsx` phase block, near line 435) mirroring the existing `compose-total-duration` pattern, so phase totals are visible without scanning items.
- **quick win** — Render the same per-phase duration sum in `ReadView.tsx`'s `<h2>` phase header (line 124), keeping the label typographic (uppercase tracking-widest, muted color) — matches Linear's "label + numeric badge, no box" pattern.
- **spec 003** — Add the intent tag (langhana/brahmana/samana) from spec §5 next to the phase name in both files; needs pose-library energetic_direction wiring, so belongs with the pose-library work, not a compose-only patch.
- **spec 003** — Drag-reorder for phases themselves (not just items within a phase) and a real "fold to a bar" collapse in Compose, per spec §5's "v0.1 if cheap, v0.2 if not" — currently unbuilt; model the fold on Linear's persistent per-group collapse, not Ableton's un-collapsible locators.
- **needs decision** — Whether phase collapse state persists per-flow (localStorage, matches offline-first RULE-L3/L4) or resets each session; Linear persists, but YogaKit's 6am/offline constraint argues for local persistence tied to flow id.

## Constitution check
A duration badge or intent tag on phase headers must stay at or below the muted, uppercase-tracking-widest treatment already used for phase names — never bolder or higher-contrast than an active pose row, since stillness nodes' reduced-weight rule sets the ceiling for all secondary chrome, not just stillness. Any added badge/tag stays one-accent and typographic (Linear/Hevy pattern: color accent or numeric badge, never a card), and any collapse/expand affordance must animate in ≤200ms with no bounce. Phase headers must remain glanceable enough to pass the 6am test even with an intent tag and duration added — favor a single muted line over multi-line phase chrome. New elements need testids (`compose-phase-{phase-id}`, `read-phase-{phase-id}` stay stable; add child testids like `-duration` rather than renaming existing ones). Phase names stay teacher-authored; no AI-generated defaults beyond the existing static six-name template.
