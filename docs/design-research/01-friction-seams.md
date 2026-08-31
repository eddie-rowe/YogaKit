# Friction Seams

**YogaKit surface:** `src/app/compose/ComposeClient.tsx`, `src/app/compose/ComposeFlowItem.tsx`, `src/lib/friction/index.ts`, `.kk-seam` in `src/app/globals.css`
**Status:** built (Compose only)

## The interaction problem
When items in an ordered list are meant to flow into each other, the gap between two adjacent items carries information the items themselves don't: how hard the jump between them is. Users scanning the list need a cheap, glanceable signal of transition cost at every seam, with a deeper explanation available on demand, without the app inventing a reason that wasn't actually measured.

## Best in class

### 1. Descript — timeline clip transitions (video/audio editor, 2026)
- **What they do:** A small handle sits exactly at the boundary between two clips; its presence and shape communicate that a transition exists, dragging it scales the crossfade region, and clicking opens a menu with the specific transition type rather than a color-coded badge.
- **Why it works:** The affordance lives *at the seam itself*, not on either clip, and the interaction (drag) doubles as the explanation of what's being adjusted.
- **Source:** https://help.descript.com/hc/en-us/articles/10255989387661-Transitions

### 2. Adobe Premiere — audio crossfade curve types (video editor, current 2026 docs)
- **What they do:** Constant Power vs. Exponential Fade crossfades are shown as literal curve shapes drawn in the seam region between two clips, so the shape of the line itself is the derived data (rate of change), not a label.
- **Why it works:** The visualization *is* the measurement — no interpretive layer between the underlying curve math and what's rendered, which maps directly onto "report a derived delta, don't author a reason."
- **Source:** https://helpx.adobe.com/premiere/desktop/add-audio-effects/apply-audio-transitions/audio-crossfade-transitions.html

### 3. AudioMass — automatic overlap crossfades (web-based DAW, 2026)
- **What they do:** When two clips on the same track overlap, the app automatically draws a crossfade in the overlap region with no user action — the visualization appears only when there's a real geometric overlap to report.
- **Why it works:** No transition is invented where none exists; the UI stays silent unless there's a measured condition to show, which mirrors "only render a seam when there's an actual pose-to-pose delta."
- **Source:** https://audiomass.co/about.html

### 4. GitHub — Files Changed diff-hunk boundaries (code review, shipped as default Jan 2026)
- **What they do:** Collapsed context between hunks is a thin, click-to-expand affordance sitting between two chunks of unchanged code, distinct from the hunks themselves, with sticky headers keeping orientation as you scroll past a boundary.
- **Why it works:** The boundary marker is deliberately low-weight (not colored, not bold) so it doesn't compete with the actual diff content, but it's still a real interactive element, not decoration.
- **Source:** https://github.blog/changelog/2026-01-22-improved-pull-request-files-changed-page-on-by-default/

### 5. Hevy — superset grouping and rest-timer handoff (workout tracker, 2026)
- **What they do:** Adjacent exercises grouped as a superset get a distinct visual bracket plus an auto-scroll and rest-timer cue exactly at the handoff point between sets.
- **Why it works:** It's a counter-example worth citing for contrast: Hevy leans on per-superset *color* to distinguish groups, which is exactly the pattern the one-accent constraint rules out for YogaKit, but it's still useful evidence that transition points benefit from a dedicated, distinct visual treatment rather than being folded into the item styling. (Relying on general product description rather than a hands-on session — flagging this as lower-confidence than the other sources.)
- **Source:** https://www.hevyapp.com/features/what-are-supersets/

## Cross-cutting patterns
- The seam affordance sits physically between the two items, never appended to either one — it reads as a property of the *relationship*, not of either endpoint.
- Best implementations encode magnitude through a geometric property of the mark itself (thickness, curve shape, handle size) rather than a separate label or icon, keeping the seam legible at a glance.
- Detail (exact reason, curve type, transition name) is revealed progressively — hover, click, or expand — never dumped inline by default.
- The seam disappears or goes inert when there's nothing to report (AudioMass draws nothing without an overlap), avoiding a "decoration on every gap" problem.
- Several tools (Premiere, AudioMass) make the mark *be* the measurement rather than an interpretation of it, which is the strongest analog to a deterministic, non-authoring engine.

## Anti-patterns observed
- Hevy color-codes each superset group for distinction — under a one-accent-color constraint this pattern is unavailable, and it also conflates "grouping" with "transition cost," two different signals.
- Citymapper reviewers report that connection/transfer timing is "there somewhere hidden but isn't intuitive" — a caution against burying the seam's key number behind extra taps when the whole point is a glanceable signal (https://localsinsider.com/apps/get-around-with-citymapper-the-public-transit-app-reviewed/).
- SHRED's adaptive-difficulty UI was called "confusing at first for new users" by reviewers, a caution against overloading a transition indicator with too many derived signals at once (https://fortune.com/article/best-workout-apps/).

## Fold into YogaKit
- Encode tier via seam-line *length/width* progression (currently only height 1px→2px) plus a subtle gap-width increase between rows at tier 3, so the geometry itself communicates "bigger jump," not just a slightly thicker hairline. `quick win` — CSS only, in `.kk-seam-line` / `.kk-seam[data-tier]` in `src/app/globals.css`.
- Suppress the seam row entirely (not just tier-1 styling) when `score` is at the true floor (e.g., near-identical poses), matching AudioMass's "draw nothing without overlap" — currently every adjacent pair renders a seam row regardless of magnitude. `needs decision` — changes visible row count in Compose, worth a guardrails discussion.
- Keep `reasons[0]` as the only always-visible text (already true for non-expert layer) and treat `title={seam.reasons.join('; ')}` as the deepen-on-hover layer, matching Descript/Premiere's progressive disclosure — this is already implemented correctly in `ComposeFlowItem.tsx:181,186-187`, no change needed, just confirmed as best-practice.
- Consider a boundary-hover affordance (cursor change, slight highlight of the `.kk-seam` row) so users discover the seam is interactive/has a title, similar to Descript's handle — currently `.kk-seam` has no hover state at all beyond the 160ms color transition already defined. `spec 00X` — would touch `003-pose-library` or a later Compose polish pass.
- Do not add a curve/shape visualization (à la Premiere) without checking motion budget — any seam mark that redraws on data change must respect the ≤200ms no-bounce rule already governing `.kk-drag-item`. `needs decision`.

## Constitution check
No source above suggests color-coding tiers or authoring new copy — Descript, Premiere, and AudioMass all keep the mark itself as the raw measurement, which is compatible with Principle III (the friction engine must only report derived deltas; `reasons` strings already come verbatim from `src/lib/friction/index.ts` and must stay that way — no UI-side rewriting). Thickness-only tier encoding in `.kk-seam` already satisfies the one-accent/typography-first rule; any move toward a curve-shaped mark (Premiere-style) must stay within a single hue to hold that line. Progressive disclosure via `title` keeps the seam legible at rest for the 6am test — a mat-side glance sees only line + tier word, no wall of text. The `data-testid="compose-seam-{fromIndex}-{toIndex}"` contract in `docs/krama-guardrails.md` §1.3 is preserved by every fold-in above since none change the DOM structure, only styling and hover state; a "suppress seam entirely at floor score" change would need an explicit guardrails update since it changes whether a testid node exists at all for some pairs.
