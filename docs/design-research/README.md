# Design Research: Best-in-Class UI/UX Per Feature

Twenty-one reports, one per YogaKit feature (differentiator or table-stakes), each naming
the top best-in-class 2026 apps for that specific interaction problem — deliberately
weighted toward strong apps *outside* yoga/fitness whenever a non-yoga app solves the
problem better (per explicit steering: exemplars should be popular/successful/feature-
focused apps first, yoga-specific only when genuinely the best fit). Produced by a 21-agent
research fan-out; each report is independently sourced with cited URLs and flags any claim
that rests on model knowledge rather than a verified search result.

Use this as design input for specs 003–006 and for a polish pass on what already ships.
Nothing in `src/` was changed by this research — see each report's own "Fold into YogaKit"
section for concrete, file-path-specific proposals, each tagged `quick win` / `spec 00X` /
`needs decision`.

## Index

### Differentiators

| # | Feature | Status | Top 3 exemplars | Takeaway |
|---|---|---|---|---|
| [01](01-friction-seams.md) | Friction seams | built | Descript, Adobe Premiere, AudioMass | Encode the transition cost *at the seam itself*, as the literal measurement, not a label beside it. |
| [02](02-advisory-warnings.md) | Advisory warnings | built | Grammarly, Figma a11y tooling, VS Code/Error Lens | Warnings live at the site of the problem, in a visual tier that never lies about whether it blocks, with a durable "quiet this" action. |
| [03](03-progressive-depth-layers.md) | Progressive depth layers | built | Oura Ring, Notion database views, Adobe Lightroom mobile | Depth control sits at the content itself, and "custom" is a first-class saved preference, not a temp toggle. |
| [04](04-pose-detail-anatomy.md) | Pose detail & interactive anatomy | built | Muscle Map, MuscleWiki, Visible Body Human Anatomy Atlas 2026 | One shared silhouette across overlay modes; intensity via color *value*, category via hue; empty layers collapse rather than render blank. |
| [06](06-theme-mood-browsing.md) | Theme/mood browsing | built | Spotify Mood/Prompted Playlists, Headspace Ebb, Calm feelings-wheel check-in | Mood is a second, equal-weight lens on the same catalog — small curated taxonomy, one-tap entry, never a diagnostic intake. |
| [08](08-phase-arc-structure.md) | Phase / arc structure | partial (real spec gap) | Hevy, Ableton Live, Linear | Section labels are typographic, never boxes; a running total lives in the header itself; membership is a property of the item, not a rigid container. |
| [09](09-mat-side-read-view.md) | Mat-side read view (6am test) | built (real gap: breath text not glyphs) | The Kitchn Cook Mode+, Teleprompter.com/PromptSmart Pro, Waking Up | Wake-lock-and-forget, one current thing always in the same slot, all configuration front-loaded before the activity starts. |
| [11](11-compassionate-streaks.md) | Compassionate streaks | planned (005) | Duolingo (adapt insurance framing, reject loss mechanics), Gentler Streak, Finch | Recoverability must be structural (a real mechanic), not just softer copy — and YogaKit's pause-never-zero model is stricter than every exemplar found. |
| [12](12-return-rituals.md) | Return rituals | planned (005) | Headspace, Stryd Pause & Resume, Apple Fitness+ "Comeback", Day One "On This Day" | Anchor return to the user's own past voice/intention, size the re-entry ask *down* as the gap grows, never "catch up." |
| [13](13-contextual-guidance.md) | Contextual guidance | planned (005) | Duolingo (trigger-gated), Superhuman (just-in-time), Oura (single score, no queue), NN/g "pull revelation" | Guidance attaches to an event/state trigger and shows exactly one item, never a browsable archive or a badge count. |
| [14](14-privacy-consent-controls.md) | Privacy & consent controls | planned (005/006) | Apple Find My, Life360, Apple Health sharing | Revoke lives on the screen where sharing is reviewed, names the specific relationship, and is a real deletable row — never a settings-buried flag. |
| [15](15-cohort-signals-dashboard.md) | Cohort signals dashboard | planned (005) | WHOOP Teams, Duolingo for Schools, Peloton "Note to Self" | The content/signal split is decided once at the data layer and never renegotiable through a later UI setting; the boundary must be visible to the viewer too. |
| [21](21-portability-export-share.md) | Portability, export & share | export/import built; sharing planned (004) | Obsidian, VS Code Settings Sync, Notion share/duplicate | Native/inspectable format + typed refusal on migration failure beats silent best-effort import; sharing-a-copy and exporting-your-data are two different affordances. |

### Implicit / table-stakes features

| # | Feature | Status | Top 3 exemplars | Takeaway |
|---|---|---|---|---|
| [05](05-catalog-search-filter.md) | Catalog search & filter | built | Airbnb, AllTrails, NYT Cooking | Persistent result count and live numeric readouts on every slider are load-bearing; multi-select chips need a non-color signal distinct from single-select. |
| [07](07-sequence-composer.md) | Sequence composer | built, monolithic | Notion, Typeform, Google Docs (+Spotify/Trello anti-patterns) | Drag always needs a non-drag fallback; save state should be ambient, continuously-true text, not just a button label. |
| [10](10-daily-checkin-journal.md) | Daily check-in & journal | planned (005) | Daylio, Oura, Apple Health "State of Mind" | The required path is one gesture with zero typing; forgiveness/optional depth must be pre-provisioned and visually subordinate. |
| [16](16-auth-onboarding-claim.md) | Auth, onboarding & local-data claim | built; no sign-out/account UI | Excalidraw auto-import, Linear (magic-link + code fallback), Anytype | Ask explicitly, never assume — and a bare magic link with only one recovery path is now considered incomplete. |
| [17](17-billing-paywall.md) | Billing & paywall | schema only | Linear, Stripe Customer Portal, Figma unbundled seats | Gate ceiling (volume/seats), never core workflow or data the user already owns; entitlement checks must never misfire against someone who already has access. |
| [18](18-offline-sync-pwa.md) | Offline sync & PWA | partial | Linear (threshold-gated sync), Google Docs, Obsidian Sync | Durable local write happens before any network attempt; sync UI is state-gated, not permanently visible, and never a spinner with no resolved state. |
| [19](19-settings-profile.md) | Settings & profile | planned (006) | Linear, Slack, Notion, Google Account | Personal settings always render; org/admin sections render only when that context exists — a navigation-level split, not a permission-dimmed filter. |
| [20](20-navigation-ia.md) | Navigation & IA | 5-tab built; 3-tab planned (005) | MyFitnessPal "Today" consolidation, Google Health, Instagram | Tab count is elastic to actual feature surface; account/settings moves to a header avatar only when it's genuinely low-frequency. |

*Reports 02, 03, 04, 06, 08, 09, 11–15, 21 above are re-listed under Differentiators; 05, 07,
10, 16–20 under table-stakes, matching the feature inventory this research was scoped from.
(Report numbering follows the original fan-out batches, not a strict differentiator/table-
stakes split — see each file's own header for its precise surface and status.)*

## Cross-cutting synthesis

Patterns that recurred across a majority of the 21 reports, independent of domain:

1. **The affordance lives at the site of the problem, not beside it.** Descript's transition handle sits at the seam; Grammarly's underline sits in the text; Apple Find My's revoke sits on the person's row. Nothing routes the user to a separate settings screen to act on something they're already looking at.
2. **Depth and detail are progressive, opt-in, and never destructive to the simple case.** Oura's drill-down, Notion's saved view properties, Linear's org-settings-only-when-org-exists, VS Code's granular sync scoping — the "simple" tier is never a lesser copy of the data, only a deferral of secondary fields.
3. **Streak/lapse/return mechanics that are structurally non-punitive beat mechanics that are merely gently worded.** Gentler Streak and Finch remove the failure state; Duolingo's freeze/repair only *patches* a punitive base mechanic (visible chain resetting to zero) that YogaKit's constitution rules out at the model level, not just in copy.
4. **Revocation and cancellation must be at least as easy to find as the thing that was granted, and must have a real, observable, immediate effect.** Apple Health deletes already-shared data on revoke; Stripe's portal is self-serve with no support ticket; WHOOP puts the off-switch on the data owner's own app regardless of the recipient's cooperation.
5. **Sync/save state is ambient, threshold-gated, and honest about being "in flight" vs. "failed" vs. "done."** Google Docs' three-state indicator, Linear's backlog-gated "Syncing," Obsidian's visible conflict files — the failure mode every exemplar designs against is a spinner or button label that can lie.
6. **Guidance and mood/theme entry points show exactly one thing at a time, gated by a trigger or a stateless lens — never a feed, badge count, or browsable archive.** Superhuman's just-in-time shortcut reveal, Oura's single score, Spotify's mood-as-lens-not-silo all avoid the two failure modes of a standing FAQ (goes stale, unread) and a notification feed (becomes homework).
7. **The person being observed (by a teacher, a coach, an employer) always sees the exact boundary of what's shared, named specifically, before or at the moment sharing starts.** WHOOP's pre-join disclosure, Life360's per-Circle naming, Peloton's structurally separate private-notes table all treat "vague sharing" as the anti-pattern, not an acceptable default.
8. **Money and access logic gates ceiling/features, never a user's own already-owned content or data.** Linear gates volume not workflow; Figma unbundles seat type from feature access; the Spotify "you already own this" misfire is cited repeatedly as the canonical failure to design against structurally (fresh entitlement resolution, not cached-for-enforcement checks).

## Prioritized quick wins

Pulled from every report's "Fold into YogaKit" section, `quick win`-tagged only, roughly
ordered by leverage (small effort, real user-facing improvement):

1. **Render breath marks as glyphs (↑ ↓ ~), not text strings**, in `ReadView.tsx`'s `breathMark()` — the single concrete spec-vs-code gap in the mat-side read view, and a pure typography change. (09)
2. **Tighten `BodySvg.tsx`'s `transition: opacity 0.3s` to ≤200ms** — a direct motion-budget violation already in shipped code. (04)
3. **Add a top-level "Clear all filters" next to the search bar** whenever any filter is active, independent of the Advanced panel being open, in `PosesClient.tsx`. (05)
4. **Audit `PosesClient.tsx` Advanced-panel chip touch targets** (`px-2 py-0.5`) against the ≥40px guardrail — the most concrete possible touch-target violation surfaced across all 21 reports. (05)
5. **Distinguish `.kk-warning`'s advisory styling from `compose-save-error`** so a real save failure and a craft note never render identically. (02)
6. **Add a persistent depth legend near the anatomy SVG** (superficial-fill vs. deep-outline) so the existing convention doesn't require the reader to infer it. (04)
7. **Surface `schema_version` / `exported_at` near the export button** in `FlowsClient.tsx` — the file already carries this data, it just isn't shown. (21)
8. **Add a `syncState` field (`synced | pending | failed`) to `flow-store.ts` records now**, ahead of any sync-status UI, so the write path already distinguishes these states. (18)
9. **Add a sign-out control and minimal account surface** — there is currently no way to sign out anywhere in the app. (16)
10. **Retire `/learn` as a nav destination once its content has a home elsewhere** — a route removal with no design work required. (13, 20)

## Real implementation gaps this research surfaced (unprompted, worth tracking)

- `ReadView.tsx` renders breath cues as numeric text, not the spec-mandated glyph notation. (09)
- `BodySvg.tsx`'s 300ms opacity transition exceeds the app's own ≤200ms motion ceiling. (04)
- The built phase-structure implementation is missing the duration-sum badge, intent tag, and collapse behavior the full v0.1 spec calls for. (08)
- `PosesClient.tsx` Advanced-panel chips may fall under the 40px touch-target guardrail. (05)
- `flow-store.ts` has no observed sign-out hook clearing IndexedDB — a potential shared-device data leak once auth ships fully. (18)
- There is no sign-out control or account surface anywhere in the app today. (16)
- `.kk-warning` is currently shared between an advisory craft note and a hard save-error state. (02)

## Constitution-adjacent flags raised across reports

- Several planned features (14, 15) depend on the `cohort_enrollments.share_signals` column already existing from spec 002 — the UI work is real but small once built, since the schema is ahead of the interface.
- Report 11 concludes YogaKit's planned streak model (pause, never zero) is *stricter* than every competitive exemplar found, including the ones held up as the industry's gentlest examples — worth stating plainly to product, not just treating as a research footnote.
- Report 17 crystallizes the fail-open-on-read / fail-closed-only-on-new-feature-writes principle as the correct generalization of RULE-O6/O7 to billing specifically — recommended as an explicit engineering rule, not just a design intent.
- Report 21 flags that shared/exported `Flow` objects don't yet separate structural data from author-only content at the type level — a real risk once spec 004 sharing ships, independent of any RLS enforcement on the server side.

## Verification

- `docs/design-research/` contains this index plus all 21 numbered reports (01–21, no gaps).
- Every report follows the shared 7-section template with 3+ cited exemplars and a file-path-specific "Fold into YogaKit" section.
- Every report includes an explicit flag distinguishing verified-via-search claims from model-knowledge synthesis.
- No report proposes a change without naming its own tension (if any) with the constitution in its final section.
