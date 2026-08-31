# Privacy & Consent Controls

**YogaKit surface:** planned — specs 005/006 (no code yet; schema exists in supabase/migrations)
**Status:** planned

## The interaction problem

Sharing personal data with a second party (a teacher, coach, doctor, family member, or
circle) is easy to grant and, in most apps, hard to find again once granted. The grant
happens once, at onboarding, and then disappears into settings — while the sharing
persists indefinitely. The interaction problem is symmetric: granting must be a clear,
informed choice, and revoking must be at least as easy to find as the screen where the
shared data is displayed, not buried three taps deep in an account menu the user never
opens again.

## Best in class

### 1. Apple Find My — iOS, current behavior verified for 2026 (iOS 17+)
- **What they do:** From the People tab, tapping a person's name and "Stop Sharing My
  Location" revokes that one relationship in two taps, silently (no notification to the
  other party). A single global toggle ("Share My Location" under the Me tab) revokes
  everyone at once in one tap.
- **Why it works:** The revoke control lives on the same screen where the user reviews
  who currently sees them — not in a separate settings hierarchy — and per-person
  granularity coexists with a one-tap "kill everything" option for urgency.
- **Source:** https://support.apple.com/guide/iphone/share-your-location-iph01954dc44/ios

### 2. Life360 — mobile app, current behavior verified for 2026
- **What they do:** Location sharing is scoped per Circle (Settings → Location Sharing →
  toggle), and turning it off for one Circle explicitly does not affect others. The UI
  visibly names the Circle being toggled, and other members see "Location Sharing Paused"
  rather than data silently going stale — sharing state is never ambiguous to either
  party.
- **Why it works:** Scoping the toggle to a named, specific relationship (this Circle, not
  "sharing" in the abstract) prevents the common failure mode of a global switch that
  either overshares or under-shares once a person belongs to more than one group.
- **Source:** https://support.life360.com/hc/en-us/articles/23053695148823-Share-My-Location

### 3. Apple Health sharing — iOS, current behavior verified for 2026
- **What they do:** The Sharing tab lists every person and provider currently receiving
  data, by name, with the exact categories shared. Tapping a person surfaces per-category
  toggles and a "Stop Sharing" action at the bottom; confirming it deletes the data
  already on the recipient's device immediately, not just future updates.
- **Why it works:** Revocation is not just a future-facing flag — it triggers deletion of
  already-shared copies, matching a user's mental model of "get my data back," and pairs
  a content-of-what's-shared readout with the revoke action so the decision is informed
  in place.
- **Source:** https://support.apple.com/en-us/HT212629

### 4. WHOOP — wearable/app integrations, policy verified for 2026
- **What they do:** WHOOP's platform policy requires every third-party integration
  (a coach dashboard, TrainingPeaks, TrueCoach) to let the member see, at any time, that
  access was granted, and to disable it with one action from the WHOOP app's own
  integrations settings — not only from the third party's side.
- **Why it works:** Putting the revoke control on the data-owner's app, not the
  recipient's, means the person whose data is at stake always has a working "off switch"
  regardless of how cooperative the receiving platform is.
- **Source:** https://www.whoop.com/us/en/full-privacy-policy/

### 5. Google Calendar — per-event visibility and delegate access, updated July 2026
- **What they do:** Individual events can be marked Private independent of the calendar's
  default visibility, and a July 2026 rollout added a delegate permission level that lets
  someone manage a calendar while private event details stay hidden — private events
  degrade to a plain "busy" block rather than disappearing or exposing content.
- **Why it works:** Per-item visibility (this event, not the whole calendar) plus a
  graceful-degradation default (busy, not blank, not fully detailed) generalizes directly
  to per-check-in or per-milestone signal sharing.
- **Source:** https://workspaceupdates.googleblog.com/2026/07/new-calendar-sharing-permission-level-and-changes-to-recurring-event-visibility.html

## Cross-cutting patterns

- The revoke control lives on the screen where the shared data (or its recipient list) is
  actually reviewed, not nested under a generic "Privacy" or "Account" settings page.
- Every relationship is named specifically (a person's name, a named Circle, a named
  provider) — never a generic "sharing is on" toggle with no stated audience.
- Granularity is scoped to the relationship, not global: revoking one connection must not
  silently affect another (Life360 per-Circle, WHOOP per-integration).
- Confirmation, where present, is a single low-friction tap — none of the five exemplars
  interpose a multi-step "are you sure" flow that makes revoking harder than granting.
- Revocation has an observable, immediate effect (data disappears, access is cut,
  recipient's view goes blank) rather than a flag that takes effect on some future sync.

## Anti-patterns observed

- Vague audience language ("some people may see this") instead of naming the specific
  org, person, or Circle — several third-party guides note this is a common complaint
  about apps that don't specify who currently has access.
- Revoke controls requiring the *recipient's* platform to cooperate, with no equivalent
  control on the data owner's own app (the failure mode WHOOP's policy explicitly
  prohibits).
- Sharing state that degrades ambiguously — a stale "last seen" location or health value
  with no clear signal of whether the connection is even still active.

## Fold into YogaKit

- **Today-screen "Shared with [Org Name]" pill**, visible whenever `share_signals = true`
  for the active enrollment, naming the cohort's org directly (e.g. "Shared with
  Ashtanga Teacher Training"). Tapping it opens a single sheet with one action: "Stop
  sharing with [Org Name]." — `spec 005`
- The sheet lists exactly what is shared (check-in dates, streak, milestones) in plain
  language, matching Apple Health's "here's what's shared" pattern before the revoke
  action, not after. — `spec 005`
- Revoking flips `cohort_enrollments.share_signals` to `false` in one write — the same row
  RULE-V4 already requires exist; no soft "hidden" flag, no derived permission. — `quick win` once 005 UI ships, since the column already exists from 002
- If a user belongs to more than one cohort/org, scope the control per-enrollment (one
  pill/toggle per org), following the Life360 per-Circle pattern — never a single global
  "sharing on/off" toggle that conflates unrelated orgs. — `spec 005`
- No confirmation dialog beyond the one tap that opens the sheet and the one tap that
  flips it — match Find My / Apple Health's low-friction revoke, not a multi-step "are you
  sure" flow. — `needs decision` (product should confirm whether "Stop sharing" needs a
  single undo toast instead of a blocking confirm, to stay in Principle VII's
  non-punitive spirit without adding friction)
- Re-granting sharing later (re-enrollment or a fresh opt-in) should be an equally
  explicit, named action — never implicit reactivation. — `spec 006` (profile/settings
  surface where org relationships are managed long-term, complementing the Today-screen
  quick control)

## Constitution check

- **RULE-V1/V2 (content vs. signals visible in UI):** the proposed pill only ever
  surfaces signal fields (check-ins, streak, milestones) by design — content
  (journal/mood/notes) has no UI path to a teacher at all, matching Apple Health's
  category-level transparency but applied to a hard content/signal split rather than a
  toggle.
- **RULE-V3/V6 (one interaction deep, plain-language org name, reachable from Today):**
  the pill sits directly on Today, names the org verbatim, and opens the revoke action in
  one tap — mirroring Find My's People-tab pattern rather than a settings-buried toggle.
- **RULE-V4 (real deletable row):** revoking flips (or could delete) the actual
  `cohort_enrollments.share_signals` row/column already created in 002 — not an
  application-layer conditional, matching WHOOP's requirement that revocation be a real,
  owner-controlled action rather than a display-only suppression.
- **RULE-V5 (RLS-enforced, not UI-only):** out of scope for this UI research, but the
  revoke action's effect must be provable by the existing `app_visible_student_ids()`
  helper excluding the student the moment `share_signals` is false — the UI is a
  convenience, not the enforcement boundary.
- **Indefinite-until-revoked default, no app-code-only widening:** `share_signals`
  defaults `true` on enrollment (per 002 schema) and stays true indefinitely until this
  control flips it — consistent with Principle VIII's structural (table/RLS), not
  conditional, boundary.
- **Typography-first, one-accent, ≤200ms no-bounce motion:** the sheet should use a single
  accent color for the "Stop sharing" action only (no red/alarm treatment, keeping with
  Principle VII's non-punitive tone), plain-text labels over icons, and a fast fade/slide
  (≤200ms, no spring/bounce) consistent with the rest of the Today screen's motion
  language — flagged `needs decision` for the exact token values, which belong to
  YogaKit's design system rather than this research.

Note: the July 2026 Google Calendar delegate-permission rollout date and Apple Health
sharing/deletion mechanics are drawn from verified web search results (see sources above);
no claim in this report relies on unverified model knowledge.
