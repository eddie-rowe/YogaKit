# Settings & Profile

**YogaKit surface:** planned — spec 006 (no code yet; preferences currently scattered in localStorage)
**Status:** planned (spec 006)

## The interaction problem
A single settings shell must serve two very different readers with the same navigation: a solo user who wants three or four toggles and out, and a power/owner user who is managing people, integrations, and billing on top of their own profile. If the shell shows every section to everyone, the solo user drowns in irrelevant admin chrome; if it hides sections behind a mode switch, users lose a stable mental map of "where did that setting go." The fix is a scoped hierarchy — personal settings always render, organization/admin settings render only when an org context exists — with consistent placement so returning users don't re-learn the map each time their role changes.

## Best in class

### 1. Linear — web app, settings redesign shipped Dec 2024, still current structure in 2026
- **What they do:** Personal settings (Profile, Preferences, Interface & theme, Notifications, Linear Agent) live under the user's avatar and apply only to that person. A separate top-level split — Features, Administration, Your teams — holds workspace-scoped config; Administration (Members, Security, Integrations, API/OAuth, General/Deletion) is admin-only and visually distinct from personal preferences.
- **Why it works:** The account-vs-workspace boundary is structural (different menu entry points), not a toggle inside one flat list, so a non-admin never even sees an empty Administration section — it simply isn't in their menu.
- **Source:** https://linear.app/changelog/2024-12-18-personalized-sidebar and https://linear.app/docs/account-preferences

### 2. Slack — web/desktop, current in 2026
- **What they do:** Individual "profile & preferences" is edited by any member with no admin involvement. Workspace-level settings (member access, channels, emoji, apps) are gated to Owners/Admins. Enterprise Grid adds a third org layer above that, and any preference an org has locked shows a lock icon with an explanation rather than silently disabling the control.
- **Why it works:** Three tiers (personal → workspace → org) instead of two means the model scales to nested tenancy without collapsing distinct concerns into one settings page, and the lock icon turns "why can't I change this" into a legible, non-mysterious state.
- **Source:** https://slack.com/help/articles/360000355143-Review-your-workspaces-settings and https://trailhead.salesforce.com/content/learn/modules/org-and-workspace-settings-in-slack-quick-look/learn-about-policies-and-settings-in-slack

### 3. Notion — web app, current in 2026 (Enterprise admin console layer added in recent redesign)
- **What they do:** A workspace with only one member never surfaces Teamspaces, roles, or the Security/Danger-zone controls tied to multi-person settings — those sections are conditional on workspace size and plan, not just hidden behind a click. Enterprise customers get an entirely separate "Manage organization" console (General, People, Security, Data & Permissions, Analytics) reached via the workspace switcher, kept out of the everyday workspace-settings surface.
- **Why it works:** Settings visibility is driven by actual state (do you have teammates yet? are you on a plan with delegated roles?) rather than a static section list, so the simple case is genuinely simple, not just visually deprioritized.
- **Source:** https://www.notion.com/help/workspace-settings and https://www.notion.com/help/enterprise-admins

### 4. Google Account — myaccount.google.com, current in 2026
- **What they do:** Five stable top-level buckets (Security & sign-in / Password Manager / Data & privacy / People & sharing / Wallet & subscriptions) hold hundreds of underlying controls; a "Privacy Checkup" and "Security Checkup" wizard sits on top of the same settings as a guided, sequential alternative for users who don't want to browse the taxonomy. Workspace/org accounts layer administrator overrides on top without changing the personal page's shape.
- **Why it works:** A flat, memorable set of top-level nouns (not verbs, not org jargon) plus a guided-checkup escape hatch means both browsing and "just tell me what to check" users are served by the same underlying settings without a parallel UI.
- **Source:** https://support.google.com/accounts/answer/3118621 and https://safety.google/intl/en_us/settings/

## Cross-cutting patterns
- Personal settings (profile, appearance, notifications) always render for every account tier; org/admin settings render only when the relevant org context exists — the section list is a function of account state, not a fixed menu everyone sees dimmed or disabled.
- The personal/admin boundary is a navigation-level split (different top-level entry, different icon, sometimes a different route prefix like `/admin`), not a filter inside one long settings list — this is what lets a non-admin simply never notice the admin surface exists.
- Locked-but-visible settings (Slack's lock icon) beat silently-disabled or hidden settings when a setting exists but the current user can't change it — it explains the "why" instead of just removing the control.
- A guided/checkup entry point (Google) coexists with the browsable taxonomy for users who don't want to hunt through a big section list.
- Profile, appearance/theme, and notifications consistently sit first/near-top across all four exemplars — they're the settings nearly every user touches, regardless of tier.
- Danger-zone actions (delete workspace/account, deletion confirmation codes, cooling-off periods) are consistently isolated at the bottom of the admin-tier settings, never mixed into the frequently-touched personal section.

## Anti-patterns observed
- Settings sprawl: NextMove-style multiple disconnected settings routes with no shared index (explicitly what 006 is designed to avoid) forces users to remember which route holds which control.
- Admin-only sections that render empty or grayed-out for solo users still cost a scroll, a click, and a moment of "is this for me" confusion — visibility should be conditional on org state, not just permission-gated after being shown.
- A flat, unsearchable settings list becomes unnavigable once section count passes roughly 8-10 — none of the exemplars above rely on flat lists once they cross that threshold; they add either hierarchy (Linear, Slack) or a guided layer (Google).
- Read-only "policy mirrors" (Slack's personal read-only view of workspace settings) are useful for transparency but risk implying a second, editable path — the lock/explanation affordance matters more than the mirror itself.

## Fold into YogaKit
- **Section order for `/settings`:** Profile → Appearance → Notifications → Privacy (practice visibility) → Account & Security → Data export/delete → Billing → Org memberships → Studio (owner-only: employees, integrations). This puts the sections nearly every solo user touches first, matching all four exemplars. `spec 006`
- **Conditional rendering, not permission-dimming:** Org memberships section renders only if the user belongs to ≥1 org; the Studio section renders only if the user holds an owner/admin role in at least one org — both absent entirely (not grayed out) for a zero-org solo practitioner, mirroring Notion's state-driven visibility and satisfying solo-mode invisibility. `spec 006`
- **Privacy control lives in both places, same component:** Build the "who can see my practice" control as one shared component/route fragment, mounted both at `/settings/privacy` and inline on Today — settings is the second path, Today is the primary path, per the constitution's one-interaction requirement. Do not let the settings copy of the control drift from the Today copy. `needs decision` on whether Today's version is the full component or a link-out.
- **Studio surface as a visually distinct block:** Give the Studio section its own visual treatment (heading + a hairline separator + maybe a distinct icon) inside the same `/settings` route rather than a separate `/admin` route, since Linear/Slack keep admin controls in a different *menu location* but YogaKit's single-shell mandate argues for same-route, clearly-labeled separation instead. `needs decision`
- **Appearance toggle:** cookie-stored theme read by a pre-paint inline script in `<head>`, exactly as spec 006 already requires — this is standard practice for FOUC avoidance and doesn't need new research; implement as a quick win once the settings shell exists. `quick win` (once shell lands)
- **Migrate scattered localStorage keys** (`krama-compose-layer`, `krama-pose-detail-layer`, `krama-pose-detail-custom-fields`, `krama-claim-flows-decided`) into the Appearance/Preferences section's model rather than leaving them as orphaned per-surface state once `/settings` exists. `spec 006`
- **No settings search** at initial launch given the section count (~9) is still below the "unsearchable" threshold observed above; revisit if sections grow past ~10. `needs decision`

## Constitution check
- **Solo-mode invisibility:** Direct implication for section order above — Org memberships and Studio must be conditionally rendered on org membership/role, not just permission-gated content within an always-visible section, or a zero-org user sees org/teacher/seat language that shouldn't exist for them.
- **Privacy reachable in one interaction from Today:** Settings must not become the *only* discoverable path to "who can see my practice" — the shared-component approach above keeps Today's one-interaction path primary and settings as a secondary, consistent mirror, not a fork.
- **One-accent, typography-first design:** All four exemplars lean on hairlines, spacing, and text hierarchy rather than color-coding to separate personal from admin sections — compatible with YogaKit's constraint; avoid using a second accent color to mark the Studio section, use a label/divider instead.
- **FOUC-free theme toggle:** The appearance section's mechanism (pre-paint inline script + cookie) is spec-mandated already and is standard practice across the ecosystem — not independently re-verified against a specific 2026 exemplar here; flagged as **model knowledge**, not a searched claim.
- **≤200ms no-bounce motion:** No exemplar above was checked for its settings-panel transition timing; this is a YogaKit-specific constraint to apply during 006 implementation, not something drawn from research here — flagged as **not verified**, apply the existing motion system as-is.
