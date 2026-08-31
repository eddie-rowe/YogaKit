# Design Input: Daily Sadhana

**Feature**: `005-daily-sadhana` (not yet scaffolded)
**Created**: 2026-08-28
**Status**: Design input — consumed by `/speckit.specify`, not a specification
**Sources**: `docs/design-research/10-daily-checkin-journal.md`,
`docs/design-research/11-compassionate-streaks.md`,
`docs/design-research/12-return-rituals.md`,
`docs/design-research/13-contextual-guidance.md`,
`docs/design-research/14-privacy-consent-controls.md`,
`docs/design-research/15-cohort-signals-dashboard.md`,
`docs/design-research/20-navigation-ia.md`

## Scope anchor

Per the platform-pivot plan's "Step 2 — The five features": this is the feature with no
precedent to copy directly. It covers a versioned intention/sankalpa; a self-reported,
timezone-keyed daily check-in (date, duration, mood, optional note, optional linked flow);
non-punitive streaks (pause not reset, grace days, rest as a first-class recordable state);
return rituals (lapse detection → smaller-commitment re-entry); milestones and a practice
timeline; the `data/guidance/*.md` trigger corpus (never a browsable "Learn" tab); the
certifying-body cohort dashboard (signals only, never content); and the 5→3 navigation
restructure that makes Today the app's home screen. **Every string in this feature is
subject to the Principle VII copy-lint** — that is not optional review, it is CI-gating.

## Exemplars worth copying

| Pattern | App | Why it works |
|---|---|---|
| Insurance framing for a missed day, adapted, not copied | Duolingo | Proves loss-averse gamification can motivate without punishing — but its loss notifications and paid "Streak Revival" (2026) are the explicit anti-pattern to avoid |
| Explicit rest-logging as a distinct calendar state | Gentler Streak | Rest becomes a deliberate, visible choice instead of an inferred absence |
| Comeback/return framing with no missed-day counter | Apple Fitness+ "Comeback", Headspace | A lapse reads as a return, not a debt to repay |
| Gentle, pattern-based (not target-driven) contextual nudges | Oura | Matches the "invitation, never a warning" tone Principle VII requires |
| Revocable sharing named in plain language, one interaction deep | Apple Find My, Life360 | Makes a persistent visibility grant legible and easy to end, not just technically possible to end |
| Per-student signal-only dashboard rows with an explicit boundary caption | WHOOP Teams / corporate wellness pattern | Makes the content/signal line visible to the *viewer*, not just enforced server-side |

## Candidate UX requirements

- **UX-001**: The check-in interaction MUST default to one-tap mood selection (3–5 icons, no
  slider granularity) with duration inferred from a just-completed flow when available; note
  and flow-link MUST be optional and visually secondary to mood. *(source: 10; tagged `quick
  win` — ship this minimal version first, defer flow-link/duration auto-fill)*
- **UX-002**: The check-in entry point MUST display a permanent "only you can see this"
  microcopy directly beside the note/mood fields, not buried in settings. *(source: 10;
  tagged `spec 005`)*
- **UX-003**: The streak display MUST show a single always-positive number with no
  at-risk/red color state and no countdown to loss. *(source: 11; tagged `spec 005` —
  RULE-C1/C2 make this a hard requirement, not a style preference)*
- **UX-004**: A grace-budget indicator (e.g. "2 of 3 grace days available this month") MUST
  be calm and shown only on request (streak detail), never as a home-screen warning banner.
  *(source: 11; tagged `spec 005`)*
- **UX-005**: The practice-state model MUST support exactly three states —
  Practiced / Rested / silently-absent — where only the first two ever render as calendar
  chips; "Log rest" MUST be a one-tap action on Today, visually equal-weight to "Log
  practice," never smaller or grayed out. *(source: 11; tagged `spec 005` — RULE-C4)*
- **UX-006**: Milestones (10/30/90 practices) MUST render as a one-time congratulatory card
  with a forward invitation, never a badge with a defend/protect affordance. *(source: 11;
  tagged `spec 005` — RULE-C6)*
- **UX-007**: The intention/sankalpa MUST be stored as a versioned, append-only record so a
  return-ritual prompt can quote the version active when the lapse began. *(source: 12;
  tagged `spec 005`)*
- **UX-008**: The return-ritual card, triggered after the user's declared lapse threshold,
  MUST use the literal form: a plain statement of elapsed time, the quoted original
  intention, and two flat (non-hierarchical) actions — "Keep this why" / "Update my why" —
  neither styled as a warning. *(source: 12; tagged `spec 005` — this is the pivot plan's own
  acceptance criterion, verbatim: "You haven't completed a daily practice in two weeks, would
  you like to revisit your 'why'?")*
- **UX-009**: The smaller-commitment offer inside a return ritual MUST default to the single
  smallest unit the pose model already supports (one pose or one breath-cycle from the
  sankalpa's original flow) — never a prompt to "catch up" on the missed period. *(source: 12;
  tagged `spec 005` — RULE-C3)*
- **UX-010**: The return-ritual card MUST include "I'm resting, not stopping" as a selectable
  response alongside the re-entry offer, so the prompt is never a binary of practice-or-ignore.
  *(source: 12; tagged `spec 005`)*
- **UX-011**: Each `data/guidance/*.md` entry MUST be gated on exactly one named trigger
  (e.g. `first-flow-saved`, `7-day-streak`, `14-day-lapse`); Today MUST render at most one
  guidance card, ever, selected by trigger priority — never a list. *(source: 13; tagged
  `spec 005`)*
- **UX-012**: A lapse-triggered guidance card's copy MUST give one clear next action with no
  missed-day counter and no reset-to-zero visual. *(source: 13; tagged `spec 005`)*
- **UX-013**: A guidance entry MUST NOT carry an unread badge, count, or persistence queue —
  once shown or dismissed, the trigger is consumed; a re-trigger may resurface a different
  card, never a backlog. *(source: 13; tagged `spec 005`)*
- **UX-014**: Today MUST display a "Shared with [Org Name]" pill whenever
  `cohort_enrollments.share_signals` is true for the active enrollment; tapping it MUST open
  a sheet listing exactly what is shared, in plain language, before offering the single
  "Stop sharing with [Org Name]" action. *(source: 14; tagged `spec 005` — RULE-V3/V6)*
- **UX-015**: If a user belongs to more than one cohort/org, the sharing control MUST be
  scoped per-enrollment (one pill/toggle per org) — never a single global sharing toggle.
  *(source: 14; tagged `spec 005`)*
- **UX-016**: Revoking sharing MUST flip `cohort_enrollments.share_signals` to `false` as a
  direct, single write — no soft "hidden" flag, no derived permission. *(source: 14; tagged
  `quick win` once this feature's UI ships, since the column already exists from `002`)*
- **UX-017**: The cohort dashboard MUST render, per student: name, a non-punitive status pill
  (practicing/lapsed using RULE-C2-safe vocabulary, no "at risk" red flags), streak state,
  days since last check-in, and milestone progress — with no note/mood/journal field ever
  queried by the component, not merely hidden by CSS. *(source: 15; tagged `spec 005` —
  RULE-V1/V2/V5)*
- **UX-018**: The cohort dashboard MUST display a persistent one-line caption stating the
  content/signal boundary in plain language (e.g. "Signals only. Journal and reflections are
  private to each student and are never shared."). *(source: 15; tagged `spec 005`)*
- **UX-019**: The primary navigation MUST collapse from five tabs to three (Today, Teach,
  Poses), with the avatar rendered as a standalone header element (not a fourth nav-array
  entry) and sized to the same 44px+ touch target as the other tabs; `/compose` and `/flows`
  MUST merge under a single "Teach" destination. *(source: 20; tagged `spec 005`)*

## Constitution constraints binding this feature

- **Principle VII (RULE-C1–C6)**: binding on every string and every interaction listed above
  — UX-003/004/005/006/008/009/010/012/013 all exist specifically to satisfy one or more
  RULE-C* rule. This is the feature's primary constitutional surface.
- **Principle VIII (RULE-V1–V6)**: UX-014–018 implement the content/signal split — UX-017's
  "never queried, not merely hidden" is the concrete form of RULE-V2's requirement that a
  schema reviewer verify the boundary by inspecting table structure alone, not application
  code. UX-014/015/016 implement RULE-V3/V4/V6's one-interaction, per-enrollment, plain-
  language revoke requirement.
- **RULE-V5**: this feature must ship the CI test asserting a cohort-teacher-role query
  against practice-content tables returns zero rows or permission-denied for an enrolled
  student — a design requirement, not just an implementation detail, since the dashboard
  (UX-017) is meaningless without it being provably true.
- **Guardrails §1.3 (testid contract)**: UX-019's nav collapse retires
  `nav-home|compose|flows|poses|learn` — an accepted exception requiring all affected
  Playwright smoke-walk tests updated in the same commit, per the platform-pivot plan.

## Open decisions

| # | Decision | Recommended default | Why | Status |
|---|---|---|---|---|
| 1 | How does a user checking in at night for a session finished after midnight get attributed to the correct local day, without allowing arbitrary backdating? | Attribute to the local day the check-in *action* occurs on, with a single "log for yesterday" affordance visible only within a short window (e.g. same login session, before the next check-in) — no free-form date picker. | Free-form backdating opens gaming/misuse of streak state; a narrow, time-boxed exception covers the legitimate late-night case without it. | Open |
| 2 | Is a derived "practiced today" signal ever exposed to cohort teachers, distinct from the mood/note UI? | Yes, as a single checkmark/dot on the dashboard (UX-017), structurally separate from the check-in component tree. | This is already the dashboard's job (signals only); the decision is just confirming it's a boolean derived from check-in existence, not from check-in content. | Open |
| 3 | Does any streak repair/undo mechanic exist? | No — skip it entirely. | Because the streak never zeroes (RULE-C1), there is nothing to "repair"; adding a repair mechanic (paid or free) would import the exact monetization-of-guilt anti-pattern this feature is designed to avoid. | Open — recommend closing as "will not build," not merely deferred |
| 4 | Is the grace-budget window/size (N misses per trailing period) user-configurable or fixed? | Fixed at launch, with the number itself stored as data (not hardcoded in UI copy) so it can change without a copy-lint re-review. | A configurable grace budget is more product surface than this feature needs at launch; keeping the number as data (not embedded prose) gets most of the future flexibility for free. | Open |
| 5 | Should the richer "on this day" memory-echo (surfacing a past check-in note from the version-matched lapse period) ship in this feature, or only the copy-only "quote the sankalpa" version? | Ship copy-only (quote the sankalpa) now; defer the memory-echo. | The memory-echo depends on the journal/note data model this same feature is defining — sequencing it after the core return-ritual ships avoids a circular dependency within one feature. | Open |
| 6 | Exact tone guide for guidance-card copy: gentle/pattern-based (Oura) vs. target-driven (WHOOP)? | Gentle, pattern-based. | Target-driven tone reads as a goal to fall short of, which cuts against Principle VII's invitation-not-threshold stance more directly than pattern-based framing does. | Open — needs a short copy style note before content authoring |
| 7 | When multiple guidance triggers fire simultaneously, is priority an authored static field per entry, or computed (most-recent-event-wins)? | Authored static priority field in the frontmatter. | A static field is inspectable and testable at CI time; computed priority based on recency could surface a low-value entry over a more important one purely by timing. | Open — affects the `data/guidance/*.md` frontmatter schema |
| 8 | Does "Stop sharing" (UX-014) need an undo toast instead of a blocking confirm dialog? | A single undo toast (5–8s window), no blocking confirm. | A blocking confirm dialog adds friction to a privacy-protective action, which is the wrong direction to add friction in; an undo toast keeps the action reversible without slowing down the person exercising it. | Open |
| 9 | At cohort enrollment time, should the exact fields that will become visible (streak, last-practice date, milestones) be disclosed before `share_signals` defaults to true? | Yes — but this is blocked on the enrollment/join UI not existing yet (`002` created the column, not the flow). | Disclosure before a default-on grant is the more honest sequencing; if the enrollment UI ships in a later slice of this feature, disclosure should ship in the same slice, not after. | Open — blocked on enrollment UI scope |
| 10 | Does per-student named dashboard rows (UX-017) still hold if a later feature introduces org-admin-level cross-cohort aggregate reporting? | Yes for this feature's scope; revisit only if `006` or a later feature adds cross-cohort aggregation. | At YogaKit's current scale (one certifying-body customer), named per-student rows are the right granularity; aggregation is a different feature's problem when it arrives, not a reason to hedge this one's design now. | Open |
| 11 | Does `/learn` survive as an unlinked route reachable from a Today card, or does its content fold directly into Today's page? | Retire `/learn` as a route; fold its content into the card/index that Today surfaces. | Keeping a live-but-unlinked route invites content to drift stale in a place nobody checks; folding it into Today's own surface keeps one place to maintain. | Open |
| 12 | Does the header avatar show initials/a silhouette placeholder for a solo/anonymous user who never set a profile image? | Yes, an initials-based placeholder. | A blank or broken-image avatar reads as an error state; initials are the standard placeholder and require no additional asset. | Open |
| 13 | What are the exact accent color and motion-duration tokens for the "Stop sharing" undo toast (UX-014/#8)? | Reuse the existing single accent and the ≤200ms motion budget already governing the rest of the app — no new token. | This is a design-system detail, not a UX-research question; deferring it to whoever implements the toast avoids introducing a token that only this one component uses. | Open — deferred to implementation, not a product decision |

## Testid contract impact

UX-019's nav collapse is the significant one: `nav-home`, `nav-compose`, `nav-flows`,
`nav-poses`, `nav-learn` all retire. Per the platform-pivot plan, this requires updating the
guardrails §1.3 testid table and all affected Playwright smoke-walk tests **in the same
commit** as the nav change — not as a follow-up.

## Already-tracked quick wins touching this surface

- **UX-001** and **UX-016** above are themselves scoped as `quick win`-tagged minimal
  versions within this feature — restated here rather than duplicated as separate items.
- Draft the RULE-C3 lapse-response copy (UX-009's tone) as static text and run it against the
  banned-phrase copy-lint before any UI work begins, so the lint has something to validate on
  day one.
