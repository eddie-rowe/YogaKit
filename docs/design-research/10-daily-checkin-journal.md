# Daily Check-In & Journal

**YogaKit surface:** planned — spec 005 "daily sadhana" (no code yet; will live under a new /today route)
**Status:** planned (spec 005)

## The interaction problem
A daily check-in only works as a habit if logging it is faster than the friction of skipping it. The moment a "how was today" prompt feels like a form — multiple required fields, granular scales, mandatory text — users do it inconsistently or stop. The best daily-touch products separate a near-zero-effort default path (one tap, done) from an optional deeper path (a note, a tag, a longer reflection) that never gates completion, and they design the "you missed a day" state to invite rather than punish.

## Best in class

### 1. Daylio — mood + micro-journal app, current 2026 App Store/Play top mood tracker
- **What they do:** Logging is two taps: pick one of five mood icons, then tap activity icons from a customizable grid; a text note is available but explicitly optional and small (not a full journal field). Most entries take under 30 seconds.
- **Why it works:** The required path has zero typing. Depth (notes, photos, audio) is opt-in and visually secondary, so the habit doesn't depend on having something to say.
- **Source:** https://daylio.net/

### 2. Oura — smart ring + app, current 2026 flagship "Readiness Score"
- **What they do:** Every morning the app surfaces one number (0-100) computed from sleep, recovery, temperature, and prior-day activity, with a short plain-language explanation ("why") rather than asking the user to self-report anything.
- **Why it works:** Zero user input required for the daily signal at all — the check-in is receiving a score, not filling one out. This is the ceiling case for "frictionless": the best log entry is one the user doesn't have to make. It also frames variation as healthy rather than something to fix, avoiding score-anxiety.
- **Source:** https://ouraring.com/blog/readiness-score/

### 3. Duolingo — language learning app, current 2026 dominant habit-streak design
- **What they do:** Daily lesson completion drives a streak; "Streak Freeze" is granted proactively (already equipped before a miss happens, not something to remember to buy), capped at a small number so it stays a safety net rather than a loophole, and "Streak Repair" lets a broken streak be restored by completing a few lessons shortly after.
- **Why it works:** The forgiveness mechanism is pre-loaded and automatic, so a lapse never requires the user to take a shameful extra action to avoid losing status — it removes the moment of guilt entirely. Verified data: Streak Freeze adoption raised daily active learners ~0.38% and cut churn ~21% for at-risk streak users.
- **Source:** https://blog.duolingo.com/how-duolingo-streak-builds-habit/

### 4. Bearable — symptom/mood tracker, current 2026 (chronic-illness/ADHD focus)
- **What they do:** Mood, energy, and symptom severity are logged via tap-only severity/frequency selectors with color-coded scales — no typing required unless the user wants it — completable in "just minutes per day."
- **Why it works:** Demonstrates the failure mode Daylio avoids: reviewers note Bearable's larger tracked-metric surface can feel overwhelming next to a single-purpose app like Daylio, i.e. optional depth has to stay visually and cognitively subordinate to the one-tap default or it stops feeling optional.
- **Source:** https://bearable.app/

### 5. Apple Health "State of Mind" — built into iOS 17+/watchOS 10+, current in 2026
- **What they do:** A single drag-slider (valence) captures a mood or momentary emotion in one gesture; word-tag chips for feelings and "what's having the biggest impact" are explicitly optional follow-ups, not required fields, and entries can be logged for a past day from one tap in the corner.
- **Why it works:** The core gesture (slide, done) is a continuous single motion rather than a multi-field form, and depth is tag selection, not typing — same "one motion, optional richness" shape as Daylio and Bearable, at platform scale.
- **Source:** https://support.apple.com/guide/iphone/log-your-state-of-mind-iph6a6decb13/ios

## Cross-cutting patterns
- The required path is a single gesture (tap a mood icon, drag a slider) with zero typing; anything beyond that (note, tags, activities) is visibly optional and secondary in layout.
- Forgiveness/lapse mechanics are pre-provisioned before the lapse happens (Duolingo's pre-equipped freeze), not something the user must remember to claim after the fact.
- Streaks and scores are framed as an invitation forward, never a countdown or loss ("readiness" varies healthily; a freeze protects rather than threatens).
- Where the app can infer the signal instead of asking (Oura), it does — asking is a fallback, not the ideal.
- Retroactive logging for "yesterday" is a first-class, low-friction action (Apple Health), which matters for users who check in at night vs. morning.
- Depth-tracking apps that pile on optional fields (Bearable) risk feeling like homework unless the default one-tap path stays visually dominant.

## Anti-patterns observed
- Multi-field mandatory forms (date + duration + mood + note before "save" is enabled) turn a 10-second habit into a chore.
- Mood scales with too many granular points (10-point sliders, multi-axis emotion wheels) add decision fatigue to something meant to take one tap.
- Streaks or reminders that use loss/urgency language ("don't lose your streak!", countdown timers) — the anti-pattern Duolingo itself moved away from with pre-equipped freezes.
- Optional depth (notes/tags) presented with equal visual weight to the required action, making the whole entry feel incomplete until every field is filled.

## Fold into YogaKit
- Default check-in interaction is one tap-to-select mood (3-5 icons, no slider granularity beyond that) plus duration inferred from the flow just completed when available, with note and flow-link fully optional and visually secondary. `spec 005`
- Log "yesterday" affordance for a user checking in at night for a session finished after midnight local time — UI should let them attribute the check-in to the correct local day without letting them arbitrarily backdate. `needs decision`
- No numeric streak countdown or "X days until you lose your streak" copy anywhere in the check-in flow; any pause/lapse state uses invitation language per Principle VII. `spec 005`
- Show a lightweight, permanent "only you can see this" microcopy next to the note/mood fields at the point of entry, not buried in settings, so the private/signal boundary is visible exactly where content is created. `spec 005`
- Quick win: ship the one-tap mood + optional note first; defer flow-link and duration auto-fill to a later pass rather than gating the MVP check-in on all fields being wired. `quick win`
- Consider a single derived "practiced today" signal exposed to cohort teachers (a checkmark/streak dot) that is visually and structurally distinct from the mood/note UI, so the split is legible to the user, not just enforced server-side. `needs decision`

## Constitution check
- Principle VIII (RULE-V1/V2): mood and note are practice content and must sit in a table with no joinable cohort/org/teacher column; the UI must never let a user believe a teacher toggle could expose them, since no such toggle can exist. The "only you can see this" microcopy above should say this plainly, not just imply privacy.
- Principle VII (RULE-C1/C2): the check-in and any lapse-recovery prompt must avoid streak-zero, guilt, urgency, or countdown copy — this constrains the exact wording used in "fold into YogaKit" invitation-language bullet.
- local_date/timezone mechanism: because local_date is server/trigger-computed from `occurred_at` + a stored timezone, the UI must not expose a raw date picker that could be used to fabricate a different local day after the fact — "log for yesterday" should be a bounded, recent-day affordance, not an open calendar, to avoid encouraging users to fight the mechanism.
- One-accent typography-first design and ≤200ms no-bounce motion: the one-tap mood selector and optional-field disclosure should rely on typographic/color-accent state changes (selected mood highlighted) rather than bouncy animation, consistent with existing YogaKit motion constraints.
- Flagged as model-knowledge (not verified by search): the specific claim that Apple Health's word-tag step is "explicitly optional" is confirmed by Apple's own support doc; general framing of "typography-first, ≤200ms motion" fit is my own synthesis against the constitution, not sourced from any external check-in app.
