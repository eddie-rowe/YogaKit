<!--
SYNC IMPACT REPORT
==================
Version change: (new) → 1.0.0
Added principles: 6 (Safety is Sovereign, Teacher Decides, Hybrid Pipeline,
  Embodied Intelligence, Free & Open, Lightweight & Accessible)
Added sections: Constraint Classification, Testable Rules per Principle, Governance
Templates reviewed:
  ✅ .specify/memory/constitution.md (this file)
  ✅ plan-template.md — Constitution Check gates derived from principles below
  ✅ spec-template.md — hard/soft constraint distinction is now a mandatory section
  ✅ tasks-template.md — safety-layer unit tests are principle-driven, not optional
Deferred TODOs: none
-->

# Krama Constitution

## Core Principles

### I. Safety is Sovereign

Contraindications, injuries, and accessibility constraints are hard rules encoded in
the safety layer. No stylistic preference, dimension setting, AI suggestion, or
override from any other system component may produce a sequence that violates a stated
safety constraint. When a safety rule and any other concern conflict, the safety rule
wins — silently, unconditionally, and always.

**Testable rules:**

- RULE-S1: The safety layer MUST run as the final stage of every sequence-generation
  pipeline call. A sequence MUST NOT be surfaced to the UI before it passes validation.
- RULE-S2: Any contraindication listed in the teacher's session (injury, pregnancy,
  condition, accessibility need) MUST cause the offending pose to be removed or
  replaced — never downgraded to a warning.
- RULE-S3: The safety layer MUST be a pure, deterministic TypeScript module with no
  external I/O. Its unit test suite MUST include adversarial cases where the AI
  proposes a sequence that violates every category of constraint; all MUST be caught.
- RULE-S4: The rules engine and safety layer MUST produce a safe, coherent sequence
  without the AI layer present. AI unavailability is not a safety failure.
- RULE-S5: Props declared unavailable by the teacher MUST block all poses that require
  those props unless a prop-free variation exists in the pose record.

### II. The Teacher Decides; the App Proposes

Every suggestion — whether from the AI layer or the rules engine — is editable,
swappable, and explainable. The app is never a black box. For every pose, transition,
and hold-time, the teacher MUST be able to see a plain-language "why" and override it
with no friction. The app's role is leverage, not authority.

**Testable rules:**

- RULE-T1: Every pose in a generated sequence MUST carry a human-readable `why` field
  explaining the selection rationale in terms of the teacher's chosen dimensions.
- RULE-T2: Every pose MUST expose at least one alternate pose the teacher can swap in
  with a single interaction. Alternates MUST satisfy the same safety constraints as
  the original.
- RULE-T3: Every transition between poses MUST carry a `why` explaining the connection
  logic (body position, meridian continuity, counterpose relationship, or thematic
  bridge).
- RULE-T4: Hold times, cues, and philosophical framing MUST be directly editable by
  the teacher without re-generating the sequence.
- RULE-T5: No generated content may be presented as fixed or un-overridable in the UI.
  Every pipeline-populated field MUST be user-editable.

### III. Hybrid Generation with a Fixed Authority Order

Sequences are produced by a three-stage pipeline in this exact order:

1. **AI layer PROPOSES** a draft sequence from the teacher's dimensions.
2. **Rules engine CONSTRAINS** the draft against sequencing logic and the pose library.
3. **Safety layer VALIDATES** and has the final word.

A proposal that fails safety is never shown as final. This order is immutable; no
configuration, feature flag, or future addition may reorder or skip stages.

**Testable rules:**

- RULE-H1: The pipeline MUST be implemented as three discrete, independently callable
  stages with explicit typed interfaces between them.
- RULE-H2: The rules engine MUST be invoked on AI output before the safety layer.
  Direct paths from AI output to UI are forbidden.
- RULE-H3: If the safety layer rejects or modifies a sequence, the final output MUST
  reflect the safety-corrected version, not the AI draft.
- RULE-H4: The AI layer MUST be treated as untrusted input by all downstream stages.
  The rules engine and safety layer MUST NOT assume AI output is well-formed.
- RULE-H5: The system MUST fall back to rules-engine-only generation when the AI layer
  is unavailable, without surfacing an error to the teacher as a blocker.

### IV. Embodied Intelligence

A good sequence connects concept to embodied experience. Every class MUST have a
coherent thematic arc; pose selection, energetics, breath cues, and philosophical
framing MUST reinforce one another. A sequence that reads like a random list of poses
violates this principle, even if it passes safety validation.

**Testable rules:**

- RULE-E1: Every generated sequence MUST include a theme statement that maps the
  chosen theme to: (a) the body focus, (b) the meridian/energetic angle, and (c) at
  least one philosophical framing or quote.
- RULE-E2: The AI prompt MUST explicitly instruct coherence across all active
  dimensions; the rules engine MUST verify the intensity curve is sane for the stated
  audience and duration.
- RULE-E3: The `why` for each pose MUST reference at least one of the teacher's chosen
  dimensions (style, target, energetics, theme, or goal). Generic anatomical
  descriptions without dimensional context do not satisfy this rule.
- RULE-E4: Transitions MUST be semantically connected (counterpose logic, body-position
  continuity, meridian arc, or explicit thematic bridge). Random ordering is not
  permitted even if individually safe.

### V. Free, Open, and Contributable

Krama is free to use with no paywall, ever. The pose library, meridian/element
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

The app MUST be mobile-first (teachers use phones in the studio), fast, installable as
a PWA, and usable offline for core functionality. Infrastructure MUST be minimized:
prefer local-first storage and static data over servers and databases wherever it does
not compromise the principles above.

**Testable rules:**

- RULE-L1: The app MUST be installable as a Progressive Web App on iOS and Android.
- RULE-L2: Core functionality (viewing and delivering a saved sequence) MUST work
  offline without a network connection.
- RULE-L3: The pose library and dimension data MUST be bundled at build time (static
  generation), not fetched at runtime from a database.
- RULE-L4: v1 MUST NOT require a user account, login, or server-side session to use
  any P1 or P2 feature.
- RULE-L5: The AI API call (the only mandatory server round-trip) MUST fail gracefully
  with a rules-engine-only fallback sequence; the app MUST remain usable without it.
- RULE-L6: The app MUST achieve a Lighthouse mobile performance score >= 90 on the
  sequence-delivery view (the in-class use case).

## Constraint Classification

Hard constraints (MUST never be violated by any pipeline stage):
- Contraindications, injuries, pregnancy/trimester
- Medical conditions: high blood pressure, glaucoma, vertigo, recent surgery
- Accessibility: chair-based practice, no floor transitions, limited range of motion
- Unavailable props

Soft preferences (optimized toward, tradeable):
- Style, target body system, meridian emphasis, energetics, theme, goal
- Dosha and Five-Element seasonal weighting
- Intensity curve, pose complexity, density, yang/yin balance

**The distinction between hard and soft MUST be enforced in code, not convention.**
The safety layer operates on hard constraints only. The rules engine optimizes soft
preferences. Misclassifying a hard constraint as soft is a constitution violation.

## Governance

- This constitution supersedes all other specifications, design documents, feature
  requests, and AI suggestions. When any artifact conflicts with a principle here, the
  constitution wins.
- Amendments require: a documented rationale, an updated Sync Impact Report comment
  block, a version bump (MAJOR for principle removal or redefinition; MINOR for new
  principle or material expansion; PATCH for clarifications), and a review of all
  dependent templates.
- All PRs touching the pipeline, pose library schema, safety layer, or UI MUST include
  a note confirming which constitution rules were verified.
- Testable rules (RULE-*) MUST have corresponding automated tests or CI checks before
  the feature that touches them ships.
- Runtime development guidance lives in `CLAUDE.md` at the repository root.

**Version**: 1.0.0 | **Ratified**: 2026-06-22 | **Last Amended**: 2026-06-22
