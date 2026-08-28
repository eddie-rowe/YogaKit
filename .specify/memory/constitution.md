<!--
SYNC IMPACT REPORT
==================
Version change: 2.0.0 → 3.0.0 (MAJOR — two principles redefined, one retired-and-renamed,
  two principles added)
Rationale: Giaconda's MVP feedback (docs/mvp-spec-suggestions.md) expands Krama from a
  single-user local tool into a multi-tenant, authenticated, billed platform whose primary
  persona is a newly-graduated YTT-200 teacher using the app as a guru/accountabilibuddy.
  This directly contradicts v2.0.0's no-database (RULE-L3), no-accounts (RULE-L4), and
  no-paywall-ever (RULE-O1) rules. Rather than let the app be built against a constitution
  that forbids it, this amendment brings the constitution to the product the team has
  committed to building — captured in the plan at
  /Users/eddie.rowe/.claude/plans/i-met-with-giaconda-declarative-dewdrop.md.
Modified principles:
  - V "Free, Open, and Contributable" → "Open Data, Sustainable Product" — the
    free-forever clause and RULE-O1 are retired; the pose/meridian/quote data stays open,
    version-controlled, and CI-validated (RULE-O2–O5 kept verbatim) even though the
    application itself is commercial. New RULE-O6 states the data/schema openness survives
    monetization; new RULE-O7 requires entitlement/paywall logic to gate application
    features only, never the data files themselves.
  - VI "Lightweight and Accessible" — RULE-L3 and RULE-L4 rewritten. L3: the pose library
    stays bundled static data, but user-authored data (flows, sadhana, profile) now lives
    in Postgres and MUST be cached client-side so the read view still works offline. L4:
    v1 now requires an account to write; it MUST NOT require an account, login, or network
    round-trip to read a flow the user already has cached. RULE-L7 (telemetry carries no
    user content) is explicitly called out as more load-bearing than before, now that a
    server is in the loop.
Added principles:
  - VII "Compassion Over Compliance" — the non-punitive gamification design contract for
    Daily Sadhana: streaks pause and never zero, no guilt/shame/urgency/countdown copy,
    every lapse response offers a smaller re-entry, rest is a first-class recordable state,
    enforced by a CI copy-lint.
  - VIII "Consent-Scoped Visibility" — replaces the v2.0.0 blanket "no student-identifying
    information" posture, which cannot survive cohorts. Splits practice *content* (author-only,
    forever) from practice *signals* (teacher-visible by default within a cohort, revocable in
    one interaction), enforced structurally (table/RLS separation), never in application code.
Removed sections: RULE-O1 (no-paywall-ever) — retired, not replaced; monetization is now
  a first-class, constitutionally-sanctioned part of the product.
Templates reviewed:
  ✅ .specify/templates/plan-template.md — generic ("[Gates determined based on
    constitution file]"), no principle-specific text to update; Constitution Check gates
    for `002`–`006` will be authored fresh against this version when their plan.md files
    are generated.
  ✅ .specify/templates/spec-template.md — generic placeholder structure, no changes needed.
  ✅ .specify/templates/tasks-template.md — generic placeholder structure, no changes needed.
  ✅ DECISIONS.md — amendment entry recorded.
  ✅ docs/krama-v0.1-spec.md — annotated as historical, superseded by the v1.0 feature set.
Deferred TODOs: none. The v0.2 carryover rules (RULE-S1/S2, RULE-T2, RULE-H2/H3/H4,
  RULE-E1/E3) are untouched by this amendment — they still describe the AI-proposal
  surface parked per DECISIONS.md, and remain non-binding until that surface ships.
-->

# Yoga Kit Constitution

## Core Principles

### I. Safety is Sovereign

Contraindications, injuries, and accessibility constraints are hard rules. No stylistic
preference, dimension setting, AI suggestion, or override from any other system component
may produce a sequence that violates a stated safety constraint. When a safety rule and
any other concern conflict, the safety rule wins — silently, unconditionally, and always.

**v0.1 scope note:** v0.1 ships no teacher-stated constraint input (no roster, no
contraindication flags) — that surface is v0.2. RULE-S2 therefore has nothing to act on
yet; it governs the day that input exists. v0.1's "validator lite" (laterality warning,
no-closing-stillness warning) is craft guidance, not a safety enforcement layer, and MAY
surface without blocking a save or export.

**Testable rules:**

- RULE-S1: Once teacher-stated constraints exist (v0.2), the safety layer MUST run as
  the final stage of every sequence-generation pipeline call. A sequence MUST NOT be
  surfaced to the UI before it passes validation.
- RULE-S2: Once teacher-stated constraints exist (v0.2), any contraindication listed in
  the teacher's session (injury, pregnancy, condition, accessibility need) MUST cause
  the offending pose to be removed or replaced — never downgraded to a warning.
- RULE-S3: Any safety-enforcing module MUST be a pure, deterministic TypeScript module
  with no external I/O. Its unit test suite MUST include adversarial cases where an
  upstream proposal violates every category of constraint; all MUST be caught.
- RULE-S4: The deterministic engine MUST produce a safe, coherent flow without any AI
  layer present. AI unavailability is not a safety failure — v0.1 has no AI layer at all.
- RULE-S5: Props declared unavailable by the teacher MUST block all poses that require
  those props unless a prop-free variation or modification exists in the pose record.

### II. The Teacher Decides; the App Proposes

Every suggestion the app generates is editable, swappable, and explainable. The app is
never a black box. For any app-generated structure, the teacher MUST be able to see a
plain-language "why" and override it with no friction. The app's role is leverage, not
authority.

**v0.1 scope note:** v0.1 has no AI proposal stage and no per-pose "alternates" feature
(that is v0.2's Suggest button). The only app-generated reasoning in v0.1 is the friction
engine's `reasons[]` and the template line it renders on the seam indicator. Teacher-
authored notes and cues are never generated by the app and are always editable by
definition.

**Testable rules:**

- RULE-T1: Every app-generated seam indicator MUST carry a human-readable `reasons[]`
  explaining the friction score in terms of pose geometry deltas (contact, orientation,
  center-of-gravity, spine, plane).
- RULE-T2 (deferred to v0.2): Once the Suggest button ships, every suggested pose MUST
  expose at least one alternate the teacher can accept with a single interaction.
- RULE-T3: Any app-generated transition reasoning MUST be derived, not authored — a
  template string built from measured deltas between adjacent poses, never invented
  prose about movement or teacher voice.
- RULE-T4: Hold times (breaths or seconds), notes, and phase names MUST be directly
  editable by the teacher without re-running any derivation.
- RULE-T5: No app-generated content may be presented as fixed or un-overridable in the
  UI. Every derived field MUST be user-editable or user-overridable.

### III. Deterministic Authority, AI Optional

v0.1 ships a fully deterministic engine: derived structure (the friction/seam calculation)
runs entirely from Tier-1 pose geometry, with no AI call anywhere in the critical path.
The engine proposes structure with derived reasoning; it never authors cues, movement
names, or teacher voice — that is the teacher's role, always. When an AI layer returns in
v0.2 (the Suggest button and beyond), it may only *propose*; the deterministic engine and
any safety layer remain downstream, authoritative, and unconditionally in control of what
reaches the teacher. This order is immutable — no configuration, feature flag, or future
addition may let an AI proposal reach the UI unfiltered.

This principle is unaffected by the platform expansion in v1.0: the friction engine
remains a pure client-side TypeScript module with no database dependency and no network
call. Moving flows and sadhana data into Postgres does not move the engine — it stays
precomputable, testable in isolation, and free of I/O.

**Testable rules:**

- RULE-H1: The friction/seam calculation MUST be a pure function over Tier-1 pose fields,
  precomputable at build time, with an explicit typed input/output contract.
- RULE-H2 (binding once AI returns in v0.2): Any AI output MUST pass through the
  deterministic engine and safety layer before reaching the UI. Direct paths from AI
  output to UI are forbidden.
- RULE-H3 (binding once AI returns in v0.2): If the safety layer rejects or modifies a
  sequence, the final output MUST reflect the safety-corrected version, not the AI draft.
- RULE-H4 (binding once AI returns in v0.2): The AI layer MUST be treated as untrusted
  input by all downstream stages. No downstream stage may assume AI output is
  well-formed.
- RULE-H5: The engine's tunable weights (e.g. friction term weights) MUST live in one
  exported constant, not be scattered through logic — tuning is data, not code.
- RULE-H6: The friction engine and validator-lite MUST NOT read from or write to
  Postgres, IndexedDB, or any network resource. They accept pose/flow data as typed
  in-memory arguments and return typed in-memory results, regardless of where that data
  is persisted upstream.

### IV. Embodied Intelligence

A good sequence connects concept to embodied experience. Pose selection, phase grouping,
breath cues, and (in v0.2+) energetic framing MUST reinforce one another. A sequence that
reads like a random list of poses violates this principle, even if it passes safety
validation.

**v0.1 scope note:** v0.1 has no AI-authored theme statement or philosophical framing —
coherence in v0.1 comes from the six-phase template and the friction-guided seam
indicator, both teacher-directed. RULE-E1/E3 below apply once v0.2 introduces
app-generated thematic content.

**Testable rules:**

- RULE-E1 (deferred to v0.2): Any AI-generated sequence MUST include a theme statement
  that maps the chosen theme to body focus, energetic angle, and at least one
  philosophical framing or quote.
- RULE-E2: The friction engine MUST verify sequencing coherence (contact, orientation,
  center-of-gravity, spine, plane continuity) between adjacent poses using the single
  exported weights constant (see RULE-H5).
- RULE-E3 (deferred to v0.2): Any AI-generated "why" MUST reference at least one of the
  teacher's chosen dimensions. Generic anatomical description without dimensional
  context does not satisfy this rule.
- RULE-E4: Seam indicators MUST be derived from measured geometry deltas (contact,
  orientation, cog, spine, plane), never from arbitrary or random ordering, even if
  individually safe.

### V. Open Data, Sustainable Product

*(formerly "Free, Open, and Contributable")*

Yoga Kit's pose library, meridian/element mappings, and quote collection live in the
open-source repository as version-controlled data, structured so the community can
extend them via pull requests, regardless of whether the application built on top of
that data is free or paid. All content MUST be properly attributed; copyrighted
translations MUST NOT be reproduced without license. As of v3.0.0, the application is a
commercial, entitlement-gated product — the data stays open anyway. Openness of the
underlying knowledge and monetization of the product built on it are not in tension:
this principle exists precisely to keep them separable in perpetuity.

**Testable rules:**

- RULE-O2: The pose library, meridian data, and quotes MUST reside in the repository
  as plaintext (JSON, MDX, or YAML) with a schema documented for contributors.
- RULE-O3: Every pose record MUST include a `source` or `lineage` attribution field.
  Every quote MUST include an `attribution` field. Records without attribution MUST
  fail CI validation.
- RULE-O4: Copyrighted material (translations, brand names, trademarked sequence names)
  MUST NOT appear in the data files without explicit license documentation.
- RULE-O5: The contributing guide MUST document the schema for adding poses and quotes,
  and CI MUST validate new contributions against that schema.
- RULE-O6: The pose, meridian, and quote data files, and their JSON schemas, MUST remain
  readable and forkable without an account, a subscription, or any entitlement check —
  regardless of what the hosted application charges for. A server-side mirror of this
  data (e.g. a generated `poses` table for query performance) MUST be derived from these
  files, never the other way around, and MUST carry no write policy other than the
  generation job itself.
- RULE-O7: Entitlement and billing logic MUST gate application *features* (composing,
  cloud sync, teacher dashboards, org seats) — never the underlying open data files, and
  never a person's ability to read a flow or practice record they already own.

### VI. Lightweight and Accessible

The app MUST be mobile-first (teachers use phones in the studio, and read their flow at
6am on a phone), fast, installable as a PWA, and usable offline for core functionality.
Infrastructure MUST be minimized: prefer local-first storage and static data over servers
and databases wherever it does not compromise the principles above.

**v1.0 scope note:** v1.0 introduces Supabase as the source of truth for user-authored
data (flows, sadhana, profile, org membership). This principle is not repealed by that
change — it is re-scoped from "no server, ever" to "the server is never a precondition
for reading what you already have." RULE-L3 and RULE-L4 below carry that distinction.

**Testable rules:**

- RULE-L1: The app MUST be installable as a Progressive Web App on iOS and Android.
- RULE-L2: Core functionality (composing, saving, and reading a flow) MUST work offline
  without a network connection, using the client-side cache described in RULE-L3.
- RULE-L3: The pose library MUST remain bundled/static client-side data (unchanged from
  v0.1). User-authored data (flows, sadhana check-ins, intentions, profile) is persisted
  server-side in Postgres as the source of truth, and MUST be mirrored into a
  client-side cache (IndexedDB) on every sync, so that reading previously-synced data
  never depends on a live network connection.
- RULE-L4: Authentication MUST be required to *write* new user data (create or modify a
  flow, record a check-in, join an org) but MUST NOT be required to *read* a flow or
  practice record already present in the client-side cache. The read view of a saved
  flow MUST work with no network and no re-authentication, exactly as in v0.1's 6am
  test.
- RULE-L5: If any AI API call exists (v0.2+), it MUST fail gracefully with a
  deterministic-engine-only fallback; the app MUST remain fully usable without it.
- RULE-L6: The app MUST achieve a Lighthouse mobile performance score >= 90 on the read
  view (the 6am, in-class use case).
- RULE-L7: Telemetry (e.g. Datadog RUM) MUST record page views, errors, and web vitals
  only. No pose names, flow titles, notes, check-in content, or any other
  user-authored content MAY be transmitted to a telemetry service. This rule is more
  load-bearing than in v0.1, now that a real backend and real accounts exist to
  accidentally instrument.

### VII. Compassion Over Compliance

*(new in v3.0.0)*

Daily Sadhana exists to increase the odds that a newly-graduated teacher keeps a
practice going through their first, hardest months — not to gamify attendance through
guilt. Every mechanic in the sadhana surface MUST be designed so that a person who lapses
feels invited back, never penalized for having stopped. This principle is the
behavioral-design non-negotiable that makes Daily Sadhana specifiable rather than vibes.

**Testable rules:**

- RULE-C1: No streak MAY be reset to zero as a consequence of a missed day. Streaks
  pause when a user's grace budget is exhausted; they never zero.
- RULE-C2: No notification, empty state, streak display, or lapse prompt MAY use guilt,
  shame, loss framing, urgency language, or a countdown. Absence of practice MUST be met
  with an invitation, never a penalty or a warning of loss.
- RULE-C3: Every lapse-response prompt (triggered after a user's declared lapse
  threshold) MUST offer re-entry at a commitment *smaller* than the one that was missed
  — e.g. a single breath, a single pose, or revisiting the original "why" — never a
  prompt to simply "catch up" or repeat the missed commitment.
- RULE-C4: Rest MUST be a valid, first-class practice state, distinct from a lapse, and
  MUST be recordable by the user as a deliberate choice, not merely inferred from
  absence.
- RULE-C5: User-facing copy in the Daily Sadhana surface MUST pass an automated CI
  copy-lint against a maintained banned-phrase list (guilt/shame/urgency/loss
  vocabulary). A PR introducing a banned phrase MUST fail CI, not merely warn.
- RULE-C6: Every milestone or streak celebration MUST be presented as an invitation to
  continue, never as a threshold the user must now defend against losing.

### VIII. Consent-Scoped Visibility

*(new in v3.0.0, replaces the v2.0.0 blanket "no student-identifying information" posture)*

v2.0.0 forbade any student-identifying information because v0.1 had no concept of a
student at all. v1.0 introduces cohorts, and a certifying body's legitimate need to see
whether its graduates are practicing. Those two facts are reconciled by drawing a hard
line between practice *content* and practice *signals*, and by enforcing that line
structurally — in the database schema and its row-level security policies — never as an
application-code check that a future refactor could quietly bypass.

**Testable rules:**

- RULE-V1: Practice *content* — journal entries, reflections, mood/energy notes, and
  free-text flow notes — MUST be visible only to the user who authored it. No role
  (teacher, org admin, or otherwise) may be granted read access to this content, at any
  visibility setting, under any configuration.
- RULE-V2: Practice content MUST be stored in tables with no column a policy could join
  against an org, cohort, or teacher role. The absence of that column, not application
  logic, is what makes RULE-V1 true. A schema reviewer MUST be able to verify RULE-V1
  by inspecting table structure alone.
- RULE-V3: Practice *signals* — check-in dates, streak state, practice counts, and
  milestone achievements — MAY be visible to a student's cohort teacher by default upon
  cohort enrollment. The student MUST be able to see, in plain language, exactly what is
  shared and with whom, and MUST be able to revoke that visibility in a single
  interaction, reachable from the primary practice screen (not only from settings).
- RULE-V4: Every visibility grant (e.g. a cohort enrollment's signal-sharing flag) MUST
  be represented as a row a user can directly modify or delete — never a derived or
  implicit permission with no corresponding record.
- RULE-V5: CI MUST include an automated test proving that a cohort teacher account,
  querying practice content tables for an enrolled student, receives zero rows or a
  permission-denied error — not merely that the application's UI omits displaying it.
- RULE-V6: Because a visibility grant may persist indefinitely until revoked, the
  discoverability of the revoke control is itself a compliance requirement: it MUST name
  the org/cohort in plain language and MUST NOT be buried more than one interaction deep
  from where the user reviews their own practice.

## Constraint Classification

Hard constraints (once teacher-stated constraint input ships in v0.2, MUST never be
violated by any pipeline stage):
- Contraindications, injuries, pregnancy/trimester
- Medical conditions: high blood pressure, glaucoma, vertigo, recent surgery
- Accessibility: chair-based practice, no floor transitions, limited range of motion
- Unavailable props

Soft preferences (v0.1: teacher-directed via phase/layer choices; v0.2+: also optimized
toward by an AI proposal, tradeable):
- Style, target body system, meridian emphasis, energetics, theme, goal
- Dosha and Five-Element seasonal weighting
- Intensity curve, pose complexity, density, yang/yin balance

**The distinction between hard and soft MUST be enforced in code, not convention.**
Once the safety layer exists (v0.2), it operates on hard constraints only; any rules/
proposal layer optimizes soft preferences. Misclassifying a hard constraint as soft is a
constitution violation.

**v3.0.0 addendum:** The content/signal distinction in Principle VIII is a parallel hard
line, drawn for privacy rather than safety, and MUST be enforced the same way — in table
structure and RLS policy, not in application-layer conditionals. Misclassifying practice
content as a signal (or vice versa) is a constitution violation of equal severity to
misclassifying a hard safety constraint as soft.

## Governance

- This constitution supersedes all other specifications, design documents, feature
  requests, and AI suggestions. When any artifact conflicts with a principle here, the
  constitution wins. `docs/krama-v0.1-spec.md` is the locked human-facing spec for v0.1
  and is retained as a historical record of the original local-first product; it is
  superseded, not deleted, by the v1.0 feature set (`specs/002-*` through `specs/006-*`)
  built under this constitution. `specs/001-krama-mvp-spec/` remains the machine-facing
  form of the v0.1 scope and MUST NOT be read as describing v1.0's scope.
- Amendments require: a documented rationale, an updated Sync Impact Report comment
  block, a version bump (MAJOR for principle removal or redefinition; MINOR for new
  principle or material expansion; PATCH for clarifications), and a review of all
  dependent templates.
- All PRs touching the friction engine, pose library schema, validator, RLS policies, or
  the Daily Sadhana UI MUST include a note confirming which constitution rules were
  verified. PRs touching RLS or any table under Principle VIII MUST link to the
  corresponding CI assertion (RULE-V5).
- Testable rules (RULE-*) MUST have corresponding automated tests or CI checks before
  the feature that touches them ships. Rules marked "deferred to v0.2" or "binding once
  AI returns" are recorded now for traceability but do not gate current CI.
- **v0.2 carryover:** RULE-S1/S2, RULE-T2, RULE-H2/H3/H4, and RULE-E1/E3 are written now
  so the AI-proposal surface, when it returns, is built against an authority order that
  is already agreed — not re-litigated. See `docs/DECISIONS.md` for the record of why
  the AI pipeline was parked rather than deleted, and for the record of the v3.0.0
  platform-expansion decision.
- Runtime development guidance lives in `CLAUDE.md` at the repository root.

**Version**: 3.0.0 | **Ratified**: 2026-06-22 | **Last Amended**: 2026-08-26
