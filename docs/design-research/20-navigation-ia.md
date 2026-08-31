# Navigation & Information Architecture

**YogaKit surface:** `src/components/layout/AppHeader.tsx` (single source for both the `sm`+ text nav and the mobile bottom tab bar), `docs/krama-guardrails.md` §1.3 (testid contract), routes `/`, `/compose`, `/flows`, `/poses`, `/learn`
**Status:** current 5-tab nav built; 3-tab restructure planned (spec 005)

## The interaction problem
Primary navigation has to compress everything a user might do into a small, always-visible set of destinations — but every additional tab competes for thumb reach and attention, and account/settings rarely belongs at that level since it's low-frequency and identity-scoped rather than activity-scoped. Apps that launch with 4-5 tabs routinely discover that one or two are rarely tapped, or overlap with another (a "learn" or "explore" tab bleeding into "home"), and the fix is almost always the same: collapse to 3-4 activity-centered destinations and relocate account/settings to a header avatar, which reads as "who I am" rather than "where I go."

## Best in class

### 1. MyFitnessPal — iOS/Android, 2026 rollout, replaced its dashboard with a single "Today" tab
- **What they do:** Consolidated logging (meals, water, exercise, weight) that used to require jumping between screens into one "Today" home tab, with navigation updated app-wide around it.
- **Why it works:** One activity-anchored home destination absorbs what used to be scattered across multiple tabs/dashboards, reducing the decision of "which tab has what I need today."
- **Source:** https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Introducing-the-brand-new-Today-tab

### 2. Google Health (formerly Fitbit app) — Android/iOS, migrated May 2026
- **What they do:** Reorganized into as few as 2 tabs (Today, Health) for users without a connected wearable, 4 for those with one (Today, Fitness, Sleep, Health). Account settings live behind the profile picture in the header, not a tab: "tap your profile picture, then tap [app] settings."
- **Why it works:** Tab count flexes to the user's actual feature surface (fewer tabs for a smaller feature set) while account/settings stays in a fixed, predictable header slot regardless of how many activity tabs exist.
- **Source:** https://support.google.com/fitbit/answer/17068213?hl=en-GB

### 3. Duolingo — iOS/Android, "core tabs" redesign, Feb 2026
- **What they do:** Refreshed the bottom tab bar for visual cohesion and moved secondary features (Quests, Practice Hub for subscribers) into dedicated tabs rather than burying them in menus, while keeping the profile/avatar icon in the bar as its own tappable destination.
- **Why it works:** Shows the counter-case worth flagging: Duolingo keeps profile *in* the tab bar rather than a header avatar. It works for them because profile is a high-frequency destination (streak, gems, social) in their retention loop — a reminder that "avatar in header vs. avatar as tab" should follow how often the account surface is actually visited, not just convention.
- **Source:** https://blog.duolingo.com/core-tabs-redesign/

### 4. Instagram — iOS/Android, navigation update rolled out late 2025 into 2026
- **What they do:** Removed the Create (+) button from the bottom tab bar entirely and moved it to a header corner icon, keeping the bottom bar limited to Home, Reels, DMs, Search, Profile.
- **Why it works:** Demonstrates the general move being asked about here — pulling a lower-frequency or cross-cutting action out of the primary tab row and into a header slot — applied to a creation action rather than settings, but the same underlying principle.
- **Source:** https://www.inro.social/blog/instagram-tabs-new-layout-2025

*(Model-knowledge flag: I did not find a currently-live major consumer app that literally frames its header avatar as "the" settings entry point with zero settings tab — the closest verified real-world case is a regional bank, Bankers Trust, whose March 2026 redesign moved statements/security/logout entirely behind a profile icon: https://www.bankerstrust.com/mobile-banking-changes/. Treat that one as a smaller, less "popular" data point corroborating the pattern rather than a flagship exemplar.)*

## Cross-cutting patterns
- Tab count is elastic to feature surface (Google Health: 2 vs 4), not a fixed number — the target is "how many things does *this* user do weekly," not an arbitrary 3.
- Account/settings in a header avatar works when that surface is low-frequency; when it's part of the core loop (Duolingo streak/profile), it stays a tab.
- Redesigns consistently absorb a "content/explore/learn" tab into the home destination rather than deleting the content — same pattern as retiring YogaKit's Learn tab into a Today card.
- Secondary or creation actions move to header corners, not into a hidden "more" tab.
- Every cited redesign kept the *number* of primary destinations small (2-5) but changed *which* things earned a slot based on usage data, not aesthetics alone.

## Anti-patterns observed
- A settings/account destination that only lives behind an avatar with no icon or label cue can become undiscoverable for new users — several banking-UX write-ups warn this needs onboarding/first-run emphasis.
- "More" or catch-all tabs that absorb ejected destinations tend to become junk drawers that users stop opening, defeating the purpose of the collapse.
- Tab counts that shrink in one redesign often creep back upward in the next as teams re-add destinations for new features — worth a stated policy, not just a one-time cut.

## Fold into YogaKit
- Collapse `NAV_LINKS` in `AppHeader.tsx` from 5 entries to 3 (Today, Teach, Poses); move the avatar out of the array entirely into a standalone header element rendered next to (not inside) the `nav` map. `spec 005`
- Merge `/compose` and `/flows` under a single "Teach" destination — mirrors MyFitnessPal's Today-tab consolidation of previously separate logging screens; the merge target's internal tabs/sections should carry the old testids as their own data-testid, not reuse `nav-*`. `spec 005`
- Retire `/learn` as a nav destination but keep its content reachable via a card on Today (Duolingo/MyFitnessPal pattern of absorbing rather than deleting a content surface) — needs a decision on whether the card links to `/learn` (route survives, unlinked from nav, same as `/dimensions` etc.) or the route is folded into Today's own page. `needs decision`
- Add the avatar as a `<Link href="/account">`-style header element sized for the same 44px+ touch target as the current text/icon tabs — follow the Google Health precedent of a fixed header slot regardless of tab count. `spec 005`
- Quick, low-risk prep before the big rename: extract `isActive()` and the mobile-spacer height constant so the 3-tab version and the 5-tab version can coexist behind a flag during the guardrails/testid migration commit. `quick win`
- Decide explicitly whether the avatar shows initials/silhouette placeholder pre-auth, since solo/anonymous users on this app may never set an avatar image — Duolingo and Google Health both assume an authenticated, personalized account; YogaKit's offline-first read path may not. `needs decision`

## Constitution check
- Testid contract: `docs/krama-guardrails.md` §1.3 says rename the label, not the testid, when only copy changes — but collapsing 5 destinations into 3 (Home+Compose+Flows+Poses+Learn → Today+Teach+Poses) is a structural change to the destination set itself, not a copy change, so `nav-home|compose|flows|poses|learn` legitimately retiring in favor of new `nav-today|teach|poses` testids is an **accepted exception** to §1.3, not a violation of it — flag this explicitly in the spec 005 commit message and update all 6 Playwright smoke-walk tests in the same commit.
- Solo-mode invisibility: the header avatar must not surface org/teacher/seat language for solo users — its menu contents need to branch on tenancy state, same as any other org-aware surface per the 002 plan.
- One-accent, typography-first design: the avatar should use the existing `--accent`/`--muted` tokens already driving active/inactive nav state in `AppHeader.tsx`, not a new color, to avoid introducing a second accent.
- Motion: any avatar-menu open/close or tab-count transition during the migration must stay within the ≤200ms no-bounce budget already implied by the `duration-150` transitions in the current component.
- Mobile-first touch-real requirement: the header avatar's tap target must meet the same real device thumb-reach standard as the current `flex-1` bottom-tab items — a small header icon is the most common way this pattern fails in practice.
