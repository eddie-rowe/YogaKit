# Requirements Quality Checklist: Krama MVP

**Purpose**: "Unit tests for requirements" — validate that the spec is complete,
unambiguous, consistent, and measurable before planning begins.
**Created**: 2026-06-22
**Feature**: [spec.md](../spec.md)
**Focus areas**: Safety requirements, hybrid pipeline, data model, privacy, performance,
scenario coverage, acceptance criteria measurability.

---

## Safety Requirements Quality

- [ ] CHK101 Are contraindication categories exhaustively enumerated, or does "injuries"
  leave ambiguous scope for the rules engine to implement? [Clarity, Spec §FR-003,
  §Hard Constraints]

- [ ] CHK102 Is "cause the offending pose to be removed or replaced" (FR-015) precise
  enough — who selects the replacement, and is there a requirement for what makes a
  valid replacement? [Clarity, Spec §FR-015]

- [ ] CHK103 Is "appropriate for the stated audience level" (FR-015, intensity curve)
  quantified with a measurable definition, or is it left to implementer discretion?
  [Ambiguity, Spec §FR-015]

- [ ] CHK104 Are requirements defined for what happens when NO valid replacement exists
  for a contraindicated pose — is the sequence still emittable with a gap, or must the
  pipeline abort? [Edge Case, Gap]

- [ ] CHK105 Are the "hard constraint" categories (injuries, conditions, accessibility,
  props) the complete exhaustive list, or could future categories (e.g., religious
  prohibitions, cultural adaptations) arrive and need a mechanism? [Completeness,
  Spec §Constraint Classification]

- [ ] CHK106 Is there a requirement specifying that constraint-checking is repeatable
  and deterministic — same inputs always produce the same safety outcome? [Clarity, Gap]

- [ ] CHK107 Are prop-free variation requirements defined — must every pose have a
  prop-free variation, or only some? [Completeness, Spec §FR-005, §FR-009]

---

## Hybrid Pipeline Requirements Quality

- [ ] CHK108 Is the interface between the AI layer and the rules engine defined at the
  requirements level — what data structure passes between stages — or is this deferred
  to design? [Completeness, Spec §FR-004, Gap]

- [ ] CHK109 Is "AI layer MUST be treated as untrusted input" (A-010) captured as a
  functional requirement (FR-004 series) or only as an assumption? Assumptions are not
  enforced by tests. [Traceability, Spec §A-010]

- [ ] CHK110 Are requirements defined for what the rules engine specifically constrains
  (bilateral symmetry, intensity curve, transition logic) separately from what the
  safety layer validates (contraindications)? Are these two domains clearly separated in
  the spec? [Clarity, Spec §FR-004, §FR-015]

- [ ] CHK111 Is the fallback quality guarantee specified — when the rules engine runs
  without the AI layer, what quality standard must the resulting sequence meet (e.g.,
  "must still satisfy all chosen dimensions, even if thematic richness is reduced")?
  [Completeness, Spec §FR-006, §SC-006]

- [ ] CHK112 Are requirements for the "why" field specified separately for AI-assisted
  vs. rules-engine-only generation — does the "why" remain required in fallback mode?
  [Consistency, Spec §FR-012, §FR-006]

---

## Data Model & Pose Library Requirements Quality

- [ ] CHK113 Is "40 yin poses minimum" (FR-010) the right completeness threshold for
  P1, or is a coverage requirement (e.g., "must cover all 12 primary meridians") more
  meaningful? Is coverage defined? [Measurability, Spec §FR-010]

- [ ] CHK114 Is the "yin mode / yang mode / both" distinction (FR-011) defined with
  measurable criteria? What makes a pose expression "yin" vs. "yang" in the library
  schema — hold time range? Tissue target? Both? [Clarity, Spec §FR-011]

- [ ] CHK115 Are slug uniqueness requirements defined for the contribution workflow —
  what is the required format (lowercase, hyphens only, max length)? [Clarity,
  Spec §Clarifications, §Pose entity]

- [ ] CHK116 Are meridian data requirements specified — is a meridian a tag (liver,
  gallbladder) or a structured record (meridian pair, element, season, organ)? Does the
  spec say enough for a contributor to model a meridian correctly? [Completeness, Gap]

- [ ] CHK117 Are "natural counterposes and rebound poses" defined with a schema
  requirement — is this a list of pose slugs, a free-text description, or both? [Clarity,
  Spec §FR-009]

- [ ] CHK118 Is the "default hold time range" requirement for yin poses specified with
  units and a realistic range (e.g., 2–5 min)? Is a minimum hold time threshold
  defined for what qualifies as a "yin" expression? [Completeness, Spec §FR-009]

- [ ] CHK119 Are energetic quality values (grounding, opening, cooling, heating)
  enumerated or left as free text? Free-text energetics cannot drive algorithmic
  filtering. [Clarity, Spec §FR-009, Gap]

---

## Dimension Input Requirements Quality

- [ ] CHK120 Are the dimension fields and their allowed values enumerated in the spec
  or only named? For example: what are the valid "dosha" values? What are the valid
  Five-Element values? A builder cannot implement a form from names alone. [Completeness,
  Spec §FR-001, Gap]

- [ ] CHK121 Is the interaction between correlated dimensions defined — e.g., if
  "season=Winter" is set, does it automatically suggest "meridian=Kidney/Bladder" or
  are these always independent? [Clarity, Gap]

- [ ] CHK122 Is "intensity curve shape" (mentioned in BLOCK 2 dimensions) included in
  FR-001? Is it defined in the spec with allowed values (bell curve, plateau, gradual
  ramp, etc.)? [Completeness, Spec §FR-001, Gap]

- [ ] CHK123 Are requirements for dimension defaults specified — what does a "sensible
  default" mean for each dimension? Are defaults documented in the spec? [Clarity,
  Spec §FR-002, Gap]

---

## Privacy & Security Requirements Quality

- [ ] CHK124 Is "anonymized to categorical descriptors" (FR-006b, SC-012) defined with
  a concrete example of what categorization looks like, so developers know what
  NOT to include in AI prompts? [Clarity, Spec §FR-006b]

- [ ] CHK125 Is there a requirement for what happens if a teacher accidentally types
  identifying information into the constraints field (e.g., "John Smith has a hip
  replacement")? Is input sanitization or a UI warning required? [Edge Case, Gap]

- [ ] CHK126 Are data retention requirements defined for locally stored sequences and
  constraint data — is there a maximum age, a clear-all mechanism, or a data deletion
  flow? [Completeness, Gap]

- [ ] CHK127 Is the AI API key security requirement specified at the spec level (even
  tech-agnostically as "AI service credentials must not be accessible to clients")?
  [Completeness, Gap]

---

## Performance Requirements Quality

- [ ] CHK128 Is "under 30 seconds" (SC-010, FR-006a) defined for what percentile — is
  this a P50, P95, or P99 target? [Clarity, Spec §SC-010, §FR-006a]

- [ ] CHK129 Is AI generation performance specified for what network conditions —
  is the 30-second target for a mobile network, WiFi, or both? [Clarity, Spec §FR-006a]

- [ ] CHK130 Is "under 5 seconds" for rules-engine fallback (SC-011) specified for a
  minimum pose library size — is this target valid only for the 40-pose P1 seed or
  for any future library size? [Completeness, Spec §SC-011]

- [ ] CHK131 Is the Lighthouse ≥ 90 performance target (RULE-L6 in constitution) also
  captured as a spec-level success criterion? [Traceability, Gap]

---

## Scenario & Acceptance Criteria Quality

- [ ] CHK132 Are acceptance scenarios defined for the "AI unavailable" fallback path in
  US1 — does the given/when/then for this scenario exist in the spec? [Coverage, Gap]

- [ ] CHK133 Is a "first-time user / empty state" scenario defined — what does the
  teacher see before they have generated any sequence? [Coverage, Gap]

- [ ] CHK134 Are acceptance criteria for the in-class timer view (US6) specific enough
  to determine "large enough to read from arm's length" measurably — is a minimum
  font size or viewport distance specified? [Measurability, Spec §US6]

- [ ] CHK135 Are success criteria defined for the explainability requirement (every pose
  "why" references at least one dimension) — is SC-003 testable by reading the spec
  alone? [Measurability, Spec §SC-003]

- [ ] CHK136 Is US2 (safety constraints enforce themselves) testable independently
  without relying on US1 (compose a class) being complete first? [Coverage, Spec §US2]

---

## Completeness & Consistency

- [ ] CHK137 Are "breath and meditation bookends" (listed as P2 features in BLOCK 2)
  captured as P2 functional requirements in the spec, or are they missing? [Completeness,
  Gap]

- [ ] CHK138 Are "soundscape/playlist suggestion" and "lighting and temperature notes"
  (P2 features from BLOCK 2) represented in the spec as P2 stories or assumptions?
  [Completeness, Gap]

- [ ] CHK139 Is the student handout output form factor (listed in BLOCK 2) captured as
  a requirement — is it P1, P2, or explicitly deferred? [Completeness, Gap]

- [ ] CHK140 Are visualization features (sankey/flow, intensity curve — listed as P3
  in BLOCK 2) explicitly listed as out of scope for P1/P2 in the spec, or simply
  absent? Absent is not the same as explicitly deferred. [Clarity, Gap]

- [ ] CHK141 Are bilateral symmetry requirements for the timer view (US6) specified —
  does the timer advance one side at a time for bilateral poses, or both simultaneously?
  [Completeness, Spec §US6, Gap]

- [ ] CHK142 Is there a requirement stating that the personal library (P2) persists
  across device restarts and not just within a session? [Clarity, Spec §US5,
  Spec §FR-021]

## Notes

- CHK103, CHK120, CHK122, CHK123 are the highest-priority gaps — vague dimension
  values and defaults will block implementation most directly.
- CHK116 (meridian schema) is critical for the pose library seed work; this should be
  resolved before any data modeling begins.
- CHK125 (accidental PII in constraints) and CHK126 (local data retention) are
  medium-priority privacy gaps that should be addressed before ship.
- CHK138–CHK141 are tracking gaps for P2/P3 features that were mentioned in BLOCK 2
  but not yet captured in the spec; they will not block P1 implementation.
