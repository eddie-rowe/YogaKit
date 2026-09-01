# Design Input: Sequencing Composer

**Feature**: `004-sequencing-composer` (not yet scaffolded)
**Created**: 2026-08-28
**Status**: Design input — consumed by `/speckit.specify`, not a specification
**Sources**: `docs/design-research/01-friction-seams.md`,
`docs/design-research/02-advisory-warnings.md`,
`docs/design-research/07-sequence-composer.md`,
`docs/design-research/08-phase-arc-structure.md`,
`docs/design-research/09-mat-side-read-view.md`,
`docs/design-research/18-offline-sync-pwa.md`,
`docs/design-research/21-portability-export-share.md`

## Scope anchor

Per the platform-pivot plan's "Step 2 — The five features": flows migrate from IndexedDB to
normalized Postgres (`flows` + `flow_items` + `phases`); IndexedDB becomes the offline read
cache; `.krama.json` export/import becomes an assemble/shred step over that schema rather than
a column read; `ComposeClient.tsx` (497 lines) decomposes into `components/compose/`,
finally building the `components/compose/` directory `001`'s plan described but never
created; in-org/cohort flow sharing becomes possible for the first time. The friction engine
and validator-lite stay pure, client-side, and untouched (Principle III) — nothing here adds
a DB or network dependency to `src/lib/friction/` or `src/lib/validator/`.

## Exemplars worth copying

| Pattern | App | Why it works |
|---|---|---|
| Threshold-gated sync indicator, invisible when settled | Linear | Sync UI that's silent by default doesn't train users to ignore it |
| Explicit "done" confirmation after a transient sync spinner | Google Docs | Avoids the worst sync failure mode: a spinner with no resolved state |
| Durable local write before any network attempt | Banking apps (queue-before-network pattern) | The write is safe the instant it's made; sync is background reconciliation, never a precondition for "saved" |
| One-click duplicate instead of a file download/upload round trip | Notion | Removes friction from sharing structural content between people |
| Drag-and-drop with a visible insertion-gap preview | Ableton Live / Linear | Makes the drop target legible mid-drag instead of relying on opacity alone |

## Candidate UX requirements

- **UX-001**: The composer MUST show a visible insertion-gap preview between rows during an
  in-flight drag (not merely a change in the dragged row's opacity), rendered within the
  existing ≤200ms no-bounce motion budget. *(source: 07; tagged `spec 004`)*
- **UX-002**: When `ComposeFlowItem` is decomposed as part of this feature's refactor, the
  drag handle and the up/down reorder buttons MUST remain sibling elements in the same row
  markup — never collapsed into an overflow menu. *(source: 07; tagged `spec 004` — explicit
  anti-pattern reference: Spotify's 2026 mobile regression)*
- **UX-003**: Each of the two validator-lite warnings MUST be dismissible per-session
  (not persisted) so a teacher who deliberately ends on a non-stillness pose isn't re-shown
  the same note on every render. *(source: 02; tagged `spec 004`)*
- **UX-004**: Each validator-lite warning MUST be anchored to the flow item it concerns
  (e.g. a marker beside the affected pose row), in addition to or instead of the current flat
  list rendered above the item list. *(source: 02; tagged `spec 004` — resolves 02's
  previously-unassigned per-item-anchor item)*
- **UX-005**: The `.kk-seam` boundary MUST expose a hover affordance (cursor change or subtle
  highlight) so a user discovers it is interactive and carries a title/tooltip. *(source: 01;
  tagged `spec 004` — reassigned here from the research's ambiguous "003 or later Compose
  polish" placeholder, since `003` owns no Compose code)*
- **UX-006**: Seam tier MUST be encoded via line length/width progression (not height alone)
  with an increased row gap at the highest tier, so the geometry itself communicates
  magnitude. *(source: 01; tagged `quick win`, CSS-only)*
- **UX-007**: Each phase header, in both Compose and the read view, MUST display a summed
  duration and the pose's derived intent tag (langhana/brahmana/samana, sourced from `003`'s
  `energetic_direction` field). *(source: 08; tagged `quick win` for the duration badge,
  `spec 004` for the intent-tag render — this is the real v0.1 spec §5 gap the research
  found)*
- **UX-008**: Phases MUST support drag-reorder (not just items within a phase) and a
  fold-to-a-bar collapse, modeled on a persistent per-group collapse pattern. *(source: 08;
  tagged `spec 004`)*
- **UX-009**: The offline write path MUST record a per-flow `syncState`
  (`synced | pending | failed`) and, when the outbox is non-empty, show a small
  threshold-gated label (not a modal, not a spinner) — nothing rendered when the outbox is
  empty. *(source: 18; tagged `quick win` for the field, `spec 004` for the outbox/dead-letter
  implementation itself, flushing on `online`, on focus, and every 60s)*
- **UX-010**: On permanent sync failure, the system MUST show exactly one non-blocking banner
  with a manual retry action — never an automatic retry loop. *(source: 18; tagged `spec
  004`)*
- **UX-011**: Sign-out MUST clear **account-derived** flows and the outbox from IndexedDB,
  not just application state — a shared device must not leak the previous user's flows to
  whoever signs in next. It MUST NOT clear flows authored locally and never synced: those
  have no other copy, and destroying them would break RULE-L4 and contradict research 16
  ("signing out must never clear or hide the IndexedDB-cached flows that were working
  offline before any account existed"). *(source: 18, flagged gap; tagged `spec 004`;
  amended — the original wording said "the flow cache", which shipped as an unconditional
  wipe. See DECISIONS.md, "Sign-out clears synced flows only".)*
- **UX-012**: Sharing a flow within an org/cohort MUST offer a one-click "duplicate into my
  library" affordance producing an independent copy, with `.krama.json` export/import
  retained as the offline fallback path, not the only path. *(source: 21; tagged `spec 004`)*
- **UX-013**: Before a shared/duplicated flow crosses the author boundary, any author-only
  content field (notes, reflections) MUST be stripped or gated at the data layer — never
  relying on the sharing UI alone to omit it. *(source: 21; tagged `spec 004` — this is the
  load-bearing Principle VIII item in this feature, see Constitution constraints)*
- **UX-014**: The read view MUST render breath cues as the spec-mandated glyph notation
  (↑ ↓ ~) rather than text strings. *(source: 09, flagged gap in shipped `ReadView.tsx`;
  tagged `quick win`)*
- **UX-015**: The read view MUST visually distinguish the current item (the pose being held
  right now) from the rest of the flow list — a highlight or emphasis treatment legible at
  low screen brightness, since this view is read mat-side. *(source: 09; tagged `needs
  decision`, see Open decisions)*
- **UX-016**: A phase's fold-to-a-bar collapse state (UX-008) MUST persist across a session
  reload (not reset to fully-expanded every visit) once a flow has more than a couple of
  phases. *(source: 08; tagged `needs decision`, see Open decisions)*
- **UX-017**: The pose-detail progressive-depth pattern (tap to escalate from name → cue →
  full geometry) MUST have a Compose-side counterpart: an in-flow item's notes/geometry
  escalate inline on tap rather than only in a separate detail view. *(source: 03; tagged
  `needs decision`, see Open decisions — this is Compose's half of 03's progressive-depth
  research; the pose-detail half is `003`'s existing UI, unchanged)*

## Constitution constraints binding this feature

- **Principle III / RULE-H6**: none of UX-001–010 may add a DB or network dependency to the
  friction engine or validator-lite — the dismiss/anchor changes in UX-003/004 are UI-layer
  filtering over `validateLite`'s existing typed output, not a change to the pure function
  itself.
- **Principle VIII / RULE-V1, V2**: UX-013 is the concrete implementation of the
  content/signal split once sharing exists — author-only fields (journal, notes, reflections)
  must be excluded from the shared payload at the table/query layer, not the client
  component. A schema reviewer must be able to verify this by inspecting the query alone.
- **RULE-L3/L4**: UX-009's outbox pattern must not gate reading a flow already in the
  IndexedDB cache on auth or network state — the sync-status UI is additive, never a
  precondition for the read view.
- **RULE-L6 (Lighthouse ≥90 on read view)**: UX-009's sync-status label must render nothing
  when settled/empty and must not poll visibly, to keep the read view's performance budget
  intact.
- **Guardrails §1.3 (testid contract)**: UX-002's decomposition MUST preserve
  `compose-item-drag-handle-{index}` and `compose-item-reorder-up/down-{index}` exactly as
  they are today — this is an explicit non-goal to change during the refactor.

## Open decisions

| # | Decision | Recommended default | Why | Status |
|---|---|---|---|---|
| 1 | Suppress a `.kk-seam` row entirely when the friction score is at the true floor, or always render a row regardless of magnitude? | Keep rendering every row; do not suppress. | Suppressing would remove a `compose-seam-{fromIndex}-{toIndex}` testid node for some pairs, breaking the guardrails §1.3 contract's assumption that every adjacent pair has a stable seam node; the visual weight (UX-006) already communicates "nothing much here" without removing the element. | Open |
| 2 | Is a curve/shape seam visualization (à la Premiere's waveform) worth the redraw cost under the motion budget? | No — stay with the line-based encoding (UX-006). | A shape redraw risks exceeding ≤200ms on longer flows; the line-progression approach gets most of the legibility gain at near-zero render cost. | Open |
| 3 | Does validator-lite need a third, lower-weight "hint" tier below "warning" as it grows past two checks? | Not yet — revisit only when a third check is actually proposed. | Speculative tiering now risks a second semantic color under the one-accent constraint before there's a real second use case. | Open |
| 4 | Does the `.kk-warning` advisory/error color split need constitution sign-off as a second semantic color? | Yes, treat it as needing sign-off, not a quiet CSS tweak. | `.kk-warning` currently serves both an advisory craft note and `compose-save-error`; visually distinguishing them is a real UI change beyond the sanctioned pose-data-badge exception and should be reviewed the way any accent-color exception is. | Open |
| 5 | Should composer scroll position persist across a reorder (drag or button) once a flow is long enough to scroll? | Yes, preserve it. | Losing scroll position on every reorder click would be a regression the moment flows grow past one screen; cheap to guard with a smoke test now. | Open |
| 6 | Should Compose gain an ambient inline save-state string (Google-Docs style) next to the title, in addition to the existing 4-state save button? | No. | The 4-state save button (`saved`/`dirty`/`saving`/`error`) already exceeds the exemplars researched; a second text element adds chrome to a typography-first layout for marginal benefit. | Open |
| 7 | Per-flow sync indicator (a pill per flow card) or a single global header state? | Global header state. | Per-flow is more informative but adds render surface to every list item; a global state is cheaper against the RULE-L6 Lighthouse budget and flows are not collaborative enough to need per-item granularity yet. | Open |
| 8 | Conflict handling for a flow edited on two devices while both were offline: Obsidian-style conflict-copy, or last-writer-wins with a visible disclosure notice? | Last-writer-wins with a visible "an older version synced later and was replaced" notice. | Flows are personal, not collaborative — full conflict UI is disproportionate cost for a single-author object; disclosure (not silence) is the load-bearing requirement, not a merge UI. | Open |
| 9 | Share-link permission model for UX-012/013: Gist-style ("anyone with the link can view/duplicate") or Notion-style named permission levels? | Structure-only duplication by default — no named permission levels at launch. | The safest default is "view/duplicate the flow structure only, never journal content," which UX-013 already enforces at the data layer regardless of link model; named permission levels can be added later without a data-layer change. | Open |
| 10 | How should the read view (UX-015) distinguish the current item at low brightness — a filled background, a border accent, or a size increase? | A subtle filled background plus a size increase on the current row; no new accent color. | A border-only treatment risks being invisible at low mat-side brightness; a background fill reads clearly without introducing a second semantic color under the one-accent guardrail. | Open |
| 11 | Should phase collapse state (UX-016) persist per-flow in `localStorage`, or reset every session? | Persist per-flow in `localStorage`, keyed by flow ID. | Re-collapsing a long flow's phases on every reload would recreate the scroll-and-refold annoyance this pattern exists to avoid; per-flow keying avoids one flow's collapse state leaking into another's default. | Open |
| 12 | Should Compose's inline depth escalation (UX-017) reuse the same tap-to-reveal component as `003`'s pose detail view, or is Compose's row-constrained layout different enough to need its own? | Reuse the same underlying component, adapted to a row-width container. | Two independent implementations of the same progressive-depth interaction would drift in behavior and motion timing; a shared component with a narrower layout mode keeps the ≤200ms budget and visual language consistent across `003` and `004`. | Open |

## Testid contract impact

- **UX-002** requires `compose-item-drag-handle-{index}` and `compose-item-reorder-up/down-{index}` to survive the `components/compose/` decomposition unchanged — a testid-preservation requirement, not just a nice-to-have.
- **UX-001/UX-005/UX-006** are additive DOM (a drop-preview element, a hover state, CSS-only tier encoding) and don't rename or remove any existing `compose-*` testid.
- Open decision #1 above is explicitly a testid-preservation question: suppressing a seam row would remove a `compose-seam-{fromIndex}-{toIndex}` node for some pairs.

## Already-tracked quick wins touching this surface

Restated from `docs/design-research/README.md`'s prioritized list:

- Render breath marks as glyphs (↑ ↓ ~) instead of text in `ReadView.tsx`'s `breathMark()`
  (UX-014 above, restated as it is the single highest-priority quick win in the whole
  corpus).
- Summed-duration badge on each phase header in both Compose and `ReadView.tsx` (UX-007).
- Confirm-only: keep the drag-handle + up/down testid contract exactly as-is through the
  decomposition (UX-002).
- Confirm-only: the existing 4-state save button is already ahead of the researched
  exemplars — call this out as a strength when decomposing, not a thing to change.
