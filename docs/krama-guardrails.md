# YogaKit Guardrails

Companion to the locked spec (`docs/krama-v0.1-spec.md`). Where the Atlas (`krama-atlas.md`)
governs pose data, this file governs the UI contract that tests and CI rely on, plus the
craft rules that keep the app from drifting off the beauty tenets in spec §10.

## 1 · Testing contract

### 1.1 Test layers

- **Unit** (Vitest) — friction engine, validator-lite, storage module, pose library
  loader. 100% line coverage mandatory on the friction engine and validator-lite
  (constitution RULE-S3 / Governance).
- **Integration** (Vitest) — `.krama.json` export/import round-trip, including reading an
  older `schema_version`.
- **E2E smoke** (Playwright) — the handful of flows in 1.2, keyed to the `data-testid`
  contract in 1.3. Smoke, not exhaustive: one happy path per critical flow, not every
  branch.

### 1.2 Smoke-test flows (minimum set for v0.1)

1. Compose a flow: add ≥3 poses by search, set breaths on one item and seconds on
   another, reorder by button, group into a phase, confirm the live total updates.
2. Save the flow, navigate to Flows, confirm it's listed.
3. Export `.krama.json`, then import it back in (simulating a fresh session) and confirm
   the flow is byte-identical in content.
4. Duplicate a built-in flow, edit the copy, confirm the original is unchanged and still
   marked read-only.
5. Open the read view for a saved flow; confirm phase grouping and breath notation marks
   render; confirm the print stylesheet produces a clean page (Playwright: snapshot the
   print media query render, not a real printer).
6. Trigger the laterality warning (a one-sided bilateral pose) and the no-closing-
   stillness warning; confirm neither blocks saving.

### 1.3 `data-testid` contract

Every interactive element and every distinct content region a test needs to assert on
carries a `data-testid`. Naming: `{area}-{element}`, kebab-case, stable across redesigns
(rename the visible label, not the testid, when only copy changes).

| Area | testid | Element |
|---|---|---|
| Home | `home-todays-flow` | Card linking to the last-opened flow |
| Home | `home-new-flow` | "New flow" entry point |
| Home | `home-builtin-{slug}` | Each of the three built-in flow cards |
| Compose | `compose-search-input` | Pose search field |
| Compose | `compose-add-pose-{slug}` | Add-to-flow action per search result |
| Compose | `compose-item-{index}` | Each flow item row, in order |
| Compose | `compose-item-measure-{index}` | Breaths/seconds toggle+input for an item |
| Compose | `compose-item-notes-{index}` | Per-item notes field |
| Compose | `compose-item-reorder-up-{index}` / `-down-{index}` | Button reorder controls |
| Compose | `compose-item-drag-handle-{index}` | Drag handle for pointer/touch reorder (buttons remain the keyboard/fallback path) |
| Compose | `compose-phase-{phase-id}` | Phase group container |
| Compose | `compose-layer-{layer}` | Layer chip (`simple`/`advanced`/`expert`/`custom`) |
| Compose | `compose-seam-{fromIndex}-{toIndex}` | Seam indicator between two adjacent items |
| Compose | `compose-total-duration` | Live total duration readout |
| Flows | `flows-list` | The saved+built-in list container |
| Flows | `flows-item-{id}` | Each flow row |
| Flows | `flows-duplicate-{id}` | Duplicate action |
| Flows | `flows-export-{id}` | Export `.krama.json` action |
| Flows | `flows-import` | Import action (file picker trigger) |
| Flows | `flows-delete-{id}` | Delete action (user-saved flows only) |
| Read | `read-phase-{phase-id}` | Phase section in the read view |
| Read | `read-item-{index}` | Each pose entry in the read view |
| Read | `read-breath-mark` | A breath-notation mark (↑ ↓ ~) — asserted for presence, not content |
| Poses | `poses-search-input`, `poses-category-filter`, `poses-card-{slug}` | Unchanged from the existing Poses tab |
| Poses | `poses-view-toggle-filter`, `poses-view-toggle-theme` | "By filter" / "By theme" view mode toggle chips |
| Poses | `poses-theme-section-{emotion-slug}` | Theme section heading + pose list, in "By theme" view |
| Poses | `poses-overlay` | Full-screen pose detail overlay outer container |
| Poses | `poses-overlay-close` | Close button on the pose detail overlay |
| Poses | `poses-detail-layer-{l}` | Detail depth chip (`simple`/`advanced`/`expert`/`custom`), on `/poses/{slug}` and in the overlay |
| Poses | `poses-detail-custom-field-{group}` | Field-group checkbox shown when the `custom` depth layer is active |
| Validator | `validator-warning-laterality`, `validator-warning-closing-stillness` | The two v0.1 warnings, wherever they render |
| Nav | `nav-home`, `nav-compose`, `nav-flows`, `nav-poses`, `nav-learn` | Five-tab nav (spec §3) |

This table is the source of truth; when a `data-testid` in code doesn't match a row here,
either the code or this table is wrong — fix whichever is stale, don't let them diverge.

## 2 · Beauty guardrails (operationalizing spec §10)

- No screen may set an accent color outside the single defined accent token. If a screen
  "needs" a second color, that's a signal to use weight/size/whitespace instead. The one
  exception: a fixed semantic palette on pose *content* (element, difficulty, nervous-
  system effect, tissue depth) — these describe data categories, not UI state, and don't
  count as a second UI accent. They must stay confined to those data badges/chips and
  never leak into buttons, links, or other interactive chrome.
- Stillness nodes (rebound-supine, constructive-rest, seated-stillness, savasana) render
  with reduced visual weight (lower contrast text, no accent) wherever they appear in a
  flow — never bolder than an active pose.
- Any transition/reorder animation MUST be ≤ 200ms and MUST NOT use a spring/bounce
  easing. If it looks playful, it's wrong for a 6am tool. Use the shared motion tokens in
  `globals.css` (`--duration-fast` 120ms, `--duration-base` 200ms, `--ease-standard`)
  rather than hardcoding new timing values.
- Dark mode is not an afterthought pass: every new component MUST be built against both
  the light and dark token sets before it's considered done, not "fixed later."
- The read view is the one screen every beauty tenet is graded against literally: before
  merging any change that touches it, open it on a phone-width viewport in dark mode and
  ask "would a teacher leave this open on her mat?" (spec §10.6). If the honest answer is
  no, the change isn't done.
