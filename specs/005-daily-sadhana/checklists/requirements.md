# Specification Quality Checklist: Daily Sadhana

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-31
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

All 13 open decisions from `design-input.md` were ratified at their
recommended defaults and recorded under **Assumptions**. Five carry flags:

- Decision 3 — no streak repair mechanic: `[WILL NOT BUILD]`, closed rather than deferred
- Decision 6 — guidance tone: `[OWNER SIGN-OFF]`, a short copy style note is owed before any
  guidance content is authored, so the corpus and the copy-lint are written against one stance
- Decision 7 — authored static guidance priority: `[SCHEMA IMPACT]` on the guidance frontmatter
- Decision 13 — the undo toast's tokens: `[DEFERRED TO IMPLEMENTATION]`
- Decision 9 — pre-grant disclosure at enrollment:
  `[DEPENDENCY: BLOCKED — enrollment UI does not exist]`. This is the only true external
  blocker on the ladder: `002` created the enrollment sharing column but not the join flow, so
  there is no moment at which to disclose. The feature therefore ships the visible pill, the
  plain-language sheet, and the one-interaction revoke (FR-044 to FR-051) as the standing
  protection, and the disclosure ships with the enrollment flow whenever it is scoped.

Constitution surface — this is the feature's primary constitutional load:

- Principle VII / RULE-C1 to C6: FR-015 (never decreases, never returns to zero), FR-016 and
  FR-017 (no warning colour, no countdown, no missed-day count, no reset-to-zero visual), FR-011
  to FR-014 (rest as a first-class state at equal weight), FR-021 to FR-024 (milestones as
  invitations, nothing to defend, no repair mechanic), FR-025 (the copy-lint is
  continuous-integration gating on every string, and `009` is the feature that builds it)
- Principle VIII / RULE-V1 to V6: FR-009 (practice content author-only, structural), FR-044 to
  FR-052 (per-enrollment, plain-language, one-interaction revoke), FR-055 (the dashboard never
  requests a content field — structural, not hidden), FR-056 (the RULE-V5 test asserting a
  cohort-teacher query against practice-content tables returns zero rows or is refused)

Test-identifier contract: FR-065 records the accepted exception. The five retired navigation
identifiers, the guardrails table, and every affected walk test change in one commit, not as a
follow-up.

Cross-feature note: FR-025 makes this feature's completion depend on `009`'s copy-lint existing.
That ordering is deliberate — `009` is small and unblocks the gate this feature is measured by.

**Flag conventions.** Deferred judgment calls are greppable across all of `specs/00[3-9]-*/`:
`[OWNER SIGN-OFF]` needs a copy or constitution sign-off before that part ships;
`[WILL NOT BUILD]` is a decision closed rather than deferred; `[SCHEMA IMPACT]` changes a data
shape; `[DEFERRED TO IMPLEMENTATION]` is a design-system detail, not a product decision;
`[DEPENDENCY: NNN]` names another feature this partly depends on. Each flag is written so the
specification still holds if the flagged call is overruled — no requirement is contingent on one.
