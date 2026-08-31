# Theme / Mood Browsing

**YogaKit surface:** `src/app/poses/PosesClient.tsx` (view toggle at `poses-view-toggle-filter` / `poses-view-toggle-theme`, theme groups rendered at `poses-theme-section-{emotion-slug}`, cross-filterable by element/chakra/dosha via `themeFilterElement` / `themeFilterChakra` / `themeFilterDosha`)
**Status:** built

## The interaction problem
Category filters (body position, muscle group, complexity) answer "what pose is this," but they don't answer "what am I carrying right now." A second, parallel entry point — organized by felt state rather than taxonomy — lets a user arrive without knowing the vocabulary of the underlying content, and land on something that matches an emotional intent (grief, anxiety, grounding) instead of a spec. The hard part is doing this without turning casual browsing into a clinical intake form, and without the two modes (spec-based, mood-based) feeling like two disconnected apps bolted together.

## Best in class

### 1. Spotify — Prompted Playlist & Mood pages (web/mobile, expanding through Jan–Feb 2026)
- **What they do:** A persistent "Mood" browse category sits alongside genre browsing; in Jan 2026 Spotify layered a free-text "Prompted Playlist" on top, where a mood/intention phrase ("warm acoustic for a slow Sunday morning") generates a one-off playlist blending taste history with curated selections.
- **Why it works:** Mood browsing is kept as its own first-class, permanently visible entry point (not buried in settings), and it's explicitly framed as an alternative *lens* on the same catalog, not a separate app — you can always fall back to genre/artist browsing.
- **Source:** https://newsroom.spotify.com/2026-01-28/music-discovery-features/

### 2. Headspace — Ebb AI mood-to-content matching (iOS/Android, active 2026 feature set)
- **What they do:** On session start, Ebb asks current mood, stress level, available time, and target concern (anxiety, focus, sleep), then selects/sequences existing library content to match — e.g., a 3-minute reset vs. a longer body scan.
- **Why it works:** The mood question is a *routing* mechanism into pre-existing, human-curated content, not a diagnostic tool — it shortens the path to relevant material without pretending to assess mental health.
- **Source:** https://organizations.headspace.com/blog/new-features-at-headspace

### 3. Calm — daily "How are you feeling?" check-in with feelings wheel (iOS/Android)
- **What they do:** A settings-configurable daily check-in prompt asks the user to name a feeling, offers a "feelings wheel" for users who can't name it, and logs check-ins for weekly reflection rather than instant content-matching.
- **Why it works:** It decouples naming a feeling from being told what to do about it — separating self-report from prescription avoids the app feeling like it's diagnosing or directing the user's inner life.
- **Source:** https://www.calm.com/blog/how-are-you-feeling-a-31-day-challenge

## Cross-cutting patterns
- Mood/theme browsing is always a *second, equal-weight lens* on the same underlying catalog — never a separate silo with its own content or navigation stack.
- The taxonomy of moods/themes is small, curated, and stable (Spotify's mood genre page, Headspace's fixed concern list) — not an open-ended or AI-generated list that could feel arbitrary.
- Entry into mood mode is low-friction and reversible in one tap (toggle, not a multi-step wizard), matching the ease of the spec/category path.
- Cross-filtering mood results by a secondary facet (Spotify: mood + genre; Headspace: mood + time-available) is common — mood is a starting lens, not the only lens.
- Self-report language stays descriptive ("how are you feeling") rather than evaluative or prescriptive — none of the exemplars imply the current feeling is a problem to fix.

## Anti-patterns observed
- Mood taxonomies invented without validation (marketing-driven emotion labels that don't map to how users actually describe themselves) read as arbitrary and erode trust in the grouping.
- Turning a mood entry point into an assessment funnel (multi-question intake before showing content) makes casual browsing feel like therapy onboarding — friction the user didn't ask for.
- Over-therapizing casual browsing: framing every mood tap as requiring reflection, tracking, or follow-up turns a light discovery gesture into an obligation.

## Fold into YogaKit
- The current theme→pose grouping is derived from static `emotional_release_potential` data on each pose (curated, not AI-inferred) — this already matches the "small, stable taxonomy" pattern above; keep it that way rather than letting theme lists grow ad hoc. `quick win` (verify only)
- Add element/chakra/dosha as visible active-filter chips inside theme mode itself (mirroring Spotify's mood+genre cross-filter), so the secondary facets aren't a separate panel disconnected from the theme sections. `quick win`
- Consider a one-line, non-prescriptive subhead per theme section (e.g. "poses people reach for with grief") rather than a bare emotion label, to avoid the label reading as diagnostic. `needs decision`
- No daily check-in / mood-logging layer should be added to this surface — Calm's separation of self-report from recommendation is a reason to *not* add tracking here; theme browsing should stay a stateless lens over the pose atlas. `needs decision`
- If theme browsing later gets its own onboarding or a "how are you feeling" prompt (vs. the current direct toggle), that's new scope, not a tweak to `PosesClient.tsx`. `spec 003`

## Constitution check
Any theme label or subhead copy must stay strictly descriptive, never implying the user should feel differently — a direct extension of Principle VII's no-guilt/no-shame rule, now applied to mood language rather than streak language. The toggle and chip UI should stay within the existing one-accent, typography-first system (no new color-coding per emotion) and any transition between filter/theme modes must respect the ≤200ms no-bounce motion rule already governing the rest of the pose library. Per RULE-O6/O7, theme browsing must remain reachable with no login and no entitlement gate, exactly like filter browsing. And critically, the theme groupings themselves must stay hand-curated data (`emotional_release_potential` on each pose record) rather than an AI-inferred or dynamically generated mapping — consistent with the determinism principle that governs the friction engine, even though this feature sits outside that engine's own code path.
