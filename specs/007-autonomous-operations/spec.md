# Feature Specification: Autonomous Operations Substrate

**Feature Branch**: `007-autonomous-operations`
**Created**: 2026-08-31
**Status**: Draft
**Input**: User description: "Port the operating patterns from NextMove (`docs/BEST_PRACTICES_FROM_NEXTMOVE.md`, patterns B1–B4 and B7) so Krama can be worked on by scheduled, headless Claude Code sessions without a human at the keyboard — session-level done-gates, a labelled work-consumption model with a hard owner-gate, an operational spine of living planning files, and a four-routine daily loop coupled only through files committed to `main`. The constitution (v3.0.0) is the ceiling: anything the loop could do that would bend a constitution rule becomes owner-gated rather than an exception."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A session cannot quietly end on a broken build (Priority: P1)

An agent (or a human) works in the repo, makes edits, and finishes the session. Before the
session is allowed to report itself done, the repo's own quality gates run: lint,
type-check, pose-library validation, and the unit suite with its coverage thresholds. If
any gate fails, that failure is surfaced in the session rather than being discovered hours
later by CI or, worse, in production.

**Why this priority**: Every other story in this feature assumes an agent's "done" means
something. Unattended merging is only safe if "done" is mechanically checked. This is also
the cheapest item in the whole feature — it is configuration, not code — and it pays off
immediately for attended sessions too, so it delivers value even if nothing else here
ships.

**Independent Test**: Can be fully tested by deliberately introducing a type error (or a
pose-schema violation) in a working tree, ending the session, and confirming the failure
is reported at session end; then removing it and confirming a clean session ends silently.

**Acceptance Scenarios**:

1. **Given** a working tree that type-checks, lints, validates, and passes tests,
   **When** a session ends, **Then** the gates all report success and the session ends
   without contradiction.
2. **Given** a working tree with a TypeScript error, **When** a session ends, **Then**
   the type-check gate reports the failure with enough detail to locate it, and the
   session's own record reflects that the build is broken.
3. **Given** a working tree where a pose record violates the Tier-1 schema, **When** a
   session ends, **Then** the pose-validation gate fails and names the offending record.
4. **Given** a working tree where a friction-engine change has dropped coverage below
   100%, **When** a session ends, **Then** the test gate fails on the coverage threshold,
   not merely on assertion failures.
5. **Given** a routine command the loop runs frequently, **When** it performs ordinary
   repository work (reading files, running the project's own npm scripts, using `git` and
   `gh`), **Then** it is not interrupted by a permission prompt, because an unattended
   session has nobody to answer one.

---

### User Story 2 - Work is consumed from a queue with a hard owner-gate (Priority: P1)

Work reaches the loop as GitHub issues carrying explicit labels. The loop builds only
issues marked both ready and additive-safe. Anything with blast radius or a judgment call
— a destructive migration, an RLS or auth or billing change, a secret rotation, a repo
setting, or user-facing copy where tone matters — is labelled owner-gated, and the loop
surfaces it and never touches it.

**Why this priority**: This is the safety valve. Without it, an unattended agent's blast
radius is the whole repository, including exactly the surfaces the constitution draws hard
lines around. The label policy is what makes the constitution mechanically enforceable at
the level of "what may be built at all" rather than only at the level of code review.

**Independent Test**: Can be fully tested with no loop running, by creating one
additive-safe issue and one owner-gated issue and confirming that a single manual
invocation of the build routine picks up the first and provably leaves the second
untouched (no branch, no PR, no comment claiming work).

**Acceptance Scenarios**:

1. **Given** the repository, **When** the work-consumption labels are bootstrapped,
   **Then** there is exactly one label meaning "groomed and ready", one meaning "additive;
   the loop may build and merge", and one meaning "owner-gated; surface, never build".
2. **Given** a new issue, **When** an author opens it, **Then** a feature template
   offers Acceptance Criteria, Test Requirements, Spec Reference, and Codebase Area as
   required sections.
3. **Given** an issue that would alter an RLS policy, an auth path, billing logic, or
   user-facing Daily Sadhana copy, **When** it is groomed, **Then** it is labelled
   owner-gated, regardless of how small the change looks.
4. **Given** an issue labelled owner-gated, **When** the build routine runs, **Then**
   it creates no branch, opens no PR, and posts no comment implying the work was done.
5. **Given** several owner-gated blockers accumulating over days, **When** they are
   surfaced, **Then** they are rolled into a single, idempotent owner-digest issue rather
   than one new issue per blocker per day.

---

### User Story 3 - The repository carries an honest, greppable operating memory (Priority: P1)

A small set of living files gives every routine a shared memory and gives the owner one
place to look on return: a board reconciled against what actually merged, a rolling
product/state snapshot, an append-only per-run audit log, and a dated human-facing brief.
Dated outputs are never overwritten — each is a new file named for its type and date.

**Why this priority**: The honesty discipline depends on this. A claim like "shipped three
PRs" is only checkable if there is an independent, append-only record to check it against.
It also delivers standalone value: even with no loop, a reconciled board and a dated brief
are useful.

**Independent Test**: Can be fully tested by hand-writing one day's worth of entries and
confirming the board's Done column, the routine log's lines, and `git log` for that day
agree — and that a second run on the same day adds a file rather than replacing one.

**Acceptance Scenarios**:

1. **Given** the operational spine exists, **When** the owner returns after time away,
   **Then** there is exactly one file to read first, and it is dated.
2. **Given** the board, **When** it is reconciled, **Then** its Done column reflects
   merged pull requests verified against GitHub and `git log`, not what a routine intended
   to do.
3. **Given** the append-only routine log, **When** any routine completes, **Then**
   exactly one line has been appended for that run, and no prior line has been edited or
   removed.
4. **Given** a dated output already exists for today, **When** a routine runs a second
   time the same day, **Then** no dated file is overwritten and the run remains safe to
   repeat.
5. **Given** the repository already keeps an append-only decision log at the root,
   **When** the spine is created, **Then** no second decision log is introduced; the spine
   points at the existing one.

---

### User Story 4 - Four scheduled routines run a self-feeding daily cycle unattended (Priority: P1)

Four headless sessions run on a daily schedule: one observes production health and writes
a digest, one grooms the board and files labelled issues, one builds and merges the
additive-safe queue, and one verifies the day's claims and writes the human-facing brief.
They never call each other directly — each writes a dated handoff file to `main` that the
next one reads, so a skipped or failed routine degrades the next one rather than blocking
it.

**Why this priority**: This is the reason the feature exists — it converts a pre-cleared
runway of decisions into shipped work without a human present. It is listed last among the
P1 stories because it consumes the artifacts of Stories 1 through 3 and should be
sequenced after them, not because its value is lower.

**Independent Test**: Can be fully tested by running each routine once, manually and in
isolation, with the previous routine's handoff deliberately absent — confirming each still
produces its own outputs in a reduced mode and appends its single log line, rather than
failing.

**Acceptance Scenarios**:

1. **Given** no prior handoff file exists, **When** a routine runs, **Then** it
   completes in a reduced mode, records that its input was missing, and does not abort the
   run.
2. **Given** a data source the routine expects is unreachable (a telemetry query fails,
   a CLI is absent), **When** the routine runs, **Then** it downgrades that step, logs the
   degradation, and continues to its remaining steps.
3. **Given** a routine that needs to know whether continuous integration passed,
   **When** it checks, **Then** it makes a bounded number of checks and then moves on, and
   never waits in a polling loop.
4. **Given** a routine about to push, **When** it pushes, **Then** it has verified it
   is on the trunk branch and never force-pushes, never resets shared history, and
   resolves any conflict by union rather than by clobbering.
5. **Given** a routine running unattended, **When** it encounters ambiguity, **Then**
   it resolves it from the committed record and never blocks on an interactive question.
6. **Given** the build routine has opened a pull request, **When** the checks are red,
   **Then** it leaves the pull request open with the failure recorded and merges nothing.
7. **Given** the retro routine writes that N pull requests shipped, **When** that
   number is produced, **Then** it has been cross-checked against merged pull requests,
   `git log`, and the routine log, and a day with nothing shipped is reported as nothing
   shipped.
8. **Given** a routine has steps to run, **When** it runs them, **Then** it runs them
   in sequence in its own session and does not hand them to a detached background subagent
   whose silent death would be invisible to the audit log.
9. **Given** the build routine picks up work, **When** it selects issues, **Then** it
   takes a small bounded number per run in stated priority order, and first lands any
   already-green pull request left open by the previous run.

---

### User Story 5 - Sharper review and migration safety as the loop matures (Priority: P3)

Named subagent definitions and small repository hooks raise the floor on unattended work:
a reviewer with the constitution's rules in hand, and a migration check that refuses any
migration touching a row-level-security policy unless it is owner-gated.

**Why this priority**: Valuable but not load-bearing. The label policy in Story 2 already
keeps the loop away from row-level security; this story is defence in depth for the case
where an issue was mislabelled.

**Independent Test**: Can be fully tested by staging a migration that alters a row-level
security policy on an additive-safe branch and confirming the check refuses it.

**Acceptance Scenarios**:

1. **Given** a migration that alters a row-level-security policy, **When** it is added
   on a branch the loop is building, **Then** the migration check refuses it and names the
   rule.
2. **Given** a migration that only adds a column, table, or index, **When** it is
   added, **Then** the check permits it.
3. **Given** a pull request touching the friction engine, the pose schema, the
   validator, row-level security, or the Daily Sadhana surface, **When** it is opened,
   **Then** it carries the constitution-verification note that governance already
   requires.

---

### Edge Cases

- What happens when two routines are scheduled too close together and the second starts
  before the first has pushed? The second must see stale inputs as merely stale, degrade,
  and not corrupt the first's outputs.
- What happens when a routine's own commit fails to push because the trunk moved? It
  must re-sync non-destructively and retry a bounded number of times, then record the
  failure.
- What happens when the additive-safe queue is empty? The loop must not manufacture
  busywork; it must record a starved runway honestly so the owner learns the queue needs
  refilling. This is the observed failure mode where marginal value collapses and an agent
  begins removing dead code it added the week before.
- What happens when the same owner-gated blocker is re-diagnosed on many consecutive
  days? The digest must show it as one aging item with an escalation age, not as a fresh
  finding each day.
- What happens when a gate at session end fails but the underlying failure predates this
  session? The gate must still report it, and the session must not claim a clean finish.
- What happens when the loop's own scheduled trigger does not fire at all? The absence
  of a run must be visible as a gap in the append-only log rather than being
  indistinguishable from a quiet day.
- What happens when a routine would need a credential or a repository setting it does
  not have? It must classify that as owner-gated and stop attempting it, rather than
  retrying daily forever.
- What happens when continuous integration is itself misconfigured so that a gate passes
  vacuously? A gate that cannot fail is not a gate; the session-end gates and the
  continuous integration checks must not disagree about what constitutes failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST define session-level quality gates that run when a
  working session ends, covering at minimum: lint, type-check, pose-library validation,
  and the unit suite including its coverage thresholds.
- **FR-002**: A session-end gate failure MUST be surfaced within the session with enough
  information to locate the cause; it MUST NOT be silently swallowed.
- **FR-003**: The session-end gates and the continuous-integration checks MUST agree on
  what constitutes a failure. Any check that currently cannot fail (for example a lint
  step whose non-zero exit is discarded) MUST either be made able to fail or be removed,
  so that no gate passes vacuously.
- **FR-004**: The repository MUST pre-authorize the command surface an unattended
  routine needs for ordinary repository work, so that a headless session is not blocked by
  an interactive permission prompt. The authorized surface MUST be enumerated rather than
  unbounded.
- **FR-005**: Edit-time feedback MUST be cheap enough not to materially slow ordinary
  editing; the exhaustive gate belongs at session end, not after every individual edit.
- **FR-006**: The repository MUST define exactly three work-consumption labels with
  distinct, documented meanings: groomed-and-ready,
  additive-so-the-loop-may-build-and-merge, and
  owner-gated-so-the-loop-surfaces-but-never-builds.
- **FR-007**: The additive-safe classification MUST be limited to changes with no blast
  radius: new files, new components, new pure functions, purely additive migrations, new
  tests, and documentation.
- **FR-008**: The owner-gated classification MUST include, at minimum and without
  exception: destructive or renaming migrations, data backfills, any change to row-level
  security, auth, or billing, secret rotation, repository settings, and user-facing copy
  where tone is a judgment call. Each of these corresponds to a constitution hard line.
- **FR-009**: A change that would bend any constitution rule MUST be classified as
  owner-gated. It MUST NOT be permitted as an exception, and the loop MUST have no
  mechanism for granting itself one.
- **FR-010**: The repository MUST provide a feature-issue template requiring Acceptance
  Criteria, Test Requirements, Spec Reference, and Codebase Area.
- **FR-011**: The build routine MUST NOT create a branch, open a pull request, or
  comment on any issue labelled owner-gated.
- **FR-012**: Owner-gated blockers MUST be aggregated into a single idempotent
  owner-digest issue with a visible escalation age, rather than one new issue per blocker
  occurrence.
- **FR-013**: The repository MUST carry a set of living operating files providing: a
  board with a Done column reconciled against merged work, a rolling product/state
  snapshot, an append-only per-run audit log, and a dated human-facing brief.
- **FR-014**: The repository MUST have exactly one decision log. The operating files
  MUST point at the existing root decision log rather than introducing a second one.
- **FR-015**: Dated outputs MUST be written as one file per type and date and MUST never
  overwrite an existing dated file, so history remains greppable months later.
- **FR-016**: The repository MUST carry one master specification for the loop that
  states the schedule, the branch model, the merge policy, the label conventions, the
  guardrails, and the routine definitions, and this specification MUST be the authority
  the individual routine definitions are derived from.
- **FR-017**: Every routine MUST be idempotent: running it twice for the same period
  MUST NOT duplicate work, duplicate issues, or corrupt a prior run's outputs.
- **FR-018**: Every routine MUST degrade rather than abort. A missing input, an
  unreachable data source, or an absent tool MUST downgrade the affected step and be
  recorded, never terminate the run.
- **FR-019**: Every routine MUST be bounded. No routine may poll or busy-wait; checks on
  external state MUST be limited to a stated number of attempts, and each step MUST have a
  stated time budget after which the routine moves on.
- **FR-020**: Every routine MUST append exactly one line per run to the append-only
  audit log, and MUST NOT edit or remove any existing line.
- **FR-021**: Every routine MUST run fully autonomously and MUST NOT ask an interactive
  question.
- **FR-022**: Every routine MUST commit only to the trunk branch, MUST verify the
  current branch before pushing, and MUST NOT force-push, MUST NOT reset shared history,
  and MUST resolve conflicts by union rather than by clobbering.
- **FR-023**: Every routine MUST run its steps in sequence within its own session and
  MUST NOT delegate them to a detached background subagent.
- **FR-024**: Routines MUST be coupled only through dated handoff files committed to the
  trunk. No routine may depend on another routine being invoked, still running, or
  reachable.
- **FR-025**: A routine whose expected upstream handoff is absent MUST locate the most
  recent available handoff, or proceed with none, and record which it did.
- **FR-026**: The build routine MUST write a failing test before an implementation for
  any change to behaviour that is unit-testable, and MUST leave that evidence in the pull
  request.
- **FR-027**: The build routine MUST NOT merge a pull request whose checks are not
  passing.
- **FR-028**: The build routine MUST first land any already-green pull request left open
  by a previous run, before starting new work.
- **FR-029**: The build routine MUST take a small, stated, bounded number of issues per
  run, in the priority order given by its upstream handoff.
- **FR-030**: Any quantitative claim a routine writes about its own output MUST be
  verified against at least three independent sources — the append-only audit log, the
  live repository host state, and version-control history — before it is written.
- **FR-031**: A period in which nothing shipped MUST be reported as a period in which
  nothing shipped. No routine may present a zero as progress.
- **FR-032**: When the additive-safe queue is empty or thinning, the loop MUST record
  the starved runway as a finding for the owner and MUST NOT manufacture busywork to
  appear productive.
- **FR-033**: The planning routine MUST reconcile the board against what actually merged
  before it grooms new work, so grooming is never based on a stale board.
- **FR-034**: The planning routine MUST source new work from the standing feature ladder
  and the pose-library backlog, and each issue it files MUST reference the specification
  section it derives from.
- **FR-035**: The absence of a scheduled run MUST be detectable as a gap in the audit
  record, distinguishable from a run that happened and found nothing to do.
- **FR-036**: The repository MUST document the pre-flight the owner performs before any
  unattended stretch: provision the credentials and environment the loop will need, apply
  any migration touching row-level security or auth by hand, and pre-decide anything the
  loop cannot decide. A blocker merely filed MUST NOT be treated as a blocker resolved.
- **FR-037**: A migration that alters a row-level-security policy MUST be refused on any
  branch the loop is building, independently of how the originating issue was labelled.
- **FR-038**: Pull requests touching the friction engine, the pose-library schema, the
  validator, row-level security, or the Daily Sadhana surface MUST carry the
  constitution-verification note that governance already requires — including pull
  requests the loop opens.

### Key Entities *(include if feature involves data)*

- **Routine**: One scheduled, headless session with a stated role, an input set, an
  ordered step list, a declared output set, and a time budget. Identified by name and by
  the trunk commits it produces.
- **Handoff**: A dated file committed to the trunk that carries one routine's structured
  output to the next. The only coupling between routines. Readable and useful in
  isolation.
- **Digest**: A dated health summary of production and continuous-integration state,
  carrying an overall verdict, the signals behind it, and any owner-gated blocker found.
- **Work Item**: A repository issue, the unit of execution. Carries the three-label
  classification, acceptance criteria, test requirements, a specification reference, and a
  codebase area.
- **Owner-Gated Blocker**: Something only a human can resolve. Aggregated into a single
  standing digest issue and aged rather than re-filed.
- **Audit Line**: One append-only record per routine run: which routine, when, what it
  did, what it degraded. The independent source that verification checks claims against.
- **Board**: The Now / Next / Later / Done view of work, whose Done column is a
  reconciliation against merged work rather than an assertion.
- **Brief**: The dated, human-facing document the owner reads first on return.
- **Gate**: A check that must pass before a session may report itself done. Has a name,
  a command, a time budget, and an unambiguous pass/fail outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of session-end gate failures are visible in the session that caused
  them; zero broken builds are first discovered by a later session or by continuous
  integration.
- **SC-002**: Zero session-end gates and zero continuous-integration checks can pass
  vacuously — verified by deliberately breaking each one and confirming each reports
  failure.
- **SC-003**: 100% of issues labelled owner-gated remain untouched by the loop across an
  unattended stretch — zero branches, pull requests, or comments against them.
- **SC-004**: Zero changes to row-level security, auth, or billing are merged without a
  human, verified across the whole unattended period, not merely spot-checked.
- **SC-005**: Every routine run appends exactly one audit line; the count of audit lines
  equals the count of runs, with zero duplicates and zero retroactive edits.
- **SC-006**: Every routine, when run with its upstream handoff deliberately removed,
  still produces its own declared outputs in a reduced mode — 0 of 4 routines abort.
- **SC-007**: Zero routine runs exceed their stated time budget by waiting on external
  state; no routine contains a polling loop.
- **SC-008**: Zero force-pushes and zero resets of shared history occur across the
  unattended period.
- **SC-009**: 100% of quantitative claims in the daily brief reconcile with merged pull
  requests and version-control history; any period with nothing shipped is reported as
  such.
- **SC-010**: Running any routine twice for the same period produces no duplicated
  issue, no overwritten dated file, and no duplicated commit of the same content.
- **SC-011**: On return from an unattended stretch, the owner can determine the state of
  the work, what is blocked, and what needs a decision, by reading one dated brief — with
  no need to reconstruct it from issues or version-control history.
- **SC-012**: Every owner-gated blocker appears in exactly one standing digest issue
  with a visible age; zero blockers are re-filed as new issues on subsequent days.
- **SC-013**: A migration altering a row-level-security policy is refused on 100% of
  attempts on a loop-built branch, including when the originating issue was mislabelled as
  additive.
- **SC-014**: A starved queue is reported as starved within one cycle of becoming
  starved; zero pull requests are merged whose only purpose is to appear productive.

## Assumptions

- The scheduling mechanism is left open: any runner that can start a headless session on
  a schedule satisfies this specification. The specification constrains what a routine
  must do and must not do, not what starts it.
- Four routines with the roles observe, plan, build, and retro is the shape carried over
  from the source pattern, and is adopted because it was observed to work unattended for a
  sustained period. The specific clock times matter only in that each routine must
  reliably start after the previous one has finished pushing.
- The trunk branch is `main`, and the loop merges into it directly rather than through a
  long-lived integration branch. This follows the existing repository practice.
- Coverage thresholds are already enforced by the test runner for the friction engine
  and validator-lite; this feature reuses that enforcement rather than defining its own.
- "Additive migration" means a migration that only adds and whose reversal is trivial; a
  migration that adds a column with a non-null constraint and no default, or that rewrites
  a table on apply, is not additive for the purposes of the label policy.
- The loop's usefulness is bounded by decision supply, not by agent capability. This
  specification therefore requires the loop to report a starved runway rather than
  attempting to solve it, because refilling the runway is an owner action by definition.
- The business-specific machinery from the source repository — customer-relationship
  tracking, payment-provider and commerce integrations, outreach tooling — is deliberately
  out of scope. Only the operating patterns port.
- The loop requests the repository host's own auto-merge-when-green facility for its pull
  requests, because that removes the routine's need to observe check completion at all.
  That
  facility depends on an owner-gated repository setting, so when it is unavailable the
  routine
  falls back to the bounded check-then-merge already required above. In neither path may a
  routine merge a pull request whose checks are failing or still unknown.
- An unattended stretch is designed for thirty days, which matches the longest run
  observed in
  the source repository. The owner-digest escalation ladder therefore ages an unanswered
  owner-gated item at one day, three days, and seven days, and a runway starved for longer
  than
  seven days is reported as the digest's leading item rather than as one line among many.
