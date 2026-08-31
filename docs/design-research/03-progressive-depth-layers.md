# Progressive Depth Layers

**YogaKit surface:** `src/app/compose/ComposeClient.tsx` (search `layer`, `compose-layer-{layer}` chips, ~L326-339, threaded into `ComposeFlowItem` at L415); `src/app/poses/PoseDetailContent.tsx` (`DetailLayer` type L13, `useDetailLayer` hook L67-99, `DetailLayerChips` L107-123, `CustomFieldChecklist` L130-146, field-visibility derivation L155-166); testid contract in `docs/krama-guardrails.md` (`compose-layer-{layer}`, `poses-detail-layer-{l}`, `poses-detail-custom-field-{group}`).
**Status:** built

## The interaction problem
The same content needs to serve a beginner scanning quickly and an expert who wants every field. A single fixed density either overwhelms newcomers or under-serves power users, and building two separate pages doubles maintenance and breaks a user's mental model of "this is still the same pose/flow." The fix is a persistent, user-owned dial on ONE surface, that reveals or hides field groups without navigating away or losing place.

## Best in class

### 1. Oura Ring app — iOS/Android, actively redesigned through 2026
- **What they do:** The Today screen shows a row of top-line scores (Readiness, Sleep, Activity). Tapping any score drills into the same metric's contributor breakdown and trend — same content, deeper layer, not a new page family. Full contributor-level depth requires an active membership; without it users see only raw heart rate/sleep time/steps.
- **Why it works:** Depth is reached by tapping the metric itself, not a separate settings switch — the escalation path is discoverable because it's literally where the user is already looking.
- **Source:** https://liveworksleep.com/oura-app-features/ and https://www.dcrainmaker.com/2026/07/oura-ring-5-in-depth-review-comparison.html

### 2. Notion — web/desktop/mobile, core product in continuous use in 2026
- **What they do:** Per-view "Properties" menu toggles which fields show on the same database, independent of the underlying data — a List view might show only the title, while a Table view shows every property as a column; each view remembers its own field selection.
- **Why it works:** Field-group visibility is treated as a saved *view preference*, not a one-off UI state — exactly YogaKit's "custom" layer with localStorage-persisted field groups, just generalized to many named views instead of one custom slot.
- **Source:** https://www.notion.com/help/database-properties and https://www.notion.com/help/views-filters-and-sorts

### 3. Adobe Lightroom mobile — iOS/Android, updated June 2026
- **What they do:** The in-app camera has a chip-style mode switch (Auto vs. Pro/HDR) directly on the capture screen. Auto exposes only the shutter button; Pro reveals manual shutter speed, focus, and flash controls on the same viewfinder, no screen change.
- **Why it works:** The mode switch sits at the point of action, so escalating to more control costs one tap and zero context loss — this is the closest real-world analog to YogaKit's inline chip row sitting right above the content it controls.
- **Source:** https://www.dpreview.com/news/9872416768/adobe-lightroom-photoshop-update-june-2026 and https://helpx.adobe.com/lightroom/mobile/add-and-capture-photos/capture-photos/capture-photos-in-auto-mode.html

## Cross-cutting patterns
- Depth control sits *at* the content, not buried in a settings screen (Lightroom's mode chips, Oura's tap-into-metric).
- The "custom" tier is a first-class, named, persisted state — not a temporary UI toggle (Notion's per-view saved properties).
- Escalating detail never re-navigates or reloads the object; it reveals/collapses within the same scroll position.
- Simple mode is rarely "less data," it's "the same data with the least urgent fields removed" — nothing is deleted, only deferred.
- Successful patterns keep the number of tiers small (2-3 named tiers plus one power-user escape hatch), matching YogaKit's four-chip shape.

## Anti-patterns observed
- Oura reviewers flag that spreading one score's meaning across three drill levels can "dilute" clarity — depth tiers can fragment a single fact instead of adding fidelity to it.
- Gating advanced depth behind subscription (Oura) mixes a monetization signal into a density control — irrelevant to YogaKit since pose data must stay free per RULE-O6/O7, but worth naming as a trap to avoid.
- VS Code's "advanced" tier de facto means "edit raw JSON" — a cliff, not a slope; no UI-only mid-tier is documented, which is the opposite of YogaKit's incremental simple→advanced→expert ramp. *(Flagged as inferred from search rather than confirmed by an official 2026 Microsoft UX statement.)*

## Fold into YogaKit
- Give the "custom" field checklist in `PoseDetailContent.tsx` a saved-preset affordance (name and reuse a custom set, Notion-style) rather than one anonymous slot. `spec 006` (profile/settings territory).
- Add a one-tap escalation directly on a flow-item's seam/notes area in `ComposeClient.tsx` (Lightroom-style: tap the friction badge to reveal notes/geometry inline) instead of requiring a global layer-chip change to see one item's detail. `needs decision` (changes per-item vs. global density semantics).
- Audit `DetailLayerChips`/`compose-layer-*` chip rows for scroll-position preservation when switching layers — content should not jump. `quick win`.
- Consider surfacing which custom fields are hidden as a subtle count badge on the "custom" chip itself, so hidden state is legible without opening the checklist. `quick win`.

## Constitution check
The one-accent, typography-first system means layer differences must be signaled by weight/size/whitespace, not color-coded chips — worth auditing `kk-chip` active states for color-only signaling. Layer-switch transitions must stay under the ≤200ms no-bounce budget; Oura's drill-down navigation model (new screen) is explicitly the wrong shape here — YogaKit's in-place reveal is correct and should stay in-place. The 6am test cuts against Lightroom's mode-chip pattern if "expert" silently exposes options a groggy user misreads as required fields — expert/custom fields must read as optional, never mandatory. Testid stability (`compose-layer-{layer}`, `poses-detail-layer-{l}`, `poses-detail-custom-field-{group}`) constrains any redesign to keep layer names and field-group keys as the stable identifiers, even if visual treatment (chips vs. segmented control vs. accordion) changes.
