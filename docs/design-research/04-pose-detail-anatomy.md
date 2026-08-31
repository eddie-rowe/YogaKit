# Pose Detail & Interactive Anatomy

**YogaKit surface:** `src/app/poses/[slug]/page.tsx` → `PoseDetailClient` → `src/app/poses/PoseDetailContent.tsx`, rendering `src/components/poses/BodyDiagram.tsx` (Radix `Tabs.Root` for Muscles/Meridians/Joints/Chakras, front/back toggle) and `src/components/poses/BodySvg.tsx` (single shared SVG silhouette with per-tab overlay layers, deep-region dashed outline vs. superficial fill).
**Status:** built

## The interaction problem
Any app that maps abstract data (muscles worked, symptom location, pressure points, joint load) onto a body needs a diagram that stays legible at a glance while carrying several mutually-exclusive overlay types. The hard part is switching modes without forcing the user to re-orient, and communicating "how much / how deep / how confident" through color and layering rather than text, on a canvas that is mostly used one-handed on a phone.

## Best in class

### 1. Muscle Map — iOS/web workout tracker, current 2026 listing
- **What they do:** A single front/back body silhouette recolors per session: muscle groups are shaded on a light-to-dark heat scale keyed to training volume (sets performed), so "what did I just target" and "what have I neglected this week" read off the same diagram without switching views.
- **Why it works:** One overlay dimension (intensity via color value, not hue) avoids a legend entirely — darker always means "more," which any user parses instantly.
- **Source:** https://muscle-map.com/

### 2. MuscleWiki — iOS/Android fitness app
- **What they do:** Tapping a muscle region on the interactive body map filters the entire exercise library (1,600+ videos) to movements that train it — the diagram is the primary navigation surface, not a passive illustration.
- **Why it works:** Making the diagram clickable-as-filter collapses two screens (browse muscles, browse exercises) into one, so the anatomy view earns its screen space by doing real work instead of just decorating a page.
- **Source:** https://apps.apple.com/us/app/musclewiki-workout-fitness/id1096827640

### 3. Visible Body / Human Anatomy Atlas 2026 — iOS/Android, 2026-branded release
- **What they do:** A "Systems Tray" lets users add or remove whole anatomical layers (skeletal, muscular, nervous, etc.) with plus/minus toggles rather than a fixed tab set, and the info panel uses collapsible sections so a system with sparse data doesn't render empty rows.
- **Why it works:** Toggle-to-compose beats tab-to-replace when layers can meaningfully co-exist (e.g., bone + muscle together); collapsing empty sections keeps the panel honest about what data actually exists for the selected structure.
- **Source:** https://apps.apple.com/us/app/human-anatomy-atlas-2026/id1117998129

### 4. CareClinic Body Symptom Mapper — iOS/Android health-tracking app
- **What they do:** Users tap the exact point on an anatomical silhouette (head, chest, abdomen, joints, etc.) to log a symptom, then rate intensity 1–10 and attach duration/triggers — the tap target itself becomes the record, not a category picker beside the diagram.
- **Why it works:** Direct manipulation of the body (tap where it hurts) is faster and more accurate self-report than navigating a body-part dropdown, and it doubles as the visualization of history when past entries render back onto the same map.
- **Source:** https://careclinic.io/symptom-tracker/

## Cross-cutting patterns
- A single shared silhouette across all overlay modes (front/back only, not per-tab redraws) so switching layers never causes the body shape itself to jump or reflow.
- Intensity/depth is almost always encoded as opacity or color value on the *same* hue family, reserving distinct hues for distinct categories (muscle groups) — never both at once on one layer.
- Overlay switching is a flat set of mutually exclusive states (tabs or toggles), rarely more than 4-5, always visible without scrolling on mobile.
- Empty or sparse layers collapse or gray out rather than rendering blank labeled rows — best apps treat "no data for this layer" as a first-class state, not a bug.
- The diagram is frequently the primary interaction target (tap-to-filter, tap-to-log), not a passive illustration next to a data table.

## Anti-patterns observed
- 3D "rotate and dissect" apps (Complete Anatomy) that need pinch-zoom-and-pan to make individual structures legible on a phone screen — great for deep study, poor for a glanceable pose-detail card.
- Legends rendered as long swatch lists below the diagram that require reading text to decode color, rather than encoding meaning directly in position/label proximity.
- Tab bars that grow to 6+ overlay types, forcing horizontal scroll or truncated labels on narrow viewports.

## Fold into YogaKit
- Add a persistent depth legend (superficial solid fill vs. deep dashed outline swatch, 2 lines max) near the SVG so `BodySvg.tsx`'s dashed/opacity convention doesn't require the reader to infer it — `quick win`.
- On mobile widths, consider collapsing front/back toggle and tab bar into one row or making tabs horizontally scrollable with snap, since `BodyDiagram.tsx` currently stacks two full-width control rows before the SVG even renders — `quick win`.
- Make muscle regions in `BodySvg.tsx` tappable (aligns with MuscleWiki pattern) to jump to or highlight the matching chip in the legend below, turning the diagram into a two-way linked view rather than one-directional (data → diagram only) — `spec 003` (pose-library), since it touches shared body-map data contracts.
- For the "no {tab} data" empty state (`BodyDiagram.tsx` lines 130-136), consider hiding the tab trigger itself when a pose has zero data for that category, rather than showing an empty count and an overlay message after the click — consistent with Tier-1/Tier-2 field-completeness rule that empty fields hide rather than show blank; but this trades off discoverability of what layers *could* exist — `needs decision`.
- Chakra/element glow layer already isolates its bespoke saturated palette to the SVG only (not buttons); confirm the muscle-groups' indigo, meridians' teal, joints' slate, and chakras' purple legend chip colors in `BodyDiagram.tsx` (lines 143, 150, 157, 164) never bleed into actual link/button classes elsewhere — currently they don't, worth a lint note — `needs decision`.

## Constitution check
The semantic, saturated per-category palette (indigo/teal/slate/purple chips, chakra glow colors, element colors) is a second confirmed instance of the permitted non-accent exception already carved out for pose-data badges — anatomy diagrams need distinct hues to separate muscle/meridian/joint/chakra categories and cannot run on one accent color. This is consistent with existing precedent as long as it stays scoped to the diagram/legend chips and never migrates onto buttons or links (checked above, currently clean). The `transition: opacity 0.3s` used throughout `BodySvg.tsx` (300ms) exceeds the ≤200ms no-bounce motion ceiling and should be tightened. The empty-state pattern recommended above (hide sparse tabs) directly serves the Tier-1/Tier-2 completeness rule. Touch targets for the front/back toggle and tab triggers look mobile-sized already; dark mode is not addressed in either file (fixed `stone-*`/`indigo-50` light-mode literals with no dark variant) and needs a pass. All app-behavior claims above are drawn from the cited web search results, not model knowledge; the constitution/file-line references are drawn directly from the codebase read in this session.
