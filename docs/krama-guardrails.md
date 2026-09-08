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
| Flows | `flows-shared-link` | Link to `/flows/shared`, present only with ≥1 org (004 FR-024) |
| Share | `share-panel` | The sharing panel on a flow the teacher owns; absent when signed out or with no org |
| Share | `share-status` | Which org this flow is shared with, or that it is not shared |
| Share | `share-org-{orgId}` | Share with this organization |
| Share | `share-stop` | Stop sharing (FR-032) |
| Share | `share-caption` | The standing explanation of what stopping does and does not do |
| Share | `share-export` | Export a `.krama.json` with author-only notes removed (FR-029) |
| Share | `share-error` | A share or revoke the server refused |
| Shared | `shared-list` | The container for flows shared with this teacher |
| Shared | `shared-empty` | Nothing is shared yet |
| Shared | `shared-row-{flow-id}` | One shared flow |
| Shared | `shared-adopt-{flow-id}` | One-click duplicate into your own flows (FR-025) |
| Shared | `shared-open-{flow-id}` | Open the duplicate just made |
| Read | `read-phase-{phase-id}` | Phase section in the read view |
| Read | `read-item-{index}` | Each pose entry in the read view |
| Read | `read-breath-mark` | A breath-notation mark (↑ ↓ ~) — asserted for presence, not content |
| Read | `read-note-{index}` | A teacher's per-item note, when present. **Not** `read-item-note-*` — see the prefix rule below |
| Read | `read-unknown-pose-{index}` | Said once, beside an item whose `pose_slug` isn't in this build's library (FR-031) |
| Poses | `poses-search-input`, `poses-category-filter`, `poses-card-{slug}` | Unchanged from the existing Poses tab |
| Poses | `poses-view-toggle-filter`, `poses-view-toggle-theme` | "By filter" / "By theme" view mode toggle chips |
| Poses | `poses-theme-section-{emotion-slug}` | Theme section heading + pose list, in "By theme" view |
| Poses | `poses-overlay` | Full-screen pose detail overlay outer container |
| Poses | `poses-overlay-close` | Close button on the pose detail overlay |
| Poses | `poses-detail-layer-{l}` | Detail depth chip (`simple`/`advanced`/`expert`/`custom`), on `/poses/{slug}` and in the overlay |
| Poses | `poses-detail-custom-field-{group}` | Field-group checkbox shown when the `custom` depth layer is active |
| Poses | `poses-detail-energetic-direction` | Energetic-direction badge on pose detail — "Brahmana — building" (003 FR-012) |
| Poses | `poses-clear-all-filters` | Clear-all affordance in the filter panel — **drifted**: shipped in 001, added to this table in 003 |
| Poses | `poses-body-diagram` | Wrapper for the anatomy column on pose detail. Absent entirely when no anatomy category holds data (003 FR-017) |
| Poses | `body-diagram-tab-{muscles\|meridians\|joints\|chakras}` | Anatomy layer tab. Only rendered for categories holding data, and only when two or more do (003 FR-016) |
| Poses | `body-diagram-single-{category}` | Heading shown in place of the tab set when exactly one category holds data |
| Poses | `body-diagram-view-{front\|back}` | Front/back view toggle, sharing one control row with the tabs (003 FR-018) |
| Poses | `body-diagram-legend-{key}` | Legend entry, a `<button>` with `aria-pressed`. Key is the muscle group, meridian slug, `joint-{name}`, or `chakra-{name}` (003 FR-014) |
| Poses | `body-diagram-region-{id}` | A drawn, tappable shape in the SVG: a muscle region id, `meridian-{slug}`, `joint-{name}`(`-mirror`), or `chakra-{name}` (003 FR-013) |
| Poses | `body-diagram-depth-legend` | Superficial/deep encoding key — **drifted**: shipped in 001, added to this table in 003. Muscle layer only, because it explains a muscle encoding |
| Validator | `validator-warning-laterality`, `validator-warning-closing-stillness` | The two v0.1 warnings, wherever they render |
| Nav | `nav-home`, `nav-compose`, `nav-flows`, `nav-poses`, `nav-learn` | Five-tab nav (spec §3) |
| Account | `account-sign-in` | Header sign-in link, shown when there is no session |
| Account | `account-avatar` | Header initials monogram; opens the account menu (005 FR-063/064) |
| Account | `account-avatar-pending` | Fixed-size placeholder holding the avatar's space while the session resolves |
| Account | `account-menu` | The open dropdown panel |
| Account | `account-menu-name`, `account-menu-email` | Identity lines in the menu (non-interactive) |
| Account | `account-menu-settings` | Route to `/settings` |
| Account | `account-menu-sign-out` | Opens the sign-out confirmation |
| Account | `account-sign-out-dialog`, `account-sign-out-confirm`, `account-sign-out-cancel` | The confirmation dialog and its two actions |
| Auth | `auth-error` | Sign-in failure message |
| Auth | `auth-sign-in-google` | Google OAuth button |
| Auth | `auth-email-form`, `auth-email-input`, `auth-sign-in-email` | Email OTP form, field, submit |
| Auth | `auth-otp-sent` | Confirmation that a sign-in link was sent |
| Settings | `settings-index` | The section index (006 FR-002) |
| Settings | `settings-section-{id}` | Each section, `id` one of `profile`, `appearance`, `notifications`, `privacy`, `security`, `data`, `billing`, `orgs`, `studio` |
| Settings | `settings-profile-form` | Profile form container |
| Settings | `settings-display-name-input`, `settings-timezone-input` | Profile fields |
| Settings | `settings-timezone-detect` | One-click fix offering the browser's IANA zone |
| Settings | `settings-profile-save`, `settings-profile-saved`, `settings-profile-error` | Save action and its two outcomes |
| Settings | `settings-theme-{light,dark,system}` | Theme choice chips (006 FR-032) |
| Settings | `settings-email`, `settings-provider` | Read-only identity facts |
| Settings | `settings-claim-flows-reopen` | Re-entry point for a dismissed claim prompt |
| Settings | `settings-data-export` | Link to the per-flow `.krama.json` export on `/flows` |
| Settings | `settings-orgs-list`, `settings-org-{orgId}` | Membership list, present only with ≥1 org (006 FR-003) |
| Settings | `settings-org-new` | "Create an organization" entry point |
| Org | `org-new-form`, `org-new-name-input`, `org-new-type-{value}`, `org-new-error`, `org-new-submit` | Organization creation |
| Org | `org-members-list`, `org-member-row` | Roster |
| Org | `org-invite-form`, `org-invite-email-input`, `org-invite-role-select`, `org-invite-message`, `org-invite-submit` | Invitation form |
| Org | `invitation-accept-error` | Invitation acceptance failure |
| Onboarding | `onboarding-claim-flows`, `onboarding-claim-flows-claim`, `onboarding-claim-flows-decline` | One-time prompt to claim flows already on this device |

This table is the source of truth; when a `data-testid` in code doesn't match a row here,
either the code or this table is wrong — fix whichever is stale, don't let them diverge.

**No testid may be a prefix of another.** `[data-testid^="read-item-"]` is a normal thing
to write, and it matched `read-item-note-3` as well as `read-item-3` — a walk asserting
"every item carries a breath mark" counted 53 items where there are 34, and the failure was
read for three features as a content gap in the flow rather than an over-match in the
selector (see `FRICTION.md`, 2026-09-01 and the correction that follows it). That is why
the note testid is `read-note-{index}` and not `read-item-note-{index}`. When a new testid
would extend an existing one, give it a sibling name instead. One family still violates
this: `compose-item-{index}` is a prefix of `compose-item-measure-*`,
`compose-item-notes-*`, `compose-item-reorder-*`, and `compose-item-drag-handle-*`, which
is why `tests/e2e-qa/walk2-compose.spec.ts:22` carries a hardcoded index list instead of a
prefix selector. Renaming that family belongs to `004` US4.

**Deliberate renames.** The `/account` stopgap became `/settings` (006 FR-001), and its
testids moved with it: `account-page-email` → `settings-email`, `account-profile-*` →
`settings-profile-*`, `account-display-name-input` / `account-timezone-input` /
`account-timezone-detect` → `settings-*`, `account-orgs-list` / `account-org-{id}` /
`account-org-new` → `settings-*`. `account-email` and `account-orgs-empty` are retired
outright — the header email link became the avatar, and the empty-orgs case is now an
absent section rather than an empty one. The `account-*` namespace still exists, but it
now means the header element only.

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
