# Implementation Plan: Daily Sadhana

**Branch**: `005-daily-sadhana` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-daily-sadhana/spec.md`,
`design-input.md`'s 19 candidate UX requirements and 13 open decisions

## Summary

Give the practitioner a record of practice that only ever moves forward, then make that
record legible to the one audience allowed to see any of it. Five P1 stories, in
schema-dependency order rather than the spec's presentation order, plus two P2 stories:

1. **Schema and the content/signal split (foundation).** Five new tables, split the same
   way `004` split `flow_items` from `flow_item_notes`: a check-in's *fact* (date,
   duration, kind) is a signal a cohort teacher may query; its *mood and note* are content
   no query in the dashboard's path can reach. This is the feature's foundation because
   US1, US2, US4, and US5 all read or write it.
2. **US1 — checking in takes one tap and states who can see it.** The one-tap mood
   check-in, the permanent privacy microcopy, and the local-day attribution rule (decision
   #1).
3. **US2 — the record of practice never turns into a debt.** The always-non-decreasing
   streak, rest as a first-class state, the calm on-request grace budget (decision #4),
   and milestones with nothing to defend. Decision #3 — no streak repair, ever — is
   resolved here as **will not build**, not deferred.
4. **US3 — coming back reads as a return, not a reckoning.** The versioned, append-only
   intention and the return card that quotes the version active when the lapse began.
5. **US4 — sharing practice signals is visible, per-cohort, and one tap to end.** Mostly
   UI: `002` already created `cohort_enrollments.share_signals` and the
   `app_revoke_signal_sharing` RPC. Decision #8 (undo toast, no blocking confirm) is
   resolved here.
6. **US5 — a cohort teacher can see signals and structurally cannot see content.** The
   dashboard over the signal tables only, with the RULE-V5 CI proof this plan requires
   before the surface is considered real.
7. **US6 (P2) — guidance arrives once, one card at a time**, and **US7 (P2) — Today is the
   home screen** (the 5→3 navigation collapse). Both specified here, built after the P1
   stories land, per the spec's own priority ordering.

**What does not change.** The friction engine and validator-lite are not touched by any
story here — this feature has no sequence-generation surface at all. Nothing in this
feature may add a database or network dependency to their path (RULE-H6), and that
statement is not new work: there is nothing in `005`'s design that comes near
`src/lib/friction/` or `src/lib/validator/`, so the Constitution Check below records an
absence rather than an assertion this feature has to build.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 (App Router, Turbopack), React 19 + React
Compiler
**Primary Dependencies**: `@supabase/ssr` + `@supabase/supabase-js` (existing, three
clients in `src/lib/supabase/`), `idb` (existing, gains a `checkins` outbox store
mirroring `004`'s `src/lib/storage/outbox.ts` pattern rather than inventing a second
queue shape), Tailwind v4 with `@theme inline` tokens. No new runtime dependency is
anticipated for local-day resolution — `Intl.DateTimeFormat` with the browser's resolved
timezone is sufficient and is confirmed, not assumed, in `research.md`
**Storage**: Postgres via Supabase as source of truth for five new tables:
`intentions`, `practice_checkins`, `practice_reflections`, `practice_ritual_state`,
`practice_milestones` (see Project Structure). `data/guidance/*.md` is a new open,
version-controlled corpus alongside `data/poses/` and `data/quotes/` — trigger-gated
markdown, not a database table, so authoring a guidance entry is a pull request like
adding a pose. The grace budget's size and period are stored as
`data/sadhana/grace-budget.json` (decision #4) — the same "tuning is data, not code" shape
RULE-H5 already establishes for the friction engine's weights, applied here to a
different, non-RULE-H6-bound surface. IndexedDB (`krama` DB) gains a read cache for
check-in history and a write queue for offline check-ins
**Testing**: Vitest for the pure derivations (`computeStreak`, local-day resolution,
guidance-trigger/priority selection, the return-card version lookup) and for the copy-lint
corpus itself; Playwright (`playwright.config.qa.ts`, 390×844, `isMobile`/`hasTouch`) for
the check-in walk and the navigation-collapse walk; `scripts/verify-migrations.sh` against
bare Postgres for the RLS and structural assertions, extended with the RULE-V5 proof this
feature owes (`practice_reflections` is queried by a cohort-teacher role and must return
zero rows or be refused)
**Target Platform**: Web, mobile-first, existing PWA with a service worker
**Performance Goals**: No regression to Lighthouse mobile ≥ 90 on Today (RULE-L6), which
this feature makes the home screen (US7) — a performance regression here is now a
front-door regression, not a secondary-screen one. The check-in interaction stays inside
the ≤200ms no-bounce motion budget
**Constraints**: Reading a previously-synced streak, calendar, and intention MUST work
with no network and no login (RULE-L3/L4); a check-in made offline MUST NOT be lost and
MUST NOT be reported in a state the server does not hold (FR-010); the content/signal
split MUST be structural — verifiable from `information_schema` and `pg_policies` alone,
with zero application-layer conditionals load-bearing for it (Principle VIII, RULE-V1/V2);
no streak, milestone, return-card, or guidance string may use guilt, shame, urgency, a
countdown, or a reset-to-zero visual, CI-enforced by `npm run lint:copy` (Principle VII,
RULE-C1–C6); the friction engine and validator-lite stay untouched, pure, and at 100%
line coverage; telemetry stays content-free (RULE-L7) even though this feature introduces
the app's first mood, note, and intention-body fields — `npm run lint:telemetry`
(`scripts/check-telemetry-content-free.mjs`) must be run against every new call site this
feature adds, not only against the surfaces that existed when it last ran clean; a
person whose subscription lapses MUST NOT lose the ability to read a check-in or intention
they already own (RULE-O7)
**Scale/Scope**: One check-in per practitioner per local day; a handful of guidance
entries at launch, not a library; no concurrent-editing concerns — every row in every new
table is written only by the user who owns it, or (for the two signal tables) additionally
read-only by that user's cohort teacher

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against constitution v3.0.0 (`.specify/memory/constitution.md`):

| Principle | Check | Result |
|---|---|---|
| I. Safety is Sovereign | No sequence generation and no safety judgement anywhere in this feature. A guidance card is authored prose selected by a static trigger/priority, never a generated recommendation. | PASS (N/A) |
| II. The Teacher Decides; the App Proposes | The one app-derived value in this feature is the streak number and the grace-budget remainder, both pure arithmetic over the practitioner's own check-ins with no hidden state — a practitioner can always see why the number is what it is by looking at their own calendar (FR-015, FR-020). Guidance cards are human-authored, not derived reasoning, so RULE-T3 does not bind them the way it binds the friction engine's `reasons[]`. | PASS |
| III. Deterministic Authority, AI Optional | RULE-H6 names the friction engine and validator-lite specifically. This feature adds no story, table, or UI surface anywhere near `src/lib/friction/` or `src/lib/validator/` — there is no sequence-generation path in Daily Sadhana at all, so this is a statement of absence, not a new guard this feature has to build. No AI call anywhere in this feature. The streak/milestone derivations are new pure functions in the same *shape* as the friction engine (typed input, typed output, no I/O) because that shape is good practice generally, but they are not RULE-H6-bound modules and this plan does not claim they are. | PASS |
| IV. Embodied Intelligence | This feature authors no cue, no movement name, and no teacher voice. The re-entry offer in a return card (UX-009) draws its smallest unit from the intention's *own* original flow — it is a pointer into data the practitioner already made, not app-generated content. | PASS |
| V. Open Data, Sustainable Product | RULE-O6/O7. `data/guidance/*.md` follows the same open, version-controlled, community-reviewable pattern as `data/poses/` — it is not gated by any entitlement, because guidance is not the practice record itself, it is copy about the practice record. More load-bearing here: RULE-O7 forbids gating "a person's ability to read a flow or practice record they already own" on entitlement. A lapsed subscription MUST NOT make a practitioner's own check-in history, streak, or intention unreadable — this is a new instance of RULE-O7 this feature must not get wrong, since `005` is the first feature whose entire subject is a person's own historical record. | PASS, with the RULE-O7 read-path noted above as a concrete task, not left implicit |
| VI. Lightweight and Accessible | RULE-L3/L4. Today becomes the home screen in this feature (US7), which raises the stakes on the offline read path rather than lowering them. A previously-synced streak, calendar, and active intention MUST render with no network and no re-authentication, the same 6am test `004` applied to a flow. A check-in made offline queues durably (mirroring `004`'s outbox, not inventing a second mechanism) and is never lost or misreported (FR-010). RULE-L6 — no regression to Lighthouse mobile ≥ 90 on what is now the app's front door. | PASS |
| VII. Compassion Over Compliance | **This feature's primary constitutional surface** — RULE-C1–C6 bind nearly every FR in `spec.md`. Two decisions from `design-input.md` are flagged here explicitly for an owner nod, per this issue's own instruction, rather than silently defaulted: **Decision #3 (streak repair/undo)** — recommended default is **will not build**, and this plan adopts it as the design, not as a placeholder: FR-024 codifies "no streak repair, restore, or undo mechanic may exist, whether free or paid" as a hard requirement, and Task T0xx below is a negative assertion that no such surface exists, not a feature to build later. Recorded as **closed**, per `design-input.md`'s own instruction not to leave it "deferred" where it could be reopened as a small addition. **Decision #6 (guidance-card tone)** — recommended default is gentle/pattern-based (Oura), not target-driven (WHOOP); this plan adopts the recommendation for the *schema and selection mechanism* (an authored static trigger/priority field, decision #7, validated in CI), but the guidance corpus's actual prose is held for an owner sign-off copy-style note before any entry is authored, the same pattern `003` used for `contracts/theme-taxonomy.md` and `contracts/score-explanation.md`. The schema and CI validation ship now; the words do not, until that note exists. | PASS, with #3 and #6 flagged above for explicit owner sign-off before the guidance corpus and any streak-adjacent copy ship |
| VIII. Consent-Scoped Visibility | RULE-V1/V2/V5/V6. The check-in table splits the same way `004` split `flow_items` from `flow_item_notes`: `practice_checkins` (signal — date, duration, kind) carries no free text and is the only sadhana table a cohort teacher's policy ever names; `practice_reflections` (content — mood, note) has no `org_id`/`cohort_id`/role column for a policy to join against, so the exclusion is structural, not a hidden field. `intentions` and `practice_ritual_state` are self-only content with no teacher policy at all — no story in this feature asks a teacher to see an intention. The dashboard (US5) reuses `002`'s `app_visible_student_ids()` and `cohort_enrollments.share_signals` rather than inventing a parallel visibility mechanism, and this feature owes the RULE-V5 CI proof `002`'s schema doc explicitly left as "stubbed now, filled in by 005." | PASS, with the assertion specified as a task in this plan, filling `002`'s stub |

No violations requiring Complexity Tracking justification.

### The 13 open decisions, resolved against their recommended defaults

`design-input.md`'s decision table already states a recommended default and rationale for
each of the 13 open decisions; this plan does not invent a fourteenth option for any of
them. Resolved here so a later reader does not have to cross-reference two documents to
see where a decision landed:

| # | Decision | Resolution adopted | Where it lands |
|---|---|---|---|
| 1 | Local-day attribution at night | Attribute to the day the check-in *action* occurs on; one bounded "log for yesterday" affordance, no free-form date picker | Phase C2 (US1) — `resolveLocalDay()`, FR-005/006/007 |
| 2 | "Practiced today" signal to teachers | Yes, a boolean derived from check-in existence only, structurally separate from the check-in component tree | Phase C5 (US5) — the dashboard's derived-signal task, FR-059 |
| 3 | Streak repair/undo mechanic | **No — will not build.** Closed, not deferred | Constitution Check (Principle VII, above) and Phase C3 (US2) — a negative-assertion task, FR-024 |
| 4 | Grace-budget window/size configurability | Fixed at launch; the number stored as data, not UI prose | Phase C1 (schema) — `data/sadhana/grace-budget.json`, FR-019 |
| 5 | Memory-echo vs. copy-only return card | Copy-only (quote the intention) now; memory-echo deferred | Phase C4 (US3); recorded in "Deferred, and why" in `tasks.md` |
| 6 | Guidance-card tone: gentle/pattern-based vs. target-driven | Gentle, pattern-based (Oura) | Constitution Check (Principle VII, above) — **schema and CI validation ship now; prose held for owner sign-off**, same pattern as `003`'s copy contracts |
| 7 | Guidance priority: authored static field vs. computed | Authored static priority field in frontmatter, CI-validated for missing/duplicate values | Phase C6 (US6) — corpus schema + `validate:guidance`, FR-037/038 |
| 8 | "Stop sharing" confirmation UX | Single undo toast (5–8s), no blocking confirm | Phase C5 (US4) — FR-049 |
| 9 | Pre-grant disclosure at enrollment | Yes, but blocked on `002`'s enrollment/join UI not existing yet | Not in this feature's scope; recorded as blocked in "Deferred, and why," `005` ships the standing pill/sheet/revoke protection regardless (FR-044–051) |
| 10 | Per-student dashboard rows vs. cross-cohort aggregation | Named per-student rows are the right granularity for this feature's scope; aggregation is a later feature's problem | Phase C5 (US5) — no task, recorded as an explicit scope boundary so it is not silently re-litigated |
| 11 | `/learn` route: retire vs. keep unlinked | Retire; fold its content into what Today surfaces; a bookmarked visit redirects rather than errors | Phase C7 (US7) — FR-066/067 |
| 12 | Header avatar placeholder | Initials-based placeholder when no profile image is set | Phase C7 (US7) — FR-064 |
| 13 | Undo-toast accent/motion tokens | Reuse the existing single accent and the ≤200ms motion budget; no new design token | Phase C5 (US4) — implementation detail, no separate task; noted so nobody adds a token for one component |

## Project Structure

### Documentation (this feature)

```text
specs/005-daily-sadhana/
├── plan.md                          # This file
├── design-input.md                  # Already exists — 19 UX requirements, 13 decisions
├── spec.md                          # Already exists
├── research.md                      # Phase 1 output — local-day library choice, outbox
│                                    #   reuse vs. new queue, streak-derivation shape
├── data-model.md                    # Phase 1 output — the five tables in full, indexes,
│                                    #   RLS policy bodies
├── contracts/
│   └── guidance-tone.md             # [OWNER SIGN-OFF] decision #6 — copy-style note,
│                                    #   held before any guidance entry is authored
└── tasks.md                         # This PR
```

### Source (repository root, sketch — full detail in `data-model.md`)

```text
supabase/migrations/
└── <ts>_sadhana.sql                 # intentions, practice_checkins,
                                     #   practice_reflections, practice_ritual_state,
                                     #   practice_milestones, practice_guidance_dismissals
                                     #   + RLS, per the content/signal split above

data/
├── guidance/*.md                    # NEW — trigger-gated corpus, frontmatter:
                                     #   trigger, priority. Prose held per decision #6
└── sadhana/
    └── grace-budget.json            # NEW — { "size": N, "periodDays": M } (decision #4)

scripts/
├── validate-guidance.mjs            # NEW — trigger/priority schema + uniqueness (FR-038)
└── verify-migrations.sh             # Appended: sadhana RLS + the RULE-V5 proof over
                                     #   practice_reflections

src/lib/sadhana/
├── local-day.ts                     # NEW — resolveLocalDay(), decision #1
├── streak.ts                        # NEW — computeStreak(checkins, graceBudget), pure
├── guidance.ts                      # NEW — trigger/priority selection, pure
└── return-card.ts                   # NEW — version-matched intention lookup, pure

src/lib/storage/
└── checkin-outbox.ts                # NEW — mirrors src/lib/storage/outbox.ts (004)

src/components/sadhana/              # NEW — Today's check-in, streak, return-card,
                                     #   guidance-card, and sharing-pill components

src/app/(dashboard)/…                # US5's cohort dashboard route (exact path TBD in
                                     #   research.md against 002/003's app-tree conventions)

src/components/layout/
├── AppHeader.tsx                    # US7: avatar becomes a standalone header element
└── PrimaryNav.tsx                   # US7: 5→3 tabs (exact file TBD in research.md)

docs/krama-guardrails.md             # §1.3 testid table: nav-home/compose/flows/poses/
                                     #   learn retired, in the same commit as US7 (FR-065)
src/types/database.ts                # Regenerated after the sadhana migration
```

## Phasing

Each phase is one PR, mirroring `004`'s and `003`'s convention of a schema-only phase
before any UI phase, so a reviewer looking at a table reasons about the table's
guarantees rather than a UI's conditionals.

| Phase | Contents | Story | Gate before the next |
|---|---|---|---|
| **B** | This plan, `tasks.md`; `.specify/feature.json` and `CLAUDE.md` repointed | — | — |
| **C0** | `research.md`, `data-model.md`, `contracts/guidance-tone.md` (held) | — | Constitution Check re-verified against the filled-in design |
| **C1** | Schema, RLS, the content/signal split, `data/sadhana/grace-budget.json`, the RULE-V5 proof. No UI | Foundation | `bash scripts/verify-migrations.sh` green, including the new sadhana assertions |
| **C2** | One-tap check-in, local-day resolution, previous-day affordance, offline check-in queue, privacy microcopy | US1 | Check-in Playwright walk green; offline check-in not lost when simulated offline |
| **C3** | Streak display, rest logging, grace-budget detail, milestone cards, the FR-024 negative assertion | US2 | `npm run lint:copy` green on every new string; SC-004/005/008 asserted, not eyeballed |
| **C4** | Versioned intention, return card, re-entry offer, "I'm resting" response | US3 | Version-matched quoting proven with a revision made mid-lapse |
| **C5** | Sharing pill, stop-sharing sheet + undo toast, cohort dashboard, the dashboard's RULE-V5 query test | US4, US5 | `verify-migrations.sh`'s cohort-teacher query returns zero rows against `practice_reflections`; SC-016 asserted in CI |
| **C6** | Guidance corpus schema + `validate:guidance`, trigger/priority selection, Today's single-card slot | US6 (P2) | CI fails on a missing/duplicate priority; corpus prose stays empty until `contracts/guidance-tone.md` is signed off |
| **C7** | 5→3 navigation collapse, avatar placeholder, `/learn` retirement + redirect, testid contract update | US7 (P2) | `npm run test:e2e` green with the retired identifiers gone from the contract table and every affected walk test updated in the same commit |

C1 is the load-bearing phase, the same role `004`'s C1 played for flows: US1, US2, US3,
and US5 all read or write tables C1 creates, and US4's sharing UI reads a column `002`
already created. C6 and C7 are sequenced last because the spec itself prioritizes them P2,
and because C7 retires five test identifiers — it wants the rest of the feature settled
first, the same reasoning `spec.md`'s own "Why this priority" note for US7 gives.
