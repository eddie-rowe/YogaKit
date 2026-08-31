# Return Rituals

**YogaKit surface:** planned — spec 005 "daily sadhana" (no code yet)
**Status:** planned (spec 005)

## The interaction problem

When a person stops using a habit-forming product for long enough that a threshold is
crossed, the product must decide how to greet them on return. Most re-engagement systems
are built to protect a growth metric (streak count, DAU) and default to loss framing —
broken chains, expiring progress, "don't lose your streak" — which studies of behavioral
design and this repo's own constitution treat as manipulative. The better pattern treats
the same moment as a hinge: acknowledge the gap once, without penalty, anchor the person
back to *why* they started, and offer a next step sized well below whatever they missed.

## Best in class

### 1. Headspace — meditation app, ongoing philosophy still current in 2026
- **What they do:** Public guidance and in-app copy reframe a missed day as normal rather
  than a failure: "if you miss a day, progress isn't lost — you simply return to your
  practice when you're ready." The primary re-entry action is a single large centered
  "start" button with no reference to the gap, no repair mechanic, no penalty state.
- **Why it works:** Removes the decision cost of returning. The interface treats every
  session as the next one, not a make-up for missed ones — friction-free re-entry beats
  any nudge copy.
- **Source:** https://www.headspace.com/articles/building-a-meditation-practice

### 2. Stryd Adaptive Training (Pause & Resume) — fitness/training-plan platform, shipped Feb 2026
- **What they do:** On return, the system computes a "Day Gap" since last activity and
  offers a *tiered, smaller* re-entry: 0–7 days idle → skip missed days and continue;
  8–14 days → restart the current phase; 15–28 days → start from the aerobic base phase;
  29+ days → start from a recovery ramp. It never proposes "catching up" the missed
  volume.
- **Why it works:** The size of the re-entry offer scales down as the gap grows, which is
  the opposite of guilt-driven "catch up" framing — the longer the lapse, the *gentler*
  the ask, matched to real physiological reality rather than a made-up penalty.
- **Source:** https://blog.stryd.com/2026/02/17/closer-look-new-pause-resume-plan-adjustments-in-adaptive-training/

### 3. Apple Fitness+ "Make Your Fitness Comeback" — fitness app, new 2026 program slate
- **What they do:** A named, structured four-week comeback program of short (10-minute)
  workouts, explicitly positioned as the return path after time off, sitting alongside
  (not instead of) the regular catalog — the person opts into a smaller container, not a
  resumption of their prior intensity.
- **Why it works:** Naming the return path as its own legitimate program — rather than
  silently expecting the user to resume their old plan — removes the implicit comparison
  to "where you used to be."
- **Source:** https://www.digitaltrends.com/wearables/apple-fitness-adds-new-workout-programs-to-help-you-stick-to-your-2026-fitness-goals/

### 4. Day One — journaling app, "On This Day," current feature as of 2026 Android/Gold release
- **What they do:** Surfaces a past entry (with photo, location, weather metadata) from
  the same calendar date in prior years as a standing feature, independent of any lapse
  state. Multiple 2026 reviews credit it as the single biggest reason lapsed users return
  and keep writing.
- **Why it works:** The re-entry hook is a memory of the user's *own* past self and voice,
  not a system-generated reminder about the system's metric (streak, count) — it reopens
  the relationship the person already had with their own reflection, which is the closest
  existing-market analogue to YogaKit's plan to resurface a versioned sankalpa/intention.
- **Source:** https://dayoneapp.com/features/on-this-day/

## Cross-cutting patterns

- The strongest re-entry moments anchor to the user's *own* past content (an old journal
  entry, a stated "why") rather than to the app's own metric (streak count, days lost).
- Best examples size the ask down, not up, in proportion to lapse length — the opposite
  of "catch up."
- Framing language avoids naming the absence as a failure ("progress isn't lost," "ease
  back in," "comeback") rather than naming it as a broken thing.
- A single, low-friction primary action (one button, one prompt) beats a menu of repair
  options at the moment of return.
- Where a repair mechanic exists at all (Duolingo), it is bundled with monetization,
  which is the exact combination YogaKit's constitution rules out.

## Anti-patterns observed

- **Duolingo streak repair / June 2026 "Streak Revival" campaign** — ties the emotional
  cost of a lost streak directly to a paid "Restore" button and a Super Duolingo free
  trial upsell; standard streak freezes are also gated behind the subscription. This is a
  loss-and-repair-as-purchase pattern: the app manufactures the sense of loss (streak
  reset to zero, "long-dead" streak language in coverage) and then sells the fix. YogaKit
  must not build any streak-repair mechanic, paid or free — RULE-C1 already forbids the
  zero-reset that makes repair necessary in the first place.
- **Duolingo's framing of lapsed streaks as "dead" / needing "revival" or "resurrection"**
  (language used across its own campaign and third-party coverage) is loss/urgency
  framing by definition and is explicitly the kind of vocabulary RULE-C2/C5's banned-
  phrase copy-lint must catch.
- *(Flag: no manipulative pattern was found in the Headspace, Stryd, Apple Fitness+, or
  Day One material searched — all four read as non-punitive in the sources reviewed.)*

## Fold into YogaKit

- Store the sankalpa/intention as a **versioned** record (append-only history with
  timestamps) so the return prompt can quote the version that was active when the lapse
  began, not just whatever is current. `spec 005`
- Return-ritual card copy: literal plan sentence — "You haven't completed a daily
  practice in two weeks, would you like to revisit your 'why'?" — followed by the quoted
  original intention text, with two flat (non-hierarchical) actions: "Keep this why" and
  "Update my why." Neither is styled as a warning or framed with a countdown. `spec 005`
- The smaller-commitment offer should default to the single smallest unit the pose model
  already supports (one pose or one breath-cycle from the sankalpa's original flow),
  never a prompt to "catch up" on the two missed weeks — mirroring Stryd's tiered
  downshift, but with only one visible tier at launch to keep the surface simple. `spec 005`
- Do not add a streak-repair action of any kind (paid or free) anywhere in this surface —
  this is a hard exclusion, not a deferred feature, matching RULE-C1 and the Duolingo
  anti-pattern above. `needs decision` (confirm with product this is a permanent
  exclusion, not just v1 scope)
- Consider a lightweight "on this day" style echo — surfacing a past check-in note or
  mood/energy entry from the version-matched period — as a later enhancement once
  journal/reflection data exists, following Day One's pattern of anchoring to the user's
  own past voice rather than a system metric. `quick win` for the copy-only version
  (quote the sankalpa only); the richer memory-echo is `needs decision` pending spec
  005's journal data model.
- Explicitly allow "rest" as a selectable response inside the same card ("I'm resting,
  not stopping") so the prompt does not force a binary of practice-or-ignore. `spec 005`

## Constitution check

- **RULE-C1 (no streak reset to zero):** satisfied by design — the return-ritual prompt
  in this plan never mentions streak count or resets one; it only references the
  intention and offers a smaller step.
- **RULE-C2 (no guilt/shame/loss/urgency/countdown):** the literal plan sentence uses
  neutral, factual phrasing ("You haven't completed... would you like to revisit"), no
  loss or countdown language. This must still pass the CI copy-lint (RULE-C5) before
  ship — it is not optional review, it is a build gate.
- **RULE-C3 (smaller re-entry, never "catch up"):** the proposal above (single pose/
  breath, or simply revisiting the "why") is explicitly the smaller commitment; no
  "make up your two missed weeks" path exists anywhere in this design.
- **RULE-C4 (rest as first-class state):** the "I'm resting, not stopping" action inside
  the same card gives rest a recordable, deliberate status distinct from silent absence.
- **RULE-C6 (milestones as invitation):** out of direct scope for this specific card, but
  any milestone copy adjacent to the return ritual (e.g., "welcome back" streak
  continuation) must read as an invitation forward, never a threshold now at risk.
- **Typography-first, one-accent design and ≤200ms no-bounce motion:** the card should
  render as a plain text-forward panel — no icon-heavy illustration, one accent color
  reserved for the primary action only — appearing with a short opacity/position
  transition capped at 200ms and no spring/overshoot easing, consistent with the calm,
  low-stimulation tone Headspace's return copy models (source above) rather than a
  celebratory or alarm-styled entrance.

**Note on sourcing:** all app-specific behavioral claims above are drawn from the cited
2026 web sources; no claim is asserted from model training-data knowledge alone.
