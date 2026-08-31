# Design Input: Profile & Settings

**Feature**: `006-profile-settings` (not yet scaffolded)
**Created**: 2026-08-28
**Status**: Design input — consumed by `/speckit.specify`, not a specification
**Sources**: `docs/design-research/03-progressive-depth-layers.md`,
`docs/design-research/14-privacy-consent-controls.md`,
`docs/design-research/16-auth-onboarding-claim.md`,
`docs/design-research/17-billing-paywall.md`,
`docs/design-research/19-settings-profile.md`

## Scope anchor

Per the platform-pivot plan's "Step 2 — The five features": one `/settings` shell with
sections — profile (display name, avatar, timezone, pronouns), appearance/theme
(cookie-based, pre-paint, per the NextMove reference pattern), notification preferences,
privacy controls (the "who can see my practice" surface from Principle VIII), account
security, data export/delete, a billing entry point, and an org memberships list — plus a
studio-owner surface (their org, employee list, integration connections). This replaces
NextMove's fragmented, indexless settings pattern with one shell.

## Exemplars worth copying

| Pattern | App | Why it works |
|---|---|---|
| Personal settings always render; org/admin settings render only when org context exists | Linear | A non-admin never even sees an empty admin section — it isn't in the menu at all |
| Locked-but-visible settings with a plain-language "why" | Slack | Turns "why can't I change this" into a legible state instead of a mystery |
| Settings visibility driven by actual account state, not a static list | Notion | The simple case (solo user) stays genuinely simple, not just visually deprioritized |
| A guided checkup wizard coexisting with the browsable settings taxonomy | Google Account | Serves both "I want to browse" and "just tell me what to check" users from one underlying model |
| Code-paste fallback alongside a magic link | Linear | A second recovery path when the email link doesn't arrive or opens on another device |

## Candidate UX requirements

- **UX-001**: `/settings` MUST present sections in this order: Profile → Appearance →
  Notifications → Privacy (practice visibility) → Account & Security → Data export/delete →
  Billing → Org memberships → Studio (owner-only). *(source: 19; tagged `spec 006`)*
- **UX-002**: The Org memberships section MUST render only if the user belongs to at least
  one organization; the Studio section MUST render only if the user holds an owner/admin
  role in at least one organization — both absent entirely, not grayed out, for a zero-org
  solo practitioner. *(source: 19; tagged `spec 006`)*
- **UX-003**: The "who can see my practice" privacy control MUST be built as one shared
  component/route fragment, mounted both at `/settings/privacy` and inline on Today (the
  primary, one-interaction-deep path per RULE-V6) — the two must never carry different copy
  or drift out of sync. *(source: 19; tagged `needs decision` on the exact mounting
  mechanism, see Open decisions)*
- **UX-004**: The appearance/theme toggle MUST be implemented as a cookie-stored value read
  by a pre-paint inline script in `<head>`, avoiding a flash-of-incorrect-theme on load.
  *(source: 19; tagged `quick win` once the settings shell exists)*
- **UX-005**: The four currently-orphaned localStorage keys (`krama-compose-layer`,
  `krama-pose-detail-layer`, `krama-pose-detail-custom-fields`, `krama-claim-flows-decided`)
  MUST be migrated into the Appearance/Preferences section's model rather than left as
  per-surface orphaned state once `/settings` exists. *(source: 19; tagged `spec 006`)*
- **UX-006**: The pose-detail "custom" field checklist MUST support naming and reusing a
  saved preset, rather than one anonymous slot. *(source: 03; tagged `spec 006`)*
- **UX-007**: The email-OTP sign-in flow MUST offer a resend affordance, and SHOULD add an
  OTP-code paste fallback for the case where the link opens on a different device than the
  one that requested it. *(source: 16; tagged `quick win` for resend, `spec 006` for the
  code-paste fallback)*
- **UX-008**: The "Not now" decision on the local-flows claim prompt (currently a permanent
  `localStorage` flag with no way back) MUST have a re-entry point somewhere in the account
  surface so a user can revisit and claim their local flows later. *(source: 16; tagged
  `spec 006`)*
- **UX-009**: Sign-in and sign-out entry points MUST be discoverable from the app's primary
  navigation (the header avatar per `005`'s nav restructure), not only reachable by direct
  navigation to `/auth/sign-in`. *(source: 16; tagged `spec 006` — depends on `005`'s avatar
  element existing)*
- **UX-010**: Re-granting cohort signal sharing after a revoke (re-enrollment or a fresh
  opt-in) MUST be an equally explicit, named action on the long-term profile/org-memberships
  surface — never implicit reactivation. *(source: 14; tagged `spec 006`)*
- **UX-011**: The "Manage billing" entry point (a Stripe Customer Portal redirect, no custom
  UI) MUST be placed within the Account & Security or Billing section of `/settings`, per the
  section order in UX-001. *(source: 17; tagged `spec 006` for placement — the Stripe surface
  itself is `002`'s scope)*
- **UX-012**: Claiming local flows into an account MUST always be an explicit, visible
  confirmation step — the system MUST NOT silently auto-adopt local `IndexedDB` flows into a
  newly-authenticated account with no user-facing acknowledgment of what was claimed.
  *(source: 16; tagged `needs decision`, see Open decisions — the explicit anti-pattern
  reference is a 2026 whiteboard-tool regression where silent auto-claim merged the wrong
  local session into an account)*

## Constitution constraints binding this feature

- **Principle VIII / RULE-V3, V6**: UX-003 is the concrete implementation of "reachable in
  one interaction from the primary practice screen, and not only from settings" — settings
  is explicitly the *secondary*, not primary, path for the privacy control.
- **RULE-L3/L4**: none of this feature's settings may require re-authentication to view
  personal preferences that are already cached — settings itself does not introduce a new
  read-gate on cached data.
- **Guardrails §2 (one accent, typography-first)**: the Studio section's visual distinction
  from personal sections (UX-001's ordering) should use spacing/hairlines/labels, not a
  second accent color, matching how all five research exemplars separate personal from admin
  scope typographically rather than chromatically.
- **RULE-O7**: any billing-related copy surfaced in settings (UX-011) must state what is and
  isn't gated in plain language, consistent with the fail-open-on-read/fail-closed-on-write
  rule `002` already establishes — settings doesn't re-derive that rule, just surfaces it.

## Open decisions

| # | Decision | Recommended default | Why | Status |
|---|---|---|---|---|
| 1 | Is Today's privacy control (UX-003) the full shared component, or a link-out to `/settings/privacy`? | The full shared component, inline on Today. | RULE-V6 requires the revoke control be reachable in one interaction from the primary practice screen — a link-out adds a second interaction (tap the link, then act), which is arguably non-compliant; embedding the real component keeps it a single tap. | Open |
| 2 | Should the Studio section live inside `/settings` (its own visually distinct block) or as a separate `/admin` route? | Same route (`/settings`), a distinct visually-separated block. | The product's single-settings-shell mandate (replacing NextMove's fragmented routes) argues for one shell; Linear/Slack's separate-menu-location pattern doesn't map cleanly onto a "no settings sprawl" constraint this product has explicitly chosen. | Open |
| 3 | Is settings search needed at initial launch? | No — the section count (~9) is below the ~8–10 threshold where flat lists become unnavigable in the research. | Adding search now is speculative; revisit if the section count grows past ~10. | Open |
| 4 | For UX-012, does the confirmation step show a full list of what will be claimed, or just a count with a review link? | A full list (flow names, count) inline in the confirmation prompt, not just a count. | The whole point of avoiding silent auto-claim is legibility; a bare count ("3 flows will be claimed") still asks for a leap of faith the same way a silent claim does, just with an extra click first. | Open |
