<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 2.0.0 (MAJOR — principle III redefined, principle removed
  its mandatory-AI framing, safety/explainability rules rescoped)
Rationale: docs/krama-v0.1-spec.md (locked spec, 2026-08-17) reframes v0.1 as a
  deterministic, teacher-authored tool. No AI runs at generation time in v0.1; the
  three-stage AI pipeline built for the prior spec is parked for v0.2 ("Suggest").
  This amendment makes the constitution match the spec that is actually shipping.
Modified principles:
  - III renamed "Hybrid Generation with a Fixed Authority Order" →
    "Deterministic Authority, AI Optional" — the friction engine, not an AI proposal
    stage, is now the mandatory pipeline; AI returns in v0.2 as an untrusted proposer.
  - I "Safety is Sovereign" — RULE-S2 rescoped: v0.1 ships no teacher-stated
    constraint input (no roster), so the hard-constraint removal rule applies only
    once that input exists (v0.2). Validator-lite's two warnings are craft
    guidance, not safety enforcement, and MAY surface without blocking.
  - II "The Teacher Decides; the App Proposes" — RULE-T1/T3 rescoped to apply to
    app-generated content (friction reasons, template reasoning lines), not to
    teacher-authored notes/cues, which the app never generates in v0.1. RULE-T2
    (alternates) deferred to v0.2.
  - IV "Embodied Intelligence" — E1/E2/E3 rescoped the same way; added a rule that
    friction weights live in one exported constant.
  - VI "Lightweight and Accessible" — RULE-L6 retargets from "sequence-delivery
    view" to the v0.1 read view (the actual in-class artifact).
Added principles: none (six principles retained, three re-scoped, one redefined)
Added sections: none structural; added a v0.2 Carryover note under Governance
Removed sections: none
Templates reviewed:
  ✅ .specify/memory/constitution.md (this file)
  ⚠ plan-template.md — Constitution Check gates should be re-derived from principles
    below when specs/001-krama-mvp-spec/plan.md is next rewritten (tracked in
    docs/DECISIONS.md)
  ⚠ spec-template.md — hard/soft constraint section still accurate; P1 stories are
    being rewritten in specs/001-krama-mvp-spec/spec.md to match this amendment
  ⚠ tasks-template.md — safety-layer/rules-engine task framing needs updating to
    friction-engine/validator-lite framing when tasks.md is next regenerated
Deferred TODOs: re-derive Constitution Check table in plan.md; regenerate tasks.md
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

### V. Free, Open, and Contributable

Yoga Kit is free to use with no paywall, ever. The pose library, meridian/element
mappings, and quote collection live in the open-source repository as version-controlled
data, structured so the community can extend them via pull requests. All content MUST
be properly attributed; copyrighted translations MUST NOT be reproduced without license.

**Testable rules:**

- RULE-O1: The application MUST be deployable and fully functional without a paid
  subscription, account, or license key.
- RULE-O2: The pose library, meridian data, and quotes MUST reside in the repository
  as plaintext (JSON, MDX, or YAML) with a schema documented for contributors.
- RULE-O3: Every pose record MUST include a `source` or `lineage` attribution field.
  Every quote MUST include an `attribution` field. Records without attribution MUST
  fail CI validation.
- RULE-O4: Copyrighted material (translations, brand names, trademarked sequence names)
  MUST NOT appear in the data files without explicit license documentation.
- RULE-O5: The contributing guide MUST document the schema for adding poses and quotes,
  and CI MUST validate new contributions against that schema.

### VI. Lightweight and Accessible

The app MUST be mobile-first (teachers use phones in the studio, and read their flow at
6am on a phone), fast, installable as a PWA, and usable offline for core functionality.
Infrastructure MUST be minimized: prefer local-first storage and static data over servers
and databases wherever it does not compromise the principles above.

**Testable rules:**

- RULE-L1: The app MUST be installable as a Progressive Web App on iOS and Android.
- RULE-L2: Core functionality (composing, saving, and reading a flow) MUST work offline
  without a network connection.
- RULE-L3: The pose library and flow data MUST be bundled/persisted client-side (static
  generation plus local storage), not fetched at runtime from a database.
- RULE-L4: v1 MUST NOT require a user account, login, or server-side session to use any
  P1 or P2 feature.
- RULE-L5: If any AI API call exists (v0.2+), it MUST fail gracefully with a
  deterministic-engine-only fallback; the app MUST remain fully usable without it.
- RULE-L6: The app MUST achieve a Lighthouse mobile performance score >= 90 on the read
  view (the 6am, in-class use case).
- RULE-L7: Telemetry (e.g. Datadog RUM) MUST record page views, errors, and web vitals
  only. No pose names, flow titles, notes, or any other user-authored content MAY be
  transmitted to a telemetry service.

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

## Governance

- This constitution supersedes all other specifications, design documents, feature
  requests, and AI suggestions. When any artifact conflicts with a principle here, the
  constitution wins. `docs/krama-v0.1-spec.md` is the locked human-facing spec for v0.1;
  `specs/001-krama-mvp-spec/` is its derived, machine-facing form and MUST NOT contradict
  it or this constitution.
- Amendments require: a documented rationale, an updated Sync Impact Report comment
  block, a version bump (MAJOR for principle removal or redefinition; MINOR for new
  principle or material expansion; PATCH for clarifications), and a review of all
  dependent templates.
- All PRs touching the friction engine, pose library schema, validator, or UI MUST
  include a note confirming which constitution rules were verified.
- Testable rules (RULE-*) MUST have corresponding automated tests or CI checks before
  the feature that touches them ships. Rules marked "deferred to v0.2" or "binding once
  AI returns" are recorded now for traceability but do not gate v0.1 CI.
- **v0.2 carryover:** RULE-S1/S2, RULE-T2, RULE-H2/H3/H4, and RULE-E1/E3 are written now
  so the AI-proposal surface, when it returns, is built against an authority order that
  is already agreed — not re-litigated. See `docs/DECISIONS.md` for the record of why
  the AI pipeline was parked rather than deleted.
- Runtime development guidance lives in `CLAUDE.md` at the repository root.

**Version**: 2.0.0 | **Ratified**: 2026-06-22 | **Last Amended**: 2026-08-17
