# Catalog Search & Filter

**YogaKit surface:** `/poses` — `src/app/poses/PosesClient.tsx`
**Status:** built

## The interaction problem
When a catalog runs into the dozens-to-low-hundreds range, a single search box stops being enough: users need to narrow by several independent facets at once (category, numeric range, multi-select tags) without losing track of what's currently applied or how many results remain. The hard part on mobile isn't the filtering logic — it's fitting many facets into a small viewport while keeping selection state legible, reversible, and fast, so the panel reads as a tool the user is steering rather than a form they're filling out.

## Best in class

### 1. Airbnb — iOS/Android, ongoing reference implementation, still the de facto benchmark in 2026
- **What they do:** A horizontal chip bar surfaces the most common filters (price, dates, type) always-visible; tapping "Filters" opens a full-screen sheet with facets grouped by category. Each facet section shows a live count. The price facet is a dual-handle range slider with the numeric value rendered above each handle in real time. A "Clear all" sits at the top of the sheet, and a "Show N places" button at the bottom updates as selections change, so the user always sees the effect of a change before committing to it.
- **Why it works:** Committing filters behind an explicit "show results" action, combined with a live count, removes the anxiety of "did that just wipe my results" — the user previews the outcome before the list actually re-renders.
- **Source:** https://www.uxpin.com/studio/blog/filter-ui-and-ux/ ; https://mobbin.com/explore/screens/8bc5e6ac-e18f-4ccf-8701-81b98ec58c0a

### 2. AllTrails — iOS/Android, active 2025-2026 design-critique subject
- **What they do:** Filters by difficulty, length, elevation gain, route type, and trail popularity. Difficulty (Easy/Moderate/Hard) is shown as a labeled chip with an attached info icon that explains the underlying computation on tap, rather than assuming the user already knows what "moderate" means. The filter sheet's submit button reads "Show XX Trails" and recalculates instantly as chips/sliders change.
- **Why it works:** Making the meaning of a derived score (difficulty) inspectable in place, rather than requiring a trip to documentation, is exactly the gap between YogaKit's "complexity"/"injury risk" sliders and a first-time visitor's mental model.
- **Caveat surfaced by the source itself (anti-pattern, noted below):** a 2025 IxD design critique flagged that AllTrails' home-screen floating filter chips look multi-select but are actually single-select-with-auto-deselect, while the advanced menu's chips really are multi-select — an affordance mismatch worth avoiding.
- **Source:** https://support.alltrails.com/hc/en-us/articles/37227964040852-How-to-use-filters-to-find-trails ; https://ixd.prattsi.org/2025/02/design-critique-alltrails-ios-app-2/

### 3. NYT Cooking — iOS/Android, actively maintained 2026 recipe app
- **What they do:** Search combines free text with facet filters for dietary restriction (vegetarian/vegan/gluten-free/paleo), meal type, and time-to-cook, layered on a recipe collection spanning quick weeknight meals to multi-day projects — the same "wide complexity range, narrow it fast" shape as a pose or trail catalog.
- **Why it works:** Dietary and time filters are the facets users treat as hard constraints (allergies, a 20-minute window), so they're surfaced as first-class, always-reachable filters rather than buried in an "advanced" drawer — a lesson for which of YogaKit's filters (e.g., injury risk) deserve top-level placement versus staying in Advanced.
- **Source:** https://apps.apple.com/us/app/nyt-cooking-quick-tasty-meals/id911422904 ; https://play.google.com/store/apps/details?id=com.nytimes.cooking

## Cross-cutting patterns
- Persistent result count ("N of M") is treated as load-bearing UI, not an afterthought — every exemplar keeps it visible while filters change (YogaKit already does this in the header).
- Range sliders always pair the handle with a live numeric readout above or beside it — never a bare unlabeled track.
- Multi-select chips are visually distinct from single-select chips (fill vs. outline, or explicit iconography), because AllTrails' own critique shows what happens when that distinction is missing.
- A single, prominent "clear all" is standard, usually paired with a fast per-chip removal (tap the active chip again) rather than only a full reset.
- Advanced/secondary facets are collapsed by default behind one "Filters" or "Advanced" entry point, with a badge or "(active)" label so users know something is hidden and applied.

## Anti-patterns observed
- Filter sheets that hide the result count until the user commits — forces blind guessing (avoided by Airbnb, AllTrails).
- Chips that look identical for single-select and multi-select facets, so users can't tell selection behavior by sight (AllTrails' own documented flaw).
- Sliders with no numeric readout, forcing the user to eyeball a handle position against no scale.
- Filters that silently reset on navigation away and back, discarding a carefully built query — a recurring complaint in board-game/community app forums about ad hoc filter state.

## Fold into YogaKit
- The complexity/risk sliders (`PosesClient.tsx` lines ~349-370) already show a live numeric readout next to the label — matches the Airbnb/AllTrails pattern. No change needed. `quick win` (already compliant, confirm in follow-up screenshot pass)
- Type-tag and muscle-group chips (lines 372-404) are AND-matching multi-select but rendered with the same visual chip style as the single-select body-position/element chips above them (lines 245-280) — this is exactly the AllTrails affordance mismatch. Add a distinct visual treatment (e.g., a small check glyph or bracket) for multi-select chip groups, on top of the existing color-coded active state, so it doesn't rely on color alone. `spec 00X` (design-system change touching `kk-chip`)
- Difficulty/complexity meaning is opaque (a "7" out of 10 with no explanation) — AllTrails attaches an info affordance to its difficulty label. Add a small info icon/tooltip near "Max complexity" / "Max injury risk" labels explaining what drives the score. `needs decision` (requires agreeing what the tooltip copy says, ties to friction-engine weights being data not code)
- `hasActiveFilters`/`hasAdvancedFilters` badges already exist ("Advanced filters (active)") — matches the cross-cutting "badge when something's hidden and applied" pattern. No change needed.
- Consider promoting one Advanced-panel facet (e.g., nervous-system effect) to the always-visible row if usage data shows people reach for it constantly, following NYT Cooking's "hard constraint" reasoning — but this needs actual usage telemetry first. `needs decision`
- "Clear all filters" only appears inside the expanded Advanced panel (line 406); a user who has only set search/element/position (no advanced filters open) has no visible reset without opening Advanced. Surface a lightweight "Clear all" next to the search bar whenever `hasActiveFilters` is true, independent of `showFilters`. `quick win`

## Constitution check
- One-accent, typography-first design: the element chips (`ELEMENT_CHIP_ACTIVE`) and NS-effect chips (`NS_COLORS`) currently encode active state primarily through color-coded backgrounds; the multi-select-chip fix above must add a non-color affordance (glyph/weight/border-style) so it reinforces rather than violates this rule.
- ≤200ms no-bounce motion: existing `transitionDuration: '150ms'` on chip/link hovers is compliant; any new tooltip or "Clear all" affordance must stay within that budget and avoid spring/bounce easing.
- Touch targets ≥40px: several Advanced-panel chips use `px-2 py-0.5 text-xs` (type tags, muscle groups, lines 381/397) — worth an e2e/measured check, since `py-0.5` risks falling under 40px tap height on mobile; this is the most concrete tension found and should be verified against the guardrails doc before shipping the multi-select redesign.
- Open-data principle: search/filter state is entirely client-side `useState`/`useMemo` over a `poses` prop with no auth or entitlement check anywhere in `PosesClient.tsx` — already compliant, no login gate to browse or filter.
- testid contract stability: existing `data-testid` attributes (`poses-search-input`, `poses-category-filter`, `poses-view-toggle-*`, `poses-card-*`) must be preserved verbatim through any of the above changes; new UI (info tooltip, top-level "Clear all") should add new testids rather than repurpose existing ones.
