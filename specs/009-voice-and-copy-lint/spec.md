# Feature Specification: Voice Standard & Copy-Lint Enforcement

**Feature Branch**: `009-voice-and-copy-lint`
**Created**: 2026-08-31
**Status**: Draft
**Input**: User description: "Port pattern B6 from `docs/BEST_PRACTICES_FROM_NEXTMOVE.md` — write down the voice standard the constitution already half-specifies, and build the automated copy-lint that RULE-C5 mandates but which does not currently exist anywhere in the repository. The constitution's Principle VII already forbids guilt, shame, urgency, and countdowns (RULE-C2) and requires an automated CI copy-lint over the Daily Sadhana surface (RULE-C5); today that rule has no implementation. This feature closes that gap and gives the voice rules a single authority a human or an agent can check copy against before writing it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Coercive copy cannot reach the product (Priority: P1)

Someone — a human writing an empty state, or an agent generating a lapse prompt — writes
copy that leans on guilt, shame, urgency, or a countdown. An automated check refuses it
before it ships, names the offending string and the rule it breaks, and does so in
continuous integration rather than relying on a reviewer noticing.

**Why this priority**: RULE-C5 requires this check and it does not exist. It is the only
constitution rule with a mandated automated enforcement that is currently unimplemented,
which means the repository's most distinctive product promise — that a practice tool will
not use shame as a motivator — is protected by convention alone. It is also the story with
the shortest path to value: the check is useful the moment it exists, before any of the
surfaces it guards are built.

**Independent Test**: Can be fully tested with no user-facing surface built, by running
the check over a set of fixture strings — some compliant, some deliberately coercive — and
confirming it passes the first set and fails the second, naming the rule in each failure.

**Acceptance Scenarios**:

1. **Given** a string that uses guilt or shame to motivate practice, **When** the
   copy-lint runs, **Then** it fails, quotes the string, names its location, and names the
   rule broken.
2. **Given** a string that applies urgency or presents a countdown toward a loss,
   **When** the copy-lint runs, **Then** it fails for the same reason.
3. **Given** copy that invites a return to practice without implying a debt, **When**
   the copy-lint runs, **Then** it passes.
4. **Given** a streak display, **When** the copy-lint inspects it, **Then** any
   presentation of a streak returning to zero as a consequence of a missed day fails.
5. **Given** the copy-lint is part of continuous integration, **When** a pull request
   introduces coercive copy, **Then** the pull request's checks fail and the change cannot
   merge.
6. **Given** a string the check flags that is genuinely compliant, **When** its author
   needs to proceed, **Then** there is a documented, reviewable way to record the
   exception that is visible in the diff, rather than an unmarked silent bypass.

---

### User Story 2 - There is one authority to check copy against before writing it (Priority: P1)

A voice standard document states how the product speaks: the structure of a piece of
writing, the words and constructions to avoid, the hard constraints inherited from the
constitution, and how the standard relates to the other context files. Anyone — human or
agent — about to write user-facing copy or an operational brief has one place to look
first.

**Why this priority**: The check in Story 1 can only encode what is mechanically
detectable. Tone is not fully mechanisable, so the check is a floor and the standard is
the ceiling. Without the written standard, every judgment call gets re-litigated and the
check's rules look arbitrary rather than derived.

**Independent Test**: Can be fully tested by handing the standard to someone who has not
read the constitution and confirming they can correctly classify a set of sample strings
as compliant or not, and can say why.

**Acceptance Scenarios**:

1. **Given** the voice standard, **When** a writer consults it, **Then** it states the
   structure expected of a piece of writing, including where the decision or the ask
   belongs.
2. **Given** the voice standard, **When** a writer consults it, **Then** it lists the
   specific words and constructions that mark generated text and are to be removed.
3. **Given** the voice standard, **When** a writer consults it, **Then** the
   non-coercive rule appears as a hard constraint, not as a stylistic preference, and is
   traceable to the constitution principle it comes from.
4. **Given** the voice standard, **When** a reader reaches its end, **Then** it closes
   by stating how it is to be used alongside the constitution and the other repository
   context documents, so an agent knows when to consult which.
5. **Given** the repository's development guide, **When** a reader looks for the voice
   authority, **Then** the guide references the standard.
6. **Given** the voice standard and the constitution, **When** they are compared,
   **Then** the standard does not restate the constitution's substance; it points at it
   and adds only what the constitution leaves unwritten.

---

### User Story 3 - Operational writing is decision-first and honest (Priority: P2)

The digests, briefs, and reflections that the autonomous routines produce follow the same
standard: a short summary, why it matters, what needs deciding, and the evidence — in that
order. The owner returning after time away reads the decision first, not a narrative they
must mine.

**Why this priority**: It makes the daily brief from Feature 007 worth reading. It is P2
because the routines can produce useful output before the format is standardised, but the
value of that output degrades quickly as volume grows.

**Independent Test**: Can be fully tested by writing one brief to the standard and
confirming a reader can state the decision required within the first few lines, without
reading the evidence.

**Acceptance Scenarios**:

1. **Given** a routine-produced brief, **When** the owner reads it, **Then** the
   summary and the decisions required appear before the supporting evidence.
2. **Given** a period in which nothing shipped, **When** a brief covers it, **Then** it
   says so plainly and does not present activity as achievement.
3. **Given** a brief, **When** it makes a quantitative claim, **Then** the claim's
   source is identified so it can be checked.
4. **Given** a brief, **When** the voice standard's avoid-list is applied to it,
   **Then** it passes.

---

### Edge Cases

- What happens when a forbidden word appears in a legitimate non-copy context — a
  variable name, a pose description, a code comment, a dependency's changelog? The check
  must scope itself to user-facing copy and must not become noise, because a check that
  cries wolf gets bypassed.
- What happens when copy is composed at runtime from fragments, so no single source
  string is coercive but the assembled sentence is? The check cannot see this; the
  standard must, and the limitation must be stated rather than papered over.
- What happens when copy lives in data rather than in code — a quote, a reference
  sequence name, a pose's traditional description? Traditional and attributed material is
  not the product's own voice and must not be rewritten to satisfy a tone rule.
- What happens when a rest day and a lapse are described with the same words? The
  constitution makes rest a first-class state distinct from a lapse; copy that conflates
  them fails the standard even if no forbidden word appears.
- What happens when a milestone celebration reads as pressure to maintain the milestone?
  A celebration that creates an obligation is coercive in effect, which the standard must
  cover even where the check cannot detect it.
- What happens when the avoid-list itself needs to change? It is data about voice, and
  changing it changes what ships; it needs a review path, not an ad-hoc edit.
- What happens when copy is translated or localised? The check's rules are
  language-specific and would not transfer; the scope must say so rather than implying
  coverage it does not have.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST carry a written voice standard as a single document at
  a discoverable location, and the development guide MUST reference it.
- **FR-002**: The voice standard MUST state the expected structure of a piece of
  writing, including that the decision or the ask precedes the supporting evidence.
- **FR-003**: The voice standard MUST enumerate the specific words and constructions to
  avoid, including the vocabulary that characteristically marks generated text.
- **FR-004**: The voice standard MUST carry the non-coercive rule as a hard constraint,
  traceable to the constitution principle it derives from, and MUST NOT present it as a
  preference.
- **FR-005**: The voice standard MUST NOT duplicate the constitution's substance; where
  the constitution already rules, the standard MUST point at it.
- **FR-006**: The voice standard MUST close by stating how it is used alongside the
  constitution and the other repository context documents.
- **FR-007**: The voice standard MUST state its own limits — which tone judgments the
  automated check cannot make — so the check is not mistaken for full coverage.
- **FR-008**: An automated copy-lint MUST exist and MUST run in continuous integration,
  failing the build when it finds a violation.
- **FR-009**: The copy-lint MUST detect copy that motivates through guilt or shame.
- **FR-010**: The copy-lint MUST detect copy that applies urgency, or that presents a
  countdown toward losing something.
- **FR-011**: The copy-lint MUST detect any presentation of a streak resetting to zero
  as a consequence of a missed day.
- **FR-012**: The copy-lint MUST detect copy that conflates rest with lapse, to whatever
  extent that is mechanically detectable, and the voice standard MUST cover the remainder.
- **FR-013**: Every copy-lint failure MUST quote the offending string, name its
  location, and name the rule broken. A failure that only reports a count is insufficient.
- **FR-014**: The copy-lint MUST be scoped to user-facing copy and MUST NOT flag
  identifiers, code comments, test fixtures, or dependency content.
- **FR-015**: The copy-lint MUST NOT apply its tone rules to traditional, quoted, or
  attributed material — pose descriptions, quotes, and reference sequence names are not
  the product's own voice.
- **FR-016**: The copy-lint MUST provide a documented exception mechanism that is
  visible in the diff and reviewable, and MUST NOT permit an unmarked silent bypass.
- **FR-017**: The copy-lint's rule set MUST live in one place as data rather than being
  spread through its implementation, so that tuning voice is a data change.
- **FR-018**: A change to the copy-lint's rule set MUST reach the product through the
  repository, reviewable as a diff.
- **FR-019**: The copy-lint MUST be runnable locally by the same command continuous
  integration uses, so a failure is reproducible before pushing.
- **FR-020**: The copy-lint MUST be included in the session-end gates defined by Feature
  007, so an unattended session cannot finish having introduced coercive copy.
- **FR-021**: The copy-lint MUST have its own unit tests covering both compliant and
  violating fixtures for every rule it enforces, so the check itself cannot silently stop
  working.
- **FR-022**: The copy-lint MUST be able to run and pass before the surfaces it guards
  exist, so it can be adopted ahead of the Daily Sadhana feature rather than alongside it.
- **FR-023**: Operational writing produced by the autonomous routines MUST follow the
  voice standard's structure, leading with the summary and the decisions required.
- **FR-024**: Operational writing MUST report a period with nothing shipped plainly, and
  MUST NOT present activity as achievement.
- **FR-025**: The copy-lint's language scope MUST be stated explicitly, so it does not
  imply coverage of localised copy it cannot check.

### Key Entities *(include if feature involves data)*

- **Voice Standard**: The single written authority on how the product speaks. Carries
  structure, the avoid-list, the hard constraints traced to the constitution, its own
  limits, and the contract for how it is used alongside the other context documents.
- **Voice Rule**: One checkable statement about copy, with an identifier, the
  constitution rule it derives from where applicable, and whether it is mechanically
  detectable.
- **Avoid-List Entry**: One word or construction not to use, with the reason. Data, not
  code, so that tuning voice is a reviewable data change.
- **Copy Source**: A location the copy-lint considers user-facing and therefore in
  scope, distinguished from identifiers, comments, fixtures, dependency content, and
  traditional or attributed material.
- **Documented Exception**: A recorded, reviewable decision that a specific flagged
  string is compliant. Visible in the diff by construction.
- **Coercion Pattern**: A detectable shape of coercive copy — guilt, shame, urgency,
  countdown, streak-reset, rest-lapse conflation — that the check tests for.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: RULE-C5 has an implementation: the copy-lint runs in continuous
  integration and can fail the build, verified by deliberately introducing a violation and
  observing the failure.
- **SC-002**: 100% of the coercion patterns the specification enumerates have both a
  passing and a failing fixture in the copy-lint's own test suite.
- **SC-003**: Zero copy-lint failures report only a count; 100% quote the string, name
  the location, and name the rule.
- **SC-004**: Zero false positives on identifiers, code comments, test fixtures,
  dependency content, or traditional and attributed material, measured across the whole
  repository at adoption.
- **SC-005**: Zero silent bypasses are possible; every exception in effect is visible in
  version control.
- **SC-006**: The same command produces the same result locally and in continuous
  integration, on 100% of attempts.
- **SC-007**: A reader given only the voice standard, without the constitution,
  correctly classifies a set of sample strings as compliant or not and can state why for
  each.
- **SC-008**: The voice standard restates zero constitution rules; every hard constraint
  in it points at its source.
- **SC-009**: A reader of any routine-produced brief can state the decision required
  from the opening lines, without reading the evidence.
- **SC-010**: The copy-lint passes on the repository as it stands at adoption, so it can
  be turned on as a blocking check immediately rather than being introduced already
  failing.
- **SC-011**: An unattended session that introduces coercive copy is caught at session
  end, not at review.

## Assumptions

- The constitution already settles what the voice must not do. This feature's job is to
  write down what it should do, and to build the check the constitution already requires —
  not to reopen Principle VII.
- The copy-lint is a floor, not a ceiling. Tone is not fully mechanisable, and a check
  that attempted to be exhaustive would produce enough false positives to get itself
  bypassed, which is a worse outcome than a narrow check that is trusted. The
  specification therefore requires precision over recall and pushes the remainder onto the
  written standard.
- The source pattern rates this work as lowest priority. It is raised to P1 here on the
  specific ground that RULE-C5 is a constitution mandate with no current implementation,
  unlike the other patterns in the same document, which add capability the constitution
  does not already require.
- The check's scope is English copy at adoption. Localisation is out of scope and the
  scope statement must say so rather than implying coverage.
- Adoption ahead of the Daily Sadhana feature is deliberate. Building the check first
  means that feature's copy is written against a live gate rather than being retrofitted
  to one.
- The avoid-list carried over from the source pattern — the vocabulary that marks
  generated text, and the punctuation convention — is adopted as a starting point and
  adapted, not imported verbatim, because the product's voice is a calm teacher's rather
  than a briefing writer's.
- Persona and success-signal documents are noted in the source pattern as worthwhile
  follow-ons. They are deliberately excluded here: they inform prioritisation rather than
  voice, and bundling them would make this feature's completion condition unclear.
- The copy-lint scopes by file location at adoption, scanning the user-facing route and
  component
  directories — which is exactly the surface the constitution's copy-lint rule names —
  together
  with the documented marker-based exception for a string that must be exempt. Location
  scoping
  can adopt immediately without touching every copy site, and the marker exception
  recovers the
  precision that matters, consistent with this feature's stated preference for precision
  over
  recall. Extraction from rendered output is rejected: it would make the lint depend on a
  running
  application, which puts it on the wrong side of the deterministic-check line.
