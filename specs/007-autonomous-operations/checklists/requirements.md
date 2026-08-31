# Specification Quality Checklist: Autonomous Operations

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

Ports patterns B1-B4 and B7 from
`docs/BEST_PRACTICES_FROM_NEXTMOVE.md`. Merged into one feature rather than five because they
form a single capability — a loop that cannot run unattended is not four-fifths useful — and
because splitting would have produced specifications that are not independently shippable.

Both open questions were resolved and recorded under **Assumptions**:

- Who merges the loop's pull requests: request the repository host's auto-merge-when-green, and
  fall back to the bounded check-then-merge already required when that owner-gated setting is off.
  Neither path may merge a pull request whose checks are failing or unknown.
- How long an unattended stretch is: a thirty-day design target, matching the longest observed run
  in the source repository, with an owner-digest escalation ladder at one, three, and seven days.

Constitution surface: this feature adds enforcement, not product behaviour. FR-003 requires the
session-end gates and continuous integration to agree on what fails — which is what caught the
existing lint step that can never fail the build, and why removing a check that cannot fail is
stated as a requirement rather than left as a note.

Out of scope by design: the source repository's business machinery — customer tracking, payment
and commerce integrations, outreach tooling. Only the operating patterns port.

**Flag conventions.** Deferred judgment calls are greppable across all of `specs/00[3-9]-*/`:
`[OWNER SIGN-OFF]` needs a copy or constitution sign-off before that part ships;
`[WILL NOT BUILD]` is a decision closed rather than deferred; `[SCHEMA IMPACT]` changes a data
shape; `[DEFERRED TO IMPLEMENTATION]` is a design-system detail, not a product decision;
`[DEPENDENCY: NNN]` names another feature this partly depends on. Each flag is written so the
specification still holds if the flagged call is overruled — no requirement is contingent on one.
