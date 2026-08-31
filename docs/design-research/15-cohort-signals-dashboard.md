# Cohort Signals Dashboard

**YogaKit surface:** planned — spec 005 "daily sadhana" (no code yet)
**Status:** planned (spec 005)

## The interaction problem

Any tool that lets one person (coach, teacher, manager) see aggregate activity about people they're responsible for has to solve the same trust problem: the viewer must get enough signal to know who needs attention, without ever seeing the private content behind that signal — and the watched person must be able to see exactly what is shared and stop it in one motion. Get the boundary wrong and the surface either becomes useless (too little signal to act on) or becomes surveillance (too much, or too hard to revoke). Best-in-class products draw this line as a structural, visible fact of the UI, not a setting buried in an admin panel.

## Best in class

### 1. WHOOP Teams — mobile app, current 2026 feature
- **What they do:** A team owner picks which metrics (strain, recovery, sleep) the leaderboard shows *at team creation*, and that choice is locked — it cannot be changed later to expand what's shared. Before joining, an invitee sees exactly which of their metrics will appear on the leaderboard, and data is only shared once they accept. Members manage sharing from Privacy > Team Invitations.
- **Why it works:** Consent is front-loaded and legible (you see the exact fields before opting in), and the "no widening later" rule prevents scope creep from becoming a bait-and-switch.
- **Source:** https://support.whoop.com/hc/en-us/articles/360058171433-Team-Privacy-

### 2. Duolingo for Schools — teacher dashboard, active through 2027 sunset window
- **What they do:** The teacher-facing activity log and reports surface XP, lesson/unit progress, accuracy rates, and time-on-task — aggregate and per-assignment performance signals — with a dedicated Privacy Settings screen that lets a teacher (and district policy) turn off social/activity-stream features entirely, independent of the progress data.
- **Why it works:** Progress signal (what a teacher needs to intervene) is cleanly separated in the product's own information architecture from social/content features, so the privacy control maps onto a real toggle rather than a promise.
- **Source:** https://duolingoschools.zendesk.com/hc/en-us/articles/7708551934477-New-ways-to-view-student-performance

### 3. Corporate wellness platforms (Wellhub/Personify Health-class programs) — 2026 industry pattern
- **What they do:** Employer/manager dashboards receive only de-identified, cohort-level aggregates with minimum group-size thresholds; individual-level data (which employee did what, HRA content) never crosses to the employer view. Participation is opt-in, and the platform's stated best practice is that this be enforced by the technical infrastructure, not by policy alone.
- **Why it works:** The privacy guarantee is engineered at the data layer (aggregation + minimum cohort size), which matches how RULE-V2 wants the content/signal split enforced in schema, not application code.
- **Source:** https://sahha.ai/blog/employee-wellness-health-data/

### 4. Peloton "Note to Self" — mobile/app feature, launched May 2026 (anti-pattern-adjacent, useful contrast)
- **What they do:** Peloton gives each rider a private note space (cues, equipment settings, personal reflections) that is explicitly visible only to that member — a content table with no viewer other than the author, structurally separate from the public/social leaderboard data (name, output, tags) that is always visible during a ride.
- **Why it works:** Even in a highly social, leaderboard-driven product, Peloton drew a hard content/signal line: performance numbers are public-by-default, personal notes are author-only-by-construction. It validates that the split YogaKit wants (checkins vs. reflections) is a proven pattern, not a novelty.
- **Source:** https://www.pelobuddy.com/note-to-self-feature/

## Cross-cutting patterns

- The content/signal split is decided once, early (at data-model or team-creation time), and is not renegotiable through later UI settings — this avoids "we quietly added a field to the shared view."
- The person being watched sees the exact shared fields *before* or *at* the moment sharing starts, not after the fact via an audit log.
- Aggregation and minimum cohort sizes are used as a structural privacy mechanism when the viewer is a manager/employer rather than a 1:1 coach — de-identification by design, not by convention.
- Revocation controls live where the watched person already spends time (their own activity/practice screen), not nested in a separate admin/settings app.
- None of the exemplars let a coach/teacher/manager view escalate from signal to content via any in-product action — there is no "expand" or "see more" link on a signal that leads to private data.

## Anti-patterns observed

- Historical Peloton leaderboard/profile API bugs exposed private-profile fields (weight, city, tags) to unauthorized queries — a reminder that "hidden in the UI" and "unreadable by the API" are different guarantees, and only the latter is a real boundary.
- Several wellness/EdTech guides note programs that "feel mandatory or surveillance-like" fail on adoption even when technically opt-in — default-on sharing with a hard-to-find opt-out reads as surveillance regardless of the underlying policy.
- WHOOP's own community threads show confusion about what teammates can see ("why can't I see my teammates' strain/recovery") — an indicator that even a good structural design needs the viewer-side UI to state the boundary explicitly, or people assume the worst (or the most) in either direction.

## Fold into YogaKit

- **Cohort dashboard, per-student row:** name, a status pill (practicing / lapsed, using the same non-punitive vocabulary as RULE-C2 — no "at risk" red flags), streak state, days since last check-in, milestone progress. No note/mood/journal field anywhere in the component tree — not hidden via CSS, simply never queried, so there's nothing to accidentally render. `spec 005`
- **Make the boundary visible to the teacher, not just enforced server-side:** put a persistent one-line caption on the dashboard itself — "Signals only. Journal and reflections are private to each student and are never shared." This satisfies RULE-V2's spirit that a reviewer (here, the teacher) should never even wonder if more is available. `spec 005`
- **Revoke control on Today:** a single tappable row/chip on the practice screen reading "Shared with [Org name] teachers — tap to stop," one interaction to a confirm-and-done state; no submenu, no settings detour. Wire it directly to `DELETE`/`UPDATE cohort_enrollments.share_signals = false` for that row — a real row flip, not a client-side hide flag. `spec 005`
- **Enrollment-time disclosure:** at cohort join time, show the exact fields that will be visible (streak, last-practice date, milestones) before `share_signals` defaults to true — mirrors WHOOP's pre-join disclosure. `needs decision` (v0.1 has no enrollment flow yet; 002 created the column but not the join UI)
- **CI gate matching RULE-V5:** confirm a test exists (or is stubbed per §B of the schema doc) asserting a teacher-role query against `practice_reflections`/`practice_checkins` content columns returns zero rows/permission-denied for an enrolled student — this is a test-authoring task, not a UI one, but should ship alongside the dashboard. `spec 005`
- **No aggregation needed at YogaKit's scale (single cohort teacher, not an anonymized employer report)** — unlike the corporate-wellness pattern, per-student named rows are appropriate here per RULE-V3, since visibility is cohort-teacher-to-enrolled-student, not org-to-population. `needs decision` (confirm this reading holds if `006` ever introduces org-admin-level aggregate reporting across cohorts, which would need the corporate-wellness aggregation pattern instead).

## Constitution check

- **RULE-V1/V2 (structural content exclusion):** satisfied by construction per `docs/design/002-schema.md` §B — `practice_reflections` carries no `org_id`/`cohort_id` column, so no teacher policy can be written against it even by mistake. The dashboard UI must reinforce this visibly (the caption above) so the teacher never wonders if more exists — mirroring Duolingo's explicit progress-vs-social split rather than leaving the boundary implicit.
- **RULE-V3 (plain-language, one-interaction revoke from the primary screen):** the Today-screen chip above satisfies "reachable from the primary practice screen, not only settings" and must literally say the org's name (e.g. "Shared with Sunrise Yoga Teacher Training"), not "Cohort #4" or a generic "sharing" label.
- **RULE-V4 (real deletable row):** `cohort_enrollments.share_signals` is exactly this row, created ahead of schedule in `002`; the revoke UI must call a mutation on that literal column, never a client-only "hide from teacher" preference with no corresponding server state.
- **RULE-V5 (CI proof, not just UI omission):** the dashboard's correctness is not established by "the component doesn't render reflections" — it requires the automated RLS test proving a teacher role gets zero rows/permission-denied querying content tables for an enrolled student, per schema doc §B's stubbed placeholder assertion.
- **RULE-V6 (discoverability = compliance):** because sharing persists indefinitely until revoked, the revoke chip's visual weight matters as much as its logic — it should be legible on first glance at Today, not a small icon a student has to know to look for.
- **Typography/motion:** the dashboard should use a single accent color reserved for the "needs attention" status state (not a full red/yellow/green traffic-light system, which reads as surveillance/scorekeeping and risks violating Principle VII's anti-shame framing by proxy for the teacher's eyes); all state transitions (row updates, revoke confirmation) should animate at ≤200ms with no bounce/spring easing, consistent with the rest of the app's motion language.
