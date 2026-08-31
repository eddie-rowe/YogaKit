# Specification Quality Checklist: Voice & Copy Lint

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

Ports pattern B6 from
`docs/BEST_PRACTICES_FROM_NEXTMOVE.md`, and additionally builds the copy-lint that RULE-C5
mandates. That promotion is the one place this ladder departs from the source document's own
priority: RULE-C5 is the only constitution rule with a mandated automated enforcement and no
implementation anywhere in the repository, which makes this feature P1 rather than a polish item,
and makes it a prerequisite for `005` being measurable at all.

The open question was resolved and recorded under **Assumptions**: the copy-lint scopes by file
location at adoption — the user-facing route and component directories, which is the surface
RULE-C5 names — plus the documented marker-based exception for a string that must be exempt.
Extraction from rendered output is rejected: it would make the lint depend on a running
application, putting it on the wrong side of the deterministic-check line.

Constitution surface: RULE-C2 and RULE-C5 directly. Deliberately excluded: persona and
success-signal documents, which inform prioritisation rather than voice, and bundling them would
blur this feature's completion condition.

**Flag conventions.** Deferred judgment calls are greppable across all of `specs/00[3-9]-*/`:
`[OWNER SIGN-OFF]` needs a copy or constitution sign-off before that part ships;
`[WILL NOT BUILD]` is a decision closed rather than deferred; `[SCHEMA IMPACT]` changes a data
shape; `[DEFERRED TO IMPLEMENTATION]` is a design-system detail, not a product decision;
`[DEPENDENCY: NNN]` names another feature this partly depends on. Each flag is written so the
specification still holds if the flagged call is overruled — no requirement is contingent on one.
