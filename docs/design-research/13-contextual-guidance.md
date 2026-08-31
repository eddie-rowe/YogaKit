# Contextual Guidance

**YogaKit surface:** planned — spec 005 "daily sadhana" (no code yet; /learn is currently a placeholder to be retired)
**Status:** planned (spec 005)

## The interaction problem

Users need short, situational explanations of *why* something just happened or *what* to try next — but only at the moment it's relevant, not as standing content they must go find or triage. The failure mode on both ends is well documented: a browsable help/FAQ surface goes stale and unread ("where content goes to die"), while a feed or badge-count of tips becomes homework the user feels behind on. The alternative is to attach guidance to an event, show at most one item, and let it disappear once acknowledged.

## Best in class

### 1. Duolingo — mobile, notification + in-app triggers, current 2026 behavior verified
- **What they do:** Every push and in-app tip is gated on a behavioral/state trigger (streak about to lapse, streak actually broken, milestone reached) rather than a schedule; copy is tailored to the specific commitment (e.g., a streak wager) rather than generic. Post-lapse, the system shifts from prevention framing to a single recovery offer (streak freeze / repair) instead of a backlog of missed-day reminders.
- **Why it works:** The trigger *is* the relevance filter — no user-side triage needed, and recovery framing avoids shame by targeting the highest-value moment (just after a lapse) with one clear action.
- **Source:** https://duolingo.deconstructoroffun.com/mechanics/notifications

### 2. Superhuman — desktop/mobile email, just-in-time teaching, current
- **What they do:** Shortcuts are never dumped as a cheat sheet up front. Cmd+K opens a command palette; typing the intended action surfaces the shortcut for that action *in the moment of use*, and hovering an icon reveals its shortcut contextually. There is a full list behind `?`, but it's opt-in, not default.
- **Why it works:** Teaching is deferred until the user has already formed the intent to do the thing — the tip lands exactly when it's usable, and one card/hint replaces a manual.
- **Source:** https://blog.superhuman.com/the-fastest-way-to-inbox-zero-a-single-coaching-session/

### 3. Oura — mobile companion app, single daily score/insight, current 2026
- **What they do:** The home screen is organized around one score at a time (Readiness, Sleep, Activity) rather than a dashboard of metrics or a feed of tips; its advisor surfaces "gentle, pattern-based suggestions" rather than a strain target to hit. No badge count, no backlog of unread insights.
- **Why it works:** Reducing cognitive load to a single number/insight avoids the anxiety of an unread queue, and "gentle" framing (vs. WHOOP's more data-dense, targets-driven style) keeps it a nudge, not a demand.
- **Source:** https://healnourishgrow.com/whoop-vs-oura/

### 4. Linear/NN·g "pull revelation" pattern — cross-product contextual help, current
- **What they do:** Contextual help is triggered by a signal that the user would benefit from it right now (a stumble, a first encounter with a feature) rather than being parked in a searchable knowledge base users must go hunt through. NN/g research finds static tutorials are quickly forgotten and don't reliably improve task performance, while behavior-triggered hints get materially higher engagement.
- **Why it works:** Moving help from "browse and search" to "surfaced when the trigger fires" removes the FAQ's core failure mode — nobody visits it until they're already stuck, and by then it's a wall of unranked content.
- **Source:** https://www.nngroup.com/articles/onboarding-tutorials/ (supporting data via https://www.chameleon.io/blog/contextual-help-ux)

## Cross-cutting patterns
- Guidance is attached to an **event/state trigger**, never a schedule or a menu the user must open.
- Best implementations show **exactly one** item at a time — a score, a card, a single palette suggestion — never a list or count of pending items.
- Recovery/comeback moments (Duolingo post-lapse) get *action-oriented* framing, not guilt-oriented framing.
- "Gentle" language beats "push to a target" language when the domain (health, habit, practice) already carries anxiety risk (Oura vs. WHOOP contrast).
- The deeper archive (full shortcut list, spending history, knowledge base) still exists, but only as an **opt-in reveal behind the single surfaced item**, never a default landing page.
- Personalization is used to select *which one* trigger fires, not to generate more content to show simultaneously.

## Anti-patterns observed
- Standing FAQ/knowledge-base tabs go unvisited until a user is already stuck, then present an unranked wall of content (the exact failure this spec's rationale names).
- Feeds/queues of tips create implicit homework — an unread badge count reads as backlog, producing the same guilt dynamic a no-shame product principle exists to avoid.
- Over-frequent or unfiltered nudges (generic notifications not gated by state) cause tip fatigue and get dismissed within seconds — cited stat: the majority of static tooltips are dismissed within 3 seconds when not behavior-triggered. *(Aggregate industry stat from Chameleon/Appcues marketing content, not independently verified against primary research — flagged as model-adjacent secondary-source claim.)*
- Data-dense "strain target" framing (WHOOP-style) risks feeling like a demand rather than a suggestion when the underlying content is about rest, recovery, or practice consistency.

## Fold into YogaKit
- Gate every `data/guidance/*.md` entry on exactly one named trigger (first-flow-saved, 7-day-streak, 14-day-lapse, etc.) and render **at most one** card on Today, selected by trigger priority, never a list. `spec 005`
- On lapse triggers (14-day-lapse), copy must mirror Duolingo's recovery framing — one clear next action, no "you missed X days" counter and no reset-to-zero visual. `spec 005`
- Keep the "more like this" index fully behind the single card (a search affordance opened from the card, not a tab in nav) — same shape as Superhuman's `?` full-list-behind-the-hint and Oura's advisor-behind-the-score. `spec 005`
- No unread badge, count, or persistence queue for guidance entries — once shown/dismissed, the trigger is consumed; a re-trigger later can resurface a *different* card, never a backlog. `spec 005`
- Card copy should default to "gentle, pattern-based" tone (Oura) over "target-driven" tone (WHOOP) given the no-guilt/no-urgency constitution principle. `needs decision` (exact tone guide isn't specified yet — worth a short copy style note before content authoring starts)
- Retire `/learn` cleanly once the trigger-card system ships rather than leaving it live in parallel — two guidance surfaces would reintroduce the "place things go to browse" problem. `quick win` (route removal, no design work)
- Decide whether trigger priority when multiple fire simultaneously is authored per-entry (static priority field) or computed (most-recent-event-wins) — affects the markdown frontmatter schema. `needs decision`

## Constitution check
- No-guilt/no-shame/no-urgency (Principle VII): lapse-triggered entries are the highest-risk copy surface here — Duolingo's own lapse notifications *can* read as urgency-driven guilt bait, so YogaKit should draw the line closer to Oura's "gentle suggestion" tone, not copy Duolingo's re-engagement mechanics wholesale.
- One-card-ever discipline: every exemplar found that respects this (Oura, Superhuman, Duolingo's single push) needed a hard rule against layering triggers; YogaKit's "select at most one" trigger-priority logic is doing load-bearing work and should be tested directly, since the natural failure mode across the industry is a feed.
- One-accent, typography-first design: none of the exemplars researched are typography-first design systems (Duolingo and WHOOP lean color/badge-heavy) — the visual treatment of the single card is YogaKit's own design problem to solve, not one these exemplars answer.
- ≤200ms no-bounce motion: not addressed by any source found here — flagged as outside this research's evidence, a motion-spec decision for implementation, not informed by external precedent.
- No AI authoring entries (determinism principle): all exemplars above use either fixed editorial copy (Duolingo, Superhuman) or algorithmic-but-non-generative selection (Oura's advisor, described as "pattern-based" not LLM-authored) — consistent with keeping `data/guidance/*.md` curated markdown rather than generated text.
