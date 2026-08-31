# Billing & Paywall

**YogaKit surface:** planned — spec 002 (Stripe + entitlement tables built; zero UI yet)
**Status:** schema only

## The interaction problem

A paywall is the one UI surface where trust and revenue collide in full view of the user: gate the wrong thing (their own data, a feature they already paid for, an account they're trying to leave) and the product looks predatory even if the intent was benign. The hardest part is never the checkout form — it's drawing an unambiguous line between "yours, always" and "premium, unlockable," making that line legible in the UI itself, and letting people leave as easily as they arrived, without a support ticket or a dark-pattern maze.

## Best in class

### 1. Linear — project/issue tracker, pricing restructured through 2026
- **What they do:** Free tier is generous and feature-complete (unlimited members, the AI agent platform included) but capped on volume — 2 teams, 250 issues. Feature-level gates (private teams, guest access, AI-assisted triage, analytics) only appear at the Business tier; core workflow is never behind a wall.
- **Why it works:** the upgrade trigger is capacity exhaustion, not blocked functionality a user already relies on — nobody who has been using Linear for their real work suddenly finds a feature they depend on locked overnight.
- **Source:** https://linear.app/pricing

### 2. Stripe's own Billing Customer Portal — hosted self-serve billing, 2026 guidance
- **What they do:** a Stripe-hosted portal for payment method updates, invoice history, plan switching, and cancellation, configured (not custom-built) with cancellation set to take effect at end of billing period rather than immediate proration-refund, so the customer keeps access through what they already paid for.
- **Why it works:** self-serve cancellation with access continuing to period end removes the two biggest sources of billing distrust — "I can't find how to cancel" and "I got cut off mid-period I paid for."
- **Source:** https://docs.stripe.com/customer-management and https://stripe.com/resources/more/self-serve-subscription-management-and-billing-portals

### 3. Figma — seat-based tiers with unbundled seat types, 2026 pricing model
- **What they do:** four seat types (Full, Dev, Collab, view-only-free) let an org pay only for the level of access each person needs rather than a flat per-seat tax; feature gating between tiers targets org-scale needs (multi-team libraries, SSO, provisioning), not core design work, which is identical across every paid tier.
- **Why it works:** unbundling seat cost from feature access means the paywall optimizes for "pay for what this specific person needs," which reads as fair rather than extractive, and mirrors YogaKit's own union model (personal ∪ org seat ∪ grant).
- **Source:** https://www.figma.com/pricing/

### 4. Spotify Premium feature-gate messaging — anti-pattern, ongoing as of 2026
- **What happens:** paying Premium subscribers are repeatedly shown "You Discovered a Premium Feature! Upgrading to Spotify Premium will unlock it" — a targeting/caching bug that puts an upgrade prompt in front of someone who already owns the entitlement.
- **Why it's instructive as a negative example:** it demonstrates the exact failure mode YogaKit must design against structurally: entitlement state must be resolved correctly and freshly enough that an owning user is never shown an upgrade prompt for something they already have — this is a reachability bug, not just a copy problem.
- **Source:** https://community.spotify.com/t5/Subscriptions/upgrading-to-spotify-premium-will-unlock-it/td-p/6068610

## Cross-cutting patterns

- Best-in-class products gate *ceiling* (volume, seats, org-scale features) far more than they gate *core workflow* — the thing a user already does daily stays available at every tier.
- Cancellation is self-serve, requires no support contact, and preserves access through the period already paid for (Stripe portal default; Notion's own documented behavior).
- Feature comparison tables are the norm for pricing pages (Linear, Figma) — features as visible, comparable rows, not surprises discovered mid-use.
- Seat/entitlement models that support a union of sources (personal, org, time-boxed) are handled in the billing backend, not hardcoded per-tier logic — this matches YogaKit's `app_entitlements()` union design already in `docs/design/002-schema.md` §D.
- Upgrade prompts must be scoped to entitlement state precisely — showing an upsell to someone who already holds the entitlement (Spotify's bug) is a trust failure, not a minor UX nit.

## Anti-patterns observed

- Paywall prompts that misfire against users who already own the entitlement (Spotify) — reads as either broken or predatory regardless of intent.
- Overlapping/nested paywalls within one product (Spotify Premium vs. podcast-specific subscriptions) confuse users about what any given payment actually buys.
- Cancellation flows requiring platform-specific hoops (Notion's app-store-subscription redirect) shift the user's mental model of "self-serve" onto a third party mid-flow.
- Hard usage cliffs with no warning (Linear's free-tier issue cap blocking new issue creation outright) risk feeling punitive if the user has no visibility into their usage before hitting the wall — worth a progress indicator, not just a wall.

## Fold into YogaKit

- Build a `/pricing` page presenting `plan_features` as a comparison table (features as rows, tiers as columns) — since `plan_features` is already schema-driven, the page can render directly off that table with no hardcoded tier copy. `spec 002`
- Add a checkout entry point (Stripe Checkout redirect) from `/pricing` and from any in-app feature gate — never gate the pose library, meridian data, or a flow/practice record the user already owns; gate only compose/sync/org-seat features per RULE-O7. `spec 002`
- Add a "Manage billing" entry point (Stripe Customer Portal redirect, no custom UI) reachable from account/profile settings — mirrors the Stripe-recommended default of using the hosted portal before building custom billing UI. `spec 002` / `spec 006` (entry point placement in profile/settings)
- Wire `app_entitlements()` resolution into the client `src/lib/entitlements/index.ts` module (already specified) so any upgrade prompt checks live entitlement state before rendering — this is the concrete guard against the Spotify misfire pattern. `spec 002`
- Feature-gate UI (e.g. a disabled compose button) should show *why* in plain language ("Composing requires a plan — you can still read every flow you've saved") rather than a generic lock icon, keeping the "yours vs. premium" line visible in the UI itself. `needs decision` (copy pass against RULE-O7 + Principle VII tone)
- Cancellation UX: redirect straight to the Stripe portal rather than building a custom cancel flow — this is a `quick win` once checkout exists, since Stripe's hosted portal already handles period-end access correctly out of the box.

## Constitution check

RULE-O6/O7 draw the line this report is built around: entitlement/billing logic may gate application *features* (composing, cloud sync, teacher dashboards, org seats) but must never gate the pose/meridian/quote data files themselves, and must never gate a person's ability to read a flow or practice record they already own. Concretely, this means the pricing/checkout/paywall UI proposed above must never sit in front of the pose library routes or the read view of an existing saved flow — those stay reachable with no entitlement check, full stop, matching the existing RULE-L4 "6am test" (read a cached flow with no network, no re-auth).

Entitlements are resolved server-side via `app_entitlements()` and consumed through one cached module — but per RULE-L3/L4, that resolution is only a gate on *writing new* premium-gated actions, never on reading what a user already has cached. The schema's own design note is explicit that a limit "must be unbypassable... encoded in the relevant table's `WITH CHECK` clause," never merely UI-hidden — but the inverse failure mode matters equally for billing: entitlement checks must never be cached client-side *for enforcement*, because an offline user who lapses or has a billing hiccup must keep what they already had rather than losing access to their own practice log over an expired card — locking someone out of their own log this way is the wrong failure mode, and the correct default is fail-open on read, fail-closed only on new writes gated by a feature (never data).

Stylistically, any pricing/checkout/portal surface should follow the app's existing one-accent, typography-first design language and ≤200ms no-bounce motion already established elsewhere in the product, and — consistent with Principle VII's compassion-over-compliance stance already binding on Daily Sadhana copy — billing emails and in-app billing UI must carry no manufactured urgency, countdown, or loss framing (e.g. no "your access expires in 2 days!" red-banner treatment); a lapsed payment should read as a plain, correctable state, not a threat.
