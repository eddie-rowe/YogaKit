# Sequence Composer

**YogaKit surface:** `src/app/compose/ComposeClient.tsx`, `src/app/compose/ComposeFlowItem.tsx`; routes `/compose`, `/compose/[flowId]`, `/compose/[builtin-id]`
**Status:** built, monolithic (spec 004 will decompose)

## The interaction problem

Ordered-list authoring tools all face the same three-way tension: reordering must feel
instantaneous and work identically across pointer, touch, and keyboard input; every edit
must be persisted without an explicit "save" action stealing the user's attention; and the
UI must never let the user doubt whether their last change actually landed. The moment any
one of those three breaks — a drag that silently no-ops on a phone, a save state that lies,
or a reorder that loses your place in a long list — the whole authoring surface stops
feeling trustworthy, no matter how good the rest of the design is.

## Best in class

### 1. Notion — web/desktop/mobile, block editor (current 2026)
- **What they do:** Every block reveals a `⋮⋮` drag handle on hover; dragging shows a blue
  insertion guide, and the same handle works for both flat reordering and nesting (drop
  right of the guide to nest as a child, in line with it to stay a sibling). Every block
  type shares the identical handle and drag behavior, so the interaction is learned once
  and reused everywhere in the document.
- **Why it works:** One consistent physical gesture across every content type removes the
  need to learn per-widget reorder rules, and the live insertion guide gives continuous
  feedback about *where* the drop will land before it happens — no "did that work" moment.
- **Source:** https://www.notion.com/help/writing-and-editing-basics ; pattern breakdown at https://eddyter.com/blogs/build-notion-style-block-editor-react-2026

### 2. Typeform — web form builder (current 2026)
- **What they do:** Questions reorder by dragging in a left-rail thumbnail strip (drag to
  pick a new slide position), with an explicit non-drag fallback — a `⋯` menu with "move
  up/move down." Autosave is a named, documented feature: edits save continuously while
  editing, decoupled from a separate "Publish" step that pushes changes live.
  [Model-knowledge flag: the up/down fallback menu location is reported secondhand via
  search summary, not directly verified against a live Typeform screenshot.]
- **Why it works:** Separating "always-saved draft" from "explicitly published live form"
  answers exactly the anxiety autosave otherwise creates (did my half-finished edit just
  go live?) — the safety net and the publish boundary are two different, clearly labeled
  states.
- **Source:** https://help.typeform.com/hc/en-us/articles/360053660271-My-first-form ; https://www.typeform.com/blog/typeform-vs-tally

### 3. Google Docs — web (current 2026)
- **What they do:** A persistent status text in the toolbar cycles through "Saving…" and
  "All changes saved in Drive," updating within seconds of every edit — no save button
  exists at all, and a broken sync (e.g., offline) visibly changes that same indicator
  rather than failing silently.
- **Why it works:** Continuous, ambient, truthful save-state text removes save anxiety
  entirely by making "am I safe to close this tab" a one-glance answer instead of an
  inferred one.
- **Source:** https://nerdtechy.com/does-google-docs-autosave

### 4. Spotify — mobile app, playlist editor (current 2026, with a documented regression)
- **What they do:** Reordering tracks requires entering an explicit "Edit" mode first (tap
  `⋯` → Edit), then dragging via a handle on the row. A 2026 community thread reports
  Spotify recently added an extra step — select via checkbox, then tap "Move" — before a
  drag was possible, which users are actively complaining slowed the workflow down; a
  competing feature request (264 likes) asks for direct long-press-to-reorder instead.
- **Why it works (when it works) / why the regression matters:** Gating reorder behind an
  explicit mode is defensible for touch (prevents accidental drags while scrolling a list),
  but every extra tap between "user's intent" and "drag starts" is a measurable point of
  drop-off — Spotify's own users are the evidence.
- **Source:** https://community.spotify.com/t5/Live-Ideas/Mobile-Playlists-Simplified-drag-and-drop-option-within/idi-p/4896119 ; https://support.spotify.com/us/article/sort-and-filter/

### 5. Trello — web/iOS/Android, card reordering (current 2026)
- **What they do:** Desktop drag-and-drop is direct; iOS historically distinguished a
  "hard" press (open card) from a "soft" press-and-hold (drag card) — a touch-pressure
  heuristic that has confused enough users to generate multi-year community threads, and
  the mobile *web* client (as opposed to the native app) for a long time had no drag at
  all, requiring a tap-into-card → scroll-to-bottom → "Move" action instead.
- **Why it works (as a cautionary example):** This is the negative case worth citing on
  purpose — pressure-based gesture disambiguation is exactly the kind of "clever" input
  design that silently degrades per-device, which is the same failure class as HTML5
  native drag no-op on iOS Safari that YogaKit's own guardrails already worked around.
- **Source:** https://community.atlassian.com/forums/Trello-questions/In-Trello-on-IOS-how-do-I-move-a-card-within-a-list/qaq-p/795048 ; https://blog.logrocket.com/ux-design/drag-and-drop-ui-examples/

## Cross-cutting patterns

- Every credible exemplar pairs drag with a non-drag fallback (button menu, keyboard
  arrows) rather than treating drag as the only path — GitLab's Pajamas system and
  multiple accessibility guides converge on the same keyboard contract: focus item, pick
  up with Space/Enter, move with arrow keys, drop with Space/Enter, cancel with Escape.
- Save state is communicated as ambient, continuously-true text (Google Docs), not a
  button whose label is the only signal — the label doubles as status *and* affordance.
- A drop preview/insertion guide (Notion's blue line) beats an end-of-drag snap — feedback
  during the gesture, not only after release.
- Touch-specific reorder needs deliberate friction against accidental drags (an edit mode,
  a activation distance/press-and-hold) but every added tap before a drag can start is a
  cost users notice and complain about (Spotify's 2026 regression).
- Autosave and "publish/share" are kept as two distinct, separately labeled states in
  professional tools (Typeform) — this maps directly onto YogaKit's own built-in-vs-copy
  and dirty/saving/saved/error states.

## Anti-patterns observed

- Pressure- or gesture-based drag disambiguation (Trello iOS "hard press vs. soft press")
  that isn't discoverable and varies by device/OS version.
- A mobile web surface with drag omitted entirely, silently downgraded to a multi-step
  menu action with no explanation (older Trello mobile web).
- Adding steps in front of a previously-direct drag (Spotify mobile's late-2026 "select
  then Move" change) — degrades a working gesture without giving users a visible reason.
- Save affordances with no distinguishable "in flight" vs "failed" vs "done" state (the
  generic failure mode Google Docs' three-state indicator is explicitly built to avoid).

## Fold into YogaKit

- The current `compose-item-drag-handle-{index}` + up/down button fallback already
  matches the Notion/GitLab keyboard-and-fallback pattern; keep the testid contract as-is
  when this decomposes. `quick win`
- Add a lightweight drop-preview affordance (highlighted insertion gap between rows, not
  just the dragged row's own opacity change) during `handleDragEnd`'s in-flight drag, ≤200ms,
  no bounce — matches Notion's insertion guide without adding a second accent color.
  `spec 004`
- The four-state save button (`saved`/`dirty`/`saving`/`error`) already goes further than
  Typeform's binary autosave-then-publish split by surfacing `error` explicitly with
  `compose-save-error` — this is ahead of, not behind, the exemplars; no change needed.
  `quick win` (documentation only — call this out as a strength when spec 004 decomposes)
- Consider an ambient inline save-state string next to the title input (Google-Docs style)
  as a secondary, non-blocking readout, so the four states are visible without requiring a
  glance at the button specifically — useful once the save button itself gets pulled into
  a smaller subcomponent. `needs decision` (adds a second text element to a
  typography-first layout; weigh against "no extra chrome")
- When 004 splits `ComposeFlowItem` out, keep the reorder handle and up/down buttons as
  siblings in the same row markup (as today) rather than collapsing the buttons into an
  overflow menu — Spotify's 2026 regression is a live example of what happens when a
  direct action gets buried behind an extra tap. `spec 004`
- Preserve scroll position across a reorder (drag or button) when the composer's list
  grows long enough to scroll — not currently a problem at typical flow lengths, but worth
  a smoke-test guard before flows commonly exceed one screen. `needs decision`

## Constitution check

- Mobile-first touch-real requirement: the existing drag-handle + up/down fallback is
  already the correct answer to the recorded DECISIONS.md precedent that HTML5 native drag
  silently no-ops on iOS Safari; any redesign in spec 004 must keep dnd-kit's pointer
  sensor (not native HTML5 DnD) and must not drop the button fallback, per Trello's
  cautionary example above.
- ≤200ms no-bounce motion: a drop-preview/insertion-guide addition must use the existing
  `--duration-fast`/`--duration-base` tokens and `--ease-standard` — no spring easing,
  matching guardrails §2.
- One-accent, typography-first design: an ambient save-state readout (Google Docs pattern)
  must reuse `--muted`/text-weight, not a new color, to avoid a second UI accent — this is
  a real tension worth flagging, not a free win.
- Testid contract stability: any decomposition in 004 must keep
  `compose-item-drag-handle-{index}`, `compose-item-reorder-up/down-{index}`, and
  `compose-save-button` stable per `docs/krama-guardrails.md` §1.3, changing labels/visuals
  only.
- Determinism: none of the exemplars above (Notion, Typeform, Google Docs, Spotify,
  Trello) introduce anything AI-adjacent in the reorder/save path itself — reordering and
  autosave are UI/state-machine concerns only, consistent with the composer having no AI
  in its path today or after 004.
