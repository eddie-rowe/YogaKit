# Compassionate Streaks

**YogaKit surface:** planned — spec 005 "daily sadhana" (no code yet)
**Status:** planned (spec 005)

## The interaction problem

Streak mechanics reliably drive daily return visits, but the naive "unbroken chain" model
(zero-on-miss) converts a single bad day into a disproportionate psychological loss, which
either drives guilt-fueled compulsive use or causes total abandonment once the number hits
zero ("why bother restarting"). Best-in-class 2026 products treat continuity as something
to *protect and recover*, not a cliff a user falls off of — the design problem is how to
keep a visible, motivating number without making its loss feel like punishment or making
its defense feel like a chore.

## Best in class

### 1. Duolingo — Streak Freeze, Streak Repair, Streak Society (iOS/Android, current 2026)
- **What they do:** Streak Freeze is a pre-equipped "insurance" item (earned or purchased
  with gems) that silently absorbs one missed day so the visible streak number never
  drops. If a streak is lost anyway, Streak Repair gives a 3-day window to restore it by
  completing a special lesson set or spending gems; a "Streak Society" social layer
  celebrates long streaks. Notification copy is calibrated to the streak lifecycle and
  frames an at-risk streak as "use your freeze" (insurance) rather than a warning of loss.
- **Why it works:** the mechanic separates the *visible number* (never mutated by a normal
  miss) from the *underlying behavior* (skipped a day), so users experience recoverability
  instead of collapse. Data cited in the case study shows freeze-eligible users average
  48% longer streaks past the 7-day mark than non-freeze users.
- **Source:** https://trophy.so/blog/duolingo-gamification-case-study

### 2. Gentler Streak (Apple Watch / Apple Design Award 2024, active 2026)
- **What they do:** Instead of Apple's native Activity-ring streak (which resets visually
  on a missed day), Gentler Streak lets a user explicitly mark a day as Rest, Illness, or
  Vacation — a first-class logged state, not an inferred gap — and computes a "Path of
  Effort" vs. "Path of Rest" reading from HRV, sleep, and recent training load rather than
  from raw completion. Marking rest does not reset progress to zero.
- **Why it works:** it makes rest a *decision the user records*, not a failure the system
  detects, which removes the shame Apple's own rings can produce when a needed rest day
  reads as broken discipline.
- **Source:** https://www.healthappinsider.com/en/reviews/gentler-streak-review

### 3. Finch: Self-Care Pet (iOS/Android, active 2026)
- **What they do:** A companion-pet self-care app with no health bar and no failure state
  — the pet cannot die or disappear from missed days; it simply waits. A dedicated Pause
  mode preserves the streak indefinitely while the user is knowingly away, and a limited
  "Streak Repair Hammer" (2 uses) restores an accidentally-broken streak. Missing a day
  produces no penalty copy — the app "just welcomes you back."
- **Why it works:** removing the failure state entirely (rather than softening it) proves
  a habit loop can motivate through care/warmth framing instead of loss aversion, at the
  cost of some rigor stricter users want.
- **Source:** https://habitbox.app/blog/finch-app-review

## Cross-cutting patterns

- Recoverability is structural, not just copy: a real mechanic (freeze, repair, pause,
  rest-logging) sits behind the "it's okay" message, not just softer wording.
- Rest/pause is increasingly modeled as a *state the user declares*, not a gap the system
  infers — this is now baseline in 2026 habit-tracker UX (Gentler Streak, Finch, and
  newer entrants like StreakFlow and Habi all ship an explicit rest/pause toggle).
- The industry's own 2026 discourse frames streak-forgiveness (freezes, grace days, pause
  buttons) as having moved from "premium feature" to "baseline expectation."
- Even mechanics with loss-aversion roots (Duolingo's freeze) are reframed in-product as
  insurance/protection language, not threat language — the framing of the *same* number is
  doing real behavioral work.
- The counter-example (Habitica) is consistently cited in 2026 roundups as the thing the
  rest of the category is designing away from: death/penalty mechanics are now the
  legacy, not the aspiration.

## Anti-patterns observed

- Duolingo's streak-at-risk push notifications and the "You lost your streak" empty
  state are still, at bottom, loss-aversion engineering — the freeze/repair mercy layer
  exists precisely because the underlying mechanic (visible chain, resettable to zero)
  is punitive; YogaKit's constitution forbids the zero-reset premise this entire mercy
  layer is built to patch over (RULE-C1).
- Duolingo's gem-purchased Streak Repair monetizes the moment of a user's guilt/anxiety
  about a lapse — a "pay to undo your failure" flow is a dark pattern regardless of how
  gently it's copy-written, and is explicitly the kind of mechanic YogaKit must not adapt.
- Apple's native Activity rings (as distinct from Gentler Streak) still carry emotional
  weight from an all-or-nothing daily reset even after adding a 90-day pause feature —
  evidence that a forgiving *feature* bolted onto a punitive *default* doesn't fully fix
  the felt experience; the default itself has to be non-punitive.
- Finch's 2-use-only Streak Repair Hammer reintroduces scarcity/urgency at the edge of an
  otherwise gentle system — a hard cap invites exactly the "don't waste your last one"
  anxiety the rest of the product avoids.

## Fold into YogaKit

- `spec 005` Streak display shows a single always-positive number (consecutive practices
  within grace policy) with no red/at-risk color state and no countdown to loss — adapt
  Duolingo's *insurance framing* (grace budget as "you have room") but reject its loss
  notification pattern entirely.
- `spec 005` Grace-budget visualization: a small, calm indicator (e.g. "2 of 3 grace days
  available this month") shown only on request (streak detail, not the home glance), never
  as a warning banner — adapt Gentler Streak's explicit rest-logging model directly: a
  practice-state picker with **Practiced / Rested / (silently absent)** where only the
  first two are ever shown as chips on the calendar.
- `spec 005` Rest as first-class state (RULE-C4): a one-tap "Log rest" action on the
  /today screen, visually equal-weight to "Log practice," not a smaller or grayed-out
  secondary action — directly adapting Gentler Streak/Finch's declared-rest pattern.
- `spec 005` Milestone framing (RULE-C6): 10/30/90-practice milestones render as a
  one-time congratulatory card with a forward invitation ("keep going at your pace"), never
  as a badge with a defend/protect affordance — explicitly reject Duolingo's "Streak
  Society" framing, which turns milestones into status to be defended.
- `needs decision` Whether any repair/undo mechanic exists at all. Recommendation: skip
  it — a mercy-layer repair mechanic is only necessary to patch a zero-reset streak model;
  since YogaKit's streak never zeroes (it pauses), there is nothing to "repair," which
  sidesteps the entire monetization-of-guilt anti-pattern above.
- `quick win` Lapse-response copy (RULE-C3): first draft the single smaller-commitment
  prompt ("one breath, one pose, or revisit your why") as static copy reviewed against the
  banned-phrase list before any UI work, so copy-lint has something to validate on day one.
- `needs decision` Whether grace-budget window/size (N misses per trailing window) is
  user-configurable or fixed — affects both the UI (a setting to expose) and the
  computed-on-read logic below.

## Constitution check

- **RULE-C1 (no reset to zero):** Duolingo and Habitica both violate this in their base
  mechanic (visible chain resets/HP hits zero); their "mercy" features exist only to
  soften a reset that YogaKit's spec avoids at the model level by pausing instead of
  zeroing. Gentler Streak and Finch better satisfy the spirit — rest/pause preserves state
  rather than requiring recovery from zero. YogaKit's planned design (pause, never zero)
  is stricter than all three exemplars and must not import a "restore from zero" feature.
- **RULE-C2 (no guilt/shame/urgency/loss/countdown):** Duolingo's push notifications and
  "You lost your streak" screen violate this outright; Habitica's death/penalty language
  violates it structurally. Gentler Streak and Finch satisfy it — both avoid loss language
  and frame absence neutrally ("the bird waits"). This rule is CI-enforced via copy-lint
  (RULE-C5) in YogaKit, not left to design taste, which is stricter than any exemplar's QA.
- **RULE-C3 (smaller-commitment re-entry offer):** none of the three exemplars implement
  this precisely — Duolingo offers "repair via a lesson" (same-size commitment, not
  smaller), Finch offers no explicit re-entry prompt at all. This is a YogaKit-original
  mechanic with no direct precedent found; treat it as novel product work, not an adaptation.
- **RULE-C4 (rest as first-class state):** satisfied directly by Gentler Streak's
  Rest/Illness/Vacation logging and Finch's Pause mode — both are strong precedent to
  adapt.
- **RULE-C5 (CI copy-lint):** no exemplar was found to enforce banned-phrase copy at the CI
  level — this appears to be a genuinely stricter, more automated guardrail than the
  competitive set, consistent with the constitution's framing of it as CI-enforced, not a
  style choice.
- **RULE-C6 (milestones as invitation, not threshold):** Duolingo's Streak Society
  violates this — a long streak becomes a defended status. Finch's ungraded, threat-free
  progression better matches the intent. YogaKit should follow Finch's model, not
  Duolingo's, for milestone framing.
- **Computed-on-read (not materialized):** this is a backend/architecture requirement with
  no UI-mechanic parallel in the researched exemplars (all three appear to store streak
  state as a mutable field, based on the mechanics described — inferred from behavior, not
  verified against source code, since none publish implementation details). Flagged as a
  claim from reasoning about observed behavior, not a verified architectural fact about
  competitors' codebases.
