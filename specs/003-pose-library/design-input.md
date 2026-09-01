# Design Input: Pose Library

**Feature**: `003-pose-library` (not yet scaffolded)
**Created**: 2026-08-28
**Status**: Design input — consumed by `/speckit.specify`, not a specification
**Sources**: `docs/design-research/01-friction-seams.md`,
`docs/design-research/04-pose-detail-anatomy.md`,
`docs/design-research/05-catalog-search-filter.md`,
`docs/design-research/06-theme-mood-browsing.md`,
`docs/design-research/08-phase-arc-structure.md`

## Scope anchor

Per the platform-pivot plan's "Step 2 — The five features": pose JSON stays the source of
truth in `data/poses/` (Principle V, RULE-O2); a read-only server mirror is added only if
server-side joins need it (default: no). Per-user personalization (favorites, custom notes
on a pose) is new in this feature and is cloud-resident, since it is user-authored data.
This feature absorbs open `001` debt: T027 (Tier-1 review of 10 poses) and T074 (the Tier-1
completeness CI gate). It does **not** own Compose UI — seam/warning/phase rendering changes
that touch `ComposeClient.tsx` are routed to `004-sequencing-composer` even where the
underlying data (e.g. `energetic_direction`) is added here.

## Exemplars worth copying

| Pattern | App | Why it works |
|---|---|---|
| Tap a body region to highlight the matching legend entry | MuscleWiki | Diagram becomes a two-way linked view instead of a static illustration |
| Persistent legend distinguishing depth encodings | Visible Body Human Anatomy Atlas | Removes the need to infer what dashed vs. solid means |
| Multi-select chips get a distinct affordance from single-select chips | AllTrails | Prevents users misreading AND-filters as OR-filters just from shared styling |
| Curated, stable emotion taxonomy for theme browsing | Spotify Mood/Prompted Playlists | Keeps a theme lens legible instead of sprawling into an unbounded tag cloud |
| Suppress a zero-signal indicator entirely rather than show it empty | AudioMass | A control that can't do anything shouldn't be visible |

## Candidate UX requirements

- **UX-001**: The pose detail view MUST make tappable body regions in the anatomy diagram
  highlight or scroll to their matching legend entry, and vice versa, so the diagram and
  legend read as one linked view rather than two disconnected panels. *(source: 04; tagged
  `spec 003`)*
- **UX-002**: The pose detail view MUST render a persistent, two-line-max legend near the
  anatomy diagram explaining its depth encoding (e.g. solid fill = superficial, dashed
  outline = deep) rather than requiring the reader to infer the convention. *(source: 04;
  tagged `quick win` — carried here as a design requirement so it survives into whatever
  `003` does with `BodyDiagram.tsx`)*
- **UX-003**: On narrow viewports, the anatomy view's front/back toggle and category tabs
  MUST collapse into a single row (or scroll-snap) rather than stacking two full-width
  control rows above the diagram. *(source: 04; tagged `quick win`)*
- **UX-004**: A body-map category with zero data for the current pose MUST either hide its
  tab trigger or otherwise avoid a dead-end tap-then-empty-message interaction; the system
  MUST pick one behavior and apply it consistently. *(source: 04; tagged `needs decision`,
  see Open decisions)*
- **UX-005**: Catalog filter chips that are multi-select (AND-matching, e.g. type tags,
  muscle groups) MUST carry a visual affordance distinct from single-select chips (e.g.
  body position, element), beyond an active-state color change alone. *(source: 05; tagged
  `spec 00X`, routed here — this is the design-system half of the `05` chip-treatment
  placeholder)*
- **UX-006**: The catalog's complexity and injury-risk scores MUST be explainable in place
  (e.g. a tooltip or info affordance) rather than shown as a bare number with no context.
  *(source: 05; tagged `needs decision`)*
- **UX-007**: Theme/mood browsing MUST remain a stateless lens over the existing curated,
  static emotional-release taxonomy — it MUST NOT grow into an ad hoc or unbounded tag set,
  and MUST NOT gain a mood-logging or check-in layer (that belongs to `005`, not here).
  *(source: 06; tagged `quick win` / `needs decision` — verification-only)*
- **UX-008**: Theme mode MUST surface element/chakra/dosha as visible, active-filter chips
  within the same view, rather than requiring a separate panel to cross-filter. *(source:
  06; tagged `quick win`)*
- **UX-009**: The pose data model MUST carry an `energetic_direction` field (langhana /
  brahmana / samana) per pose so the six-phase composer arc has a source to render an intent
  tag from. *(source: 08 (data half); tagged `spec 003` — the render itself is `004`'s
  concern)*

## Constitution constraints binding this feature

- **RULE-O2/O6** (Open Data, Sustainable Product): pose JSON stays plaintext,
  version-controlled, and readable with no account/entitlement, regardless of any server
  mirror added for query performance. Any mirror MUST be one-way generated, never a second
  write path.
- **RULE-O3**: adding `energetic_direction` (UX-009) is a schema change to pose records —
  it MUST NOT bypass the existing `source`/`lineage` attribution requirement or CI schema
  validation (`npm run validate:poses`).
- **Guardrails §2 (one accent, typography-first)**: UX-001/002/005 must not introduce a
  second UI accent color; the muscle-group/meridian/joint/chakra diagram hues are an
  already-sanctioned exception for pose *data* badges — they must not migrate onto buttons,
  links, or chip active-states elsewhere (flagged risk in report 04).
- **≤200ms no-bounce motion**: any new interaction (UX-001's tap-to-highlight) must respect
  the existing motion budget; `BodySvg.tsx`'s current 300ms opacity transition is a known
  violation to fix regardless (see Already-tracked quick wins below), not a precedent to
  match.

## Open decisions

| # | Decision | Recommended default | Why | Status |
|---|---|---|---|---|
| 1 | Hide a zero-data category's tab trigger, or keep it visible with an empty-state message? | Hide the trigger when a pose has zero data for that category. | Discoverability of a category that could exist elsewhere is worth less than avoiding a dead-end tap for the common case; users browsing one pose don't need to learn what categories exist app-wide from that pose's tab bar. | Open |
| 2 | How to explain the complexity/injury-risk score in place? | A single info icon opening a short static tooltip (2–3 sentences, no numeric formula) explaining what the score reflects. | Ties into the friction-engine's own "derived, not authored" principle (RULE-T3) — the explanation should describe geometry factors, not expose the weights constant as UI copy. | Open — needs copy sign-off |
| 3 | Should a nervous-system-effect (or similar) facet ever promote from the Advanced panel to the always-visible row? | No, not without usage data. | Promoting a facet on guesswork risks cluttering the primary filter row for a benefit nobody asked for; revisit once telemetry exists. | Open |
| 4 | Should theme sections carry a one-line non-prescriptive subhead (e.g. "poses people reach for with grief") instead of a bare emotion label? | Yes, add the subhead. | A bare emotion word next to a pose list reads closer to a diagnosis than an invitation; a subhead reframes it as social/anecdotal rather than clinical, consistent with Principle VII's spirit even though VII is written for sadhana specifically. | Open — needs copy pass |
| 5 | Should theme browsing ever gain a mood-logging or "how are you feeling" onboarding layer? | No — keep it a stateless lens over the pose atlas; a feeling-prompted entry point is new scope for a later feature, not a `PosesClient.tsx` tweak. | Conflating theme browsing with mood *logging* would duplicate `005`'s check-in surface and blur which feature owns mood data. | Open — confirm as a standing exclusion |
| 6 | Should the diagram-hue lint rule (muscle-groups indigo / meridians teal / joints slate / chakras purple never migrating onto buttons or links) be a CI lint or a manual review note? | Manual review note for now; formalize as a lint rule only if a violation actually occurs. | The existing sanctioned exception already scopes these hues to pose-data badges; adding CI enforcement pre-emptively is more tooling than the one observed risk currently justifies. | Open |

## Testid contract impact

None identified. This feature's UX changes (chip affordances, legend, tab collapse) are
additive to existing `poses-*` and `poses-theme-section-*` testids and don't require removing
or renaming any node in `docs/krama-guardrails.md` §1.3's table.

## Already-tracked quick wins touching this surface

Restated from `docs/design-research/README.md`'s prioritized list — implement against
shipped code, not as new requirements:

- Tighten `BodySvg.tsx`'s `transition: opacity 0.3s` to ≤200ms (motion-budget violation).
- Audit `PosesClient.tsx` Advanced-panel chip touch targets (`px-2 py-0.5`, lines ~381/397)
  against the ≥40px guardrail.
- Add a top-level "Clear all filters" next to the search bar whenever `hasActiveFilters` is
  true, independent of the Advanced panel being open.
- Audit `DetailLayerChips`/`compose-layer-*` for scroll-position preservation on layer switch
  (shared component also used by Compose).

---

## Correction recorded in 003 (Phase 5)

This document's **"Testid contract impact: None identified"** was already inaccurate when it
was written, before 003 added anything. `poses-clear-all-filters` and
`body-diagram-depth-legend` shipped in 001 and appear nowhere in `docs/krama-guardrails.md`
§1.3, which declares itself the source of truth and requires the table be updated in the
same change.

Both rows are backfilled in the Phase 4/5 commit and marked **drifted** there, rather than
being quietly inserted as though they had always been present — the same treatment UX-011
got in the previous pass. US3 then adds seven rows of its own (`poses-body-diagram`,
`body-diagram-tab-*`, `body-diagram-single-*`, `body-diagram-view-*`,
`body-diagram-legend-*`, `body-diagram-region-*`), so the correct impact line for this
document is *nine rows*, not none.
