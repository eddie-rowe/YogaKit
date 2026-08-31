# Feature Specification: Observability as Code

**Feature Branch**: `008-observability-as-code`
**Created**: 2026-08-31
**Status**: Draft
**Input**: User description: "Port pattern B5 from `docs/BEST_PRACTICES_FROM_NEXTMOVE.md` — make production legible to a headless agent. Extend the existing content-free Datadog RUM wiring (`src/components/DatadogRum.tsx`) rather than replacing it: add monitors and service level objectives as version-controlled manifests with a dry-run-first diff/apply tool, a single observability guide that maps each routine to the telemetry it reads, and a read path that works unattended without a human completing an interactive sign-in. RULE-L7 is the ceiling: telemetry carries page views, errors, and web vitals only, never pose, flow, note, or journal content."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Alerting is reviewed in a pull request, not clicked in a console (Priority: P1)

Monitors and service level objectives live in the repository as declarative manifests.
Changing an alert threshold is a pull request with a diff, reviewed like any other change.
A tool shows what would change against the live configuration before anything is applied,
and applying is an explicit, separate action.

**Why this priority**: An alerting rule that exists only in a console is invisible to the
repository, unreviewable, and cannot be reasoned about by an agent reading the codebase.
It is also the piece that makes every later story trustworthy: if a routine reports
"monitors green", that claim is only meaningful when the set of monitors is knowable from
the repository.

**Independent Test**: Can be fully tested by running the tool in its default mode against
the live configuration and confirming it prints a diff and changes nothing; then altering
a threshold in a manifest and confirming the diff reflects exactly that change.

**Acceptance Scenarios**:

1. **Given** monitor and objective manifests in the repository, **When** the sync tool
   is run without an explicit apply instruction, **Then** it prints the difference between
   the repository and the live configuration and makes no change.
2. **Given** a manifest whose threshold has been edited, **When** the tool is run in
   its default mode, **Then** the printed difference names that monitor and shows the old
   and new threshold.
3. **Given** a manifest that is malformed or missing a required field, **When** the
   tool is run, **Then** it fails with a message naming the file and the field, and
   applies nothing — including nothing from the other, valid manifests.
4. **Given** the tool is run with an explicit apply instruction, **When** it applies,
   **Then** the live configuration matches the repository, and a second immediate run
   reports no difference.
5. **Given** a monitor that exists live but has no manifest in the repository, **When**
   the tool runs, **Then** that divergence is reported rather than silently ignored, so
   configuration drift is visible.

---

### User Story 2 - A headless routine can read production health unattended (Priority: P1)

The observe routine from Feature 007 needs last-day error rate, core web vitals, and
page-view volume, on a schedule, with no human present. The read path it uses must
authenticate from configuration alone and must keep working for the whole duration of an
unattended stretch.

**Why this priority**: This is the reason the feature is not merely tidiness. The observe
routine is the first link in the daily cycle; if its read path can silently expire, the
entire loop starts every day with a degraded input. The observed failure mode is specific:
a read path that depends on an interactive sign-in cannot be re-authenticated by a
headless agent when its token expires, and the whole observability chain goes dark without
anyone noticing.

**Independent Test**: Can be fully tested by clearing any interactive session state,
providing only the configured credentials, and confirming that each documented query
returns data — demonstrating the path has no interactive dependency.

**Acceptance Scenarios**:

1. **Given** only non-interactive credentials in the environment, **When** a documented
   query is run, **Then** it returns data without prompting for a sign-in.
2. **Given** the read path is unavailable or a credential is absent, **When** the
   observe routine runs, **Then** it records the telemetry step as degraded and continues,
   per Feature 007's degrade-don't-abort requirement.
3. **Given** the documented queries, **When** the observe routine runs them, **Then**
   it obtains error rate, the three core web vitals, and page-view volume for the last
   day.
4. **Given** a credential has expired, **When** a query fails for that reason, **Then**
   the failure is classified as owner-gated — because rotating a credential is a human
   action — and surfaced in the owner digest rather than retried indefinitely.

---

### User Story 3 - One guide maps every routine to the telemetry it reads (Priority: P2)

A single document states which routine reads which signal, what each environment variable
is for, what the attribute-naming conventions are, and — stated first, not in a footnote —
the invariant that telemetry carries page views, errors, and web vitals only.

**Why this priority**: Without it, the telemetry conventions live in the heads of whoever
wired them, and an agent extending instrumentation has nothing authoritative to check
itself against. It is P2 rather than P1 because the routines can read telemetry before the
guide is written, just less safely.

**Independent Test**: Can be fully tested by handing the guide to someone with no prior
context and confirming they can run each documented query and state what may and may not
be recorded.

**Acceptance Scenarios**:

1. **Given** the guide, **When** a reader looks for what the observe routine reads,
   **Then** each routine's telemetry reads are listed with the query that obtains them.
2. **Given** the guide, **When** a reader looks for configuration, **Then** every
   environment variable the observability path needs is named with its purpose and whether
   it is required.
3. **Given** the guide, **When** a reader reaches it for the first time, **Then** the
   content-free-telemetry invariant is stated before any query detail.
4. **Given** a proposal to add an attribute to telemetry, **When** it is checked
   against the guide, **Then** the guide is sufficient to decide whether the attribute is
   permitted.

---

### User Story 4 - Instrumentation cannot leak practice content (Priority: P1)

Every telemetry path is verifiably content-free. Nothing that a practitioner authored — a
pose selection, a composed flow, a note, a journal entry, a reflection, a mood or energy
value — reaches a monitor, a log, a session record, or an alert message.

**Why this priority**: This is a constitution hard line, drawn for privacy rather than for
convenience, and Principle VIII treats misclassifying practice content as being of equal
severity to misclassifying a hard safety constraint. Adding monitors, logs, and alert
payloads is exactly the kind of work that leaks content by accident, so the guard must
land with the feature that introduces the risk, not after it.

**Independent Test**: Can be fully tested by an automated check over the telemetry
configuration and any structured log call sites, asserting that no field carrying authored
practice content is ever recorded — and by confirming the check fails when such a field is
deliberately added.

**Acceptance Scenarios**:

1. **Given** the telemetry configuration, **When** it is inspected, **Then** it records
   page views, errors, and web vitals and nothing derived from authored practice content.
2. **Given** a deliberately added telemetry attribute carrying a flow name or a journal
   excerpt, **When** the automated check runs, **Then** it fails and names the offending
   call site.
3. **Given** an alert message body, **When** it is inspected, **Then** it references
   service and metric identifiers only, and interpolates no user-authored value.
4. **Given** an error is reported to telemetry, **When** its payload is inspected,
   **Then** any message that could embed authored content is redacted or omitted rather
   than forwarded verbatim.
5. **Given** a structured log entry, **When** it is inspected, **Then** its attributes
   follow the documented namespaces and carry no practice content.

---

### Edge Cases

- What happens when the sync tool is run against a configuration a human has edited
  directly in the console? The divergence must be reported as drift, and applying must be
  an explicit choice, never an implicit clobber of someone's emergency fix.
- What happens when a monitor manifest is valid but its query references a metric that
  does not exist? The tool should surface that the monitor will never fire, because a
  monitor that cannot fire is worse than no monitor — it reads as coverage.
- What happens when an objective's target is set to a value the current data cannot
  support? The divergence should be visible rather than silently accepted.
- What happens when telemetry is unconfigured entirely, as in local development where
  the application identifier and client token are absent? Instrumentation must remain a
  no-op and must not error, matching the existing behaviour.
- What happens when an error message thrown by application code happens to contain a
  flow name? The redaction requirement must cover error payloads, not only deliberate
  attributes.
- What happens when the alert destination is a human notification channel and the
  escalation target does not exist? A monitor whose message routes nowhere must be caught
  by manifest validation, not discovered during an incident.
- What happens when two routines both read the same signal and disagree about its value
  because they queried different windows? The guide must state the window for each
  documented query so the reads are comparable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Monitors and service level objectives MUST be defined as declarative
  manifests stored in version control, one concern per file.
- **FR-002**: A tool MUST exist that compares the manifests against the live
  configuration and, by default, reports the difference without changing anything.
- **FR-003**: Applying changes MUST require an explicit, separate instruction to the
  tool. There MUST be no mode in which merely running the tool mutates live configuration.
- **FR-004**: The tool MUST validate every manifest before acting, and MUST apply
  nothing if any manifest is invalid.
- **FR-005**: A validation failure MUST name the file and the offending field.
- **FR-006**: The tool MUST report configuration present live but absent from the
  repository as drift, rather than ignoring it.
- **FR-007**: Applying the manifests MUST be idempotent: a second immediate run MUST
  report no difference.
- **FR-008**: Manifests MUST carry an identifying marker that distinguishes
  repository-managed configuration from configuration created by hand, so drift can be
  attributed.
- **FR-009**: The repository MUST ship at least one monitor manifest covering the
  client-side error rate and at least one objective manifest covering availability of the
  primary read surface, as working examples of the pattern.
- **FR-010**: The telemetry read path used by scheduled routines MUST authenticate from
  configuration alone and MUST NOT depend on any interactive sign-in, because a headless
  session cannot complete one.
- **FR-011**: The read path MUST continue to function for the full duration of an
  unattended stretch without a human refreshing a credential. A path whose authentication
  expires on a fixed short interval does not satisfy this requirement.
- **FR-012**: The read path MUST be able to obtain, for a stated recent window:
  client-side error rate, the three core web vitals, and page-view volume.
- **FR-013**: Each documented query MUST state its time window, so that reads by
  different routines are comparable.
- **FR-014**: Failure of the telemetry read path MUST degrade the reading routine's
  affected step and MUST NOT abort its run.
- **FR-015**: An authentication failure caused by an expired or missing credential MUST
  be classified as owner-gated and surfaced once in the owner digest, not retried
  indefinitely.
- **FR-016**: The repository MUST carry one observability guide that maps each routine
  to the signals it reads and the query that obtains them.
- **FR-017**: The guide MUST enumerate every environment variable the observability path
  requires, with its purpose and whether it is required.
- **FR-018**: The guide MUST state the content-free-telemetry invariant before any query
  detail, and MUST be sufficient on its own to decide whether a proposed new attribute is
  permitted.
- **FR-019**: The guide MUST document the attribute-naming conventions for structured
  telemetry.
- **FR-020**: Telemetry MUST record page views, errors, and web vitals only. No pose
  selection, flow, note, journal entry, reflection, or mood or energy value may be
  recorded, in any attribute, log field, session record, or alert payload.
- **FR-021**: An automated check MUST assert the content-free invariant over the
  telemetry configuration and structured log call sites, and MUST fail when a field
  carrying authored practice content is introduced.
- **FR-022**: Error payloads forwarded to telemetry MUST be redacted or omitted where
  the message could embed authored content; a raw application error message MUST NOT be
  assumed safe.
- **FR-023**: Alert message bodies MUST reference service and metric identifiers only
  and MUST NOT interpolate any user-authored value.
- **FR-024**: Manifest validation MUST reject a monitor whose alert destination does not
  resolve, so a monitor cannot route nowhere.
- **FR-025**: Instrumentation MUST remain an inert no-op when telemetry is unconfigured,
  and MUST NOT raise an error — preserving the existing behaviour in local development.
- **FR-026**: This feature MUST extend the existing client-side telemetry integration
  rather than replacing it; the existing masking and disabled-tracking posture MUST NOT be
  loosened as a side effect.
- **FR-027**: Any change to an alerting threshold or an objective target MUST reach
  production through the repository, so it is diffable and reviewable.

### Key Entities *(include if feature involves data)*

- **Monitor Manifest**: A declarative description of one alerting condition — its name,
  the condition it evaluates, its thresholds, its notification message, and its tags,
  including the repository-managed marker.
- **Objective Manifest**: A declarative description of one service level objective — the
  behaviour being held to a standard, the target, and the window over which it is
  measured.
- **Sync Tool**: The diff-and-apply mechanism. Reports by default, mutates only when
  explicitly told to, validates before acting, and treats an invalid input set as fatal to
  the whole run.
- **Documented Query**: One named telemetry read, with its window, the signal it
  returns, and the routine that consumes it. The unit the observability guide is organised
  around.
- **Content-Free Invariant**: The rule that telemetry carries page views, errors, and
  web vitals only. Enforced by an automated check, not by convention.
- **Attribute Namespace**: The documented prefix conventions for structured telemetry
  fields, keeping identity-and-session metadata separable from everything else and making
  an out-of-convention field visible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The sync tool's default mode changes zero live configuration across 100%
  of runs, verified by comparing the live configuration before and after.
- **SC-002**: An invalid manifest results in zero configuration applied, including from
  the valid manifests in the same run.
- **SC-003**: Applying the manifests twice in succession produces a second run reporting
  no difference, on 100% of attempts.
- **SC-004**: 100% of alerting thresholds and objective targets in production have a
  corresponding manifest in the repository; any that do not are reported as drift within
  one sync run.
- **SC-005**: The documented telemetry queries all return data using configured
  credentials alone, with zero interactive sign-ins required, verified with all
  interactive session state cleared.
- **SC-006**: The telemetry read path survives an unattended stretch of the target
  duration with zero human credential refreshes.
- **SC-007**: Zero fields carrying authored practice content appear in any telemetry
  path, verified by an automated check rather than by inspection — and that check
  demonstrably fails when such a field is deliberately introduced.
- **SC-008**: Zero alert message bodies interpolate a user-authored value.
- **SC-009**: A newcomer using only the observability guide can run every documented
  query and correctly state what may and may not be recorded, with no additional context.
- **SC-010**: A monitor whose alert destination does not resolve is rejected by
  validation on 100% of attempts, so zero monitors reach production able to fire but
  unable to notify.
- **SC-011**: With telemetry entirely unconfigured, the application raises zero errors
  from instrumentation.

## Assumptions

- The existing client-side telemetry provider stays. This feature adds a declarative
  configuration layer and a documented read path around it; it does not evaluate
  alternatives.
- The existing posture — full session sampling, session replay off, interaction,
  resource, and long-task tracking off, default masking on — is treated as a floor, not a
  starting point to be negotiated down.
- Monitors and objectives are the two configuration types worth managing declaratively
  at this stage. Dashboards are deliberately excluded: they are read surfaces for humans,
  they change often for cosmetic reasons, and managing them as code has a poor ratio of
  review value to churn.
- "Unattended stretch" takes whatever duration Feature 007 settles on; the
  credential-longevity requirement is stated relative to it rather than as a fixed number
  of days.
- The structured-logging requirement applies to server-side log call sites as they are
  introduced. This feature establishes the conventions and the enforcing check; it does
  not require retrofitting instrumentation that does not yet exist.
- A monitor that cannot fire is treated as worse than an absent monitor, because it
  reads as coverage. Validation is therefore expected to be strict, and a false rejection
  is considered cheaper than a silently inert alert.
- The non-interactive read mechanism is key-authed: an application key, an API key, and a
  site
  identifier supplied as environment variables, reached through a thin wrapper that lives
  in this
  repository. Routines depend on the wrapper's interface rather than on a vendor tool this
  repository has not yet verified, so whether the wrapper calls the vendor's first-party
  command-line tool or its interface directly stays a planning-stage choice that can
  change
  without touching a routine. Interactively authenticated paths remain excluded outright,
  since a
  scheduled session cannot complete an interactive sign-in.
- Alert notifications route to both destinations: the standing owner-digest issue, so the
  loop
  can consume them without a stream of interruptions, and a human notification channel for
  a
  failing verdict. A single destination is not enough — a digest-only alert is not an
  alert during
  an incident, and a channel-only alert is invisible to the loop.
