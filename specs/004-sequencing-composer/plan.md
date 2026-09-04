# Implementation Plan: Sequencing Composer

**Branch**: `004-sequencing-composer` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-sequencing-composer/spec.md`

## Summary

Make the teacher's work durable, then make it shareable, then finish the surfaces it lives
on. Four P1 stories, reordered from the spec's presentation order because one of them is
load-bearing for the rest:

1. **US2 — a write is safe the instant it is made.** Flows move from browser-only storage to
   a normalized Postgres schema with the IndexedDB cache demoted to an offline read cache and
   a durable local outbox in front of every network attempt. This is the feature's
   foundation and the reason for the reorder.
2. **US3 — sharing cannot leak what the author wrote for themselves.** The first time flow
   data crosses an author boundary. Enforced by a table split, not by the sharing screen.
3. **US1 — the read view is legible at arm's length.**
4. **US4 — the composer can be safely worked on.** Decomposition with the testid contract
   preserved exactly.

US5–US8 (P2/P3) are specified in `spec.md` and built later.

**Why US2 first, stated plainly.** `002` shipped the whole commercial foundation —
organizations, memberships, entitlements, seats, Stripe tables, RLS, a bare-Postgres RLS
harness in CI — on top of a product where clearing a browser deletes everything the teacher
has ever made. `src/lib/storage/flow-store.ts:1` is explicit: *"Local-first, no server."*
There is no `flows` table in any migration. You cannot charge a subscription for that, and
US3 plus all 67 FRs of `005` are blocked behind it.

**What does not change.** The friction engine and validator-lite are not touched. Nothing in
this feature may add a database or network dependency to their path (FR-036, RULE-H6), and
SC-013 asks for that to be *asserted automatically* rather than reviewed — so this feature
adds the assertion (T-C2-09).

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 (App Router, Turbopack), React 19 + React
Compiler
**Primary Dependencies**: `idb` (IndexedDB wrapper, existing), `@supabase/ssr` +
`@supabase/supabase-js` (existing, three clients in `src/lib/supabase/`), Tailwind v4 with
`@theme inline` tokens (no `tailwind.config`)
**Storage**: Postgres via Supabase as the source of truth for user-authored flows — the
feature's four new tables. IndexedDB (`krama` DB, store `flows`) demoted to an offline read
cache and gaining a second store, `outbox`. `data/poses/` is untouched and stays the pose
authority
**Testing**: Vitest for the pure modules, the outbox reducer, and the import-graph assertion;
Playwright (`playwright.config.qa.ts`, 390×844, `isMobile`/`hasTouch`, no `webServer`) for the
offline-edit walk; `scripts/verify-migrations.sh` against bare Postgres in the `db-verify` CI
job for the RLS and structural assertions
**Target Platform**: Web, mobile-first, existing PWA with a service worker
**Performance Goals**: No regression to Lighthouse mobile ≥ 90 (RULE-L6). Every new or
changed interaction within the ≤200ms no-bounce motion budget (FR-058, SC-019). The
sync-state label must not poll visibly (FR-013)
**Constraints**: Reading a flow already in the local cache MUST work with no network, no
account, and no sync state (FR-006, FR-014, RULE-L3/L4 — the 6am test); a flow edit MUST be
durable locally before any network attempt (FR-007) and MUST NOT be reported as saved if it
was not (FR-008); author-only content MUST be excluded structurally, verifiable from schema
and query alone with zero application-layer conditionals load-bearing for it (FR-022/023,
SC-009, Principle VIII); the friction engine and validator-lite stay pure and keep 100% line
coverage
**Scale/Scope**: A flow is tens of items, not thousands. Single-author objects with no
concurrent editing — which is why last-writer-wins is proportionate and a merge UI is not

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against constitution v3.0.0 (`.specify/memory/constitution.md`):

| Principle | Check | Result |
|---|---|---|
| I. Safety is Sovereign | No sequence generation, no safety judgement. The validator warns and never blocks (FR-047), which is the principle's own shape. | PASS (N/A) |
| II. The Teacher Decides; the App Proposes | RULE-T3, no black boxes. Seam tier and validator warnings are derived client-side by pure functions the teacher can read the output of; FR-044 anchors each warning to the item it concerns, which makes the derivation locally legible rather than a global verdict. Sync is never an authority over content — last-writer-wins is *disclosed*, not silent (FR-018). | PASS |
| III. Deterministic Authority, AI Optional | RULE-H6. `src/lib/friction/` and `src/lib/validator/` are not modified by any story here. US2 adds a server *underneath* the storage layer, which sits downstream of both. FR-036 forbids adding a DB or network dependency to their path and SC-013 asks for it to be asserted automatically — so the assertion is a deliverable of C2, not a promise. No AI anywhere. | PASS, with the assertion specified in research.md §6 |
| IV. Embodied Intelligence | The feature derives structure — durations, intent tags, seam tiers — and authors no cue and no teacher voice. The one place it writes about the body is the read view's measure rendering, which reports what the teacher authored. | PASS |
| V. Open Data, Sustainable Product | RULE-O6/O7. `data/poses/` remains the pose authority with no server mirror and no entitlement check; `flow_items.pose_slug` is `text` with no FK into a poses table, for the same reason `003`'s `pose_notes.pose_slug` is (research.md §5). A user's own flows are their own records, so RULE-O7 forbids gating them on entitlement — no policy in this feature consults entitlements. Flow-count caps, when they exist, are `002`'s to add and will reference `flows.user_id`. | PASS |
| VI. Lightweight and Accessible | RULE-L3/L4 — the 6am test. This is the principle most at risk in this feature and the one most heavily guarded: FR-006, FR-014, SC-004, the trap list in this plan, and `tests/e2e-qa/offline-read.spec.ts` which must stay green unmodified. RULE-L6 — the sync label renders nothing when settled (FR-011) and does not poll visibly (FR-013). | PASS |
| VII. Compassion Over Compliance | No streak and no lapse copy in this feature. But a sync-failure notice is exactly where urgency vocabulary creeps in, so every string on the outbox path goes through `009`'s copy-lint, which is now CI-gating (`448ee6a`). FR-015's single non-blocking banner with a chosen retry, rather than an automatic loop, is the same instinct in interaction form. | PASS |
| VIII. Consent-Scoped Visibility | RULE-V1/V2/V5. This is the feature's load-bearing principle and the reason US3 exists. A flow item's note is practice content. It therefore does not live on `flow_items` — it lives on `flow_item_notes`, a table with no org, cohort, role, or visibility column, so no policy can join it to a teacher. The absence *is* the guarantee, asserted structurally against `information_schema` (RULE-V1) and behaviourally with two accounts in one org (RULE-V5). | PASS, with the contract in contracts/flow-sharing.md |

No violations requiring Complexity Tracking justification.

### Four places the spec and the code disagree

Recorded here so a later reader is not misled by the spec's own assumptions. Each is resolved
in `research.md` with the evidence cited, so the next reader can re-check rather than
re-litigate.

1. **FR-001 and SC-001 ask for a field that does not exist, on the entity that could not
   carry it.** `FlowItem` has no breath-cue field; it has `measure`. The ↑ ↓ ~ vocabulary
   describes a *transition*, not a hold. Resolved in research.md §1.
2. **FR-020 and scenario 10 are already built.** `clearSyncedFlows()` ships, sign-out calls
   it, and it deliberately does *less* than FR-020's literal wording. Resolved in
   research.md §3.
3. **`claimed_flows` has a designed handoff this feature must accept.** Its own migration
   header says the decision belongs to `004`. Resolved in research.md §4.
4. **SC-009's mechanism cannot be a view plus column grants.** `docs/design/002-schema.md` §B
   already worked out why. Resolved in research.md §2.

## Project Structure

### New

```
supabase/migrations/
├── <ts>_flows.sql                     # C1: flows, phases, flow_items, flow_item_notes
│                                      #     + app_save_flow(jsonb), SECURITY INVOKER
└── <ts>_flow_sharing.sql              # US3: flows.shared_org_id and its policies

src/lib/storage/
├── outbox.ts                          # C2: the durable queue, pure reducer + idb access
└── sync.ts                            # C2: flush orchestration, trigger wiring

src/lib/flow/
└── share.ts                           # US3: stripAuthorOnly(flow) — pure

src/components/layout/
└── SyncLabel.tsx                      # C2: the one small header label

src/components/compose/                # US4: the decomposition target
```

### Modified

```
src/lib/storage/flow-store.ts          # C2: DB_VERSION bump, outbox store, sign-out sweep
src/lib/storage/krama-file.ts          # US3: export-for-sharing path
src/app/compose/ComposeClient.tsx      # C2 (save path), US4 (decomposition)
src/app/compose/ComposeFlowItem.tsx    # US4: energetic_direction, purple chips, testids
src/app/read/[id]/ReadView.tsx         # US1: measure rendering, current-item marking
src/components/layout/AppHeader.tsx    # C2: mount the sync label
src/app/onboarding/ClaimFlowsPrompt.tsx # C1 backfill: write normalized rows too
scripts/verify-migrations.sh           # C1: appended DO blocks
src/types/database.ts                  # C1, US3: regenerated
```

## Phasing

Each phase is one PR. The C1/C2 split is deliberate and should not be collapsed — it is the
same split `003` made between US6a and US6b, for the same reason: a reviewer looking at a
table and a UI in one diff reasons about the UI's conditionals instead of the table's
guarantees.

| Phase | Contents | Gate before the next |
|---|---|---|
| **B** | These planning artifacts; `.specify/feature.json` and `CLAUDE.md` repointed | — |
| **C1** | Schema, RLS, `app_save_flow`, `verify-migrations.sh` assertions, regenerated types. No UI. | `bash scripts/verify-migrations.sh` green |
| **C2** | Outbox, flush triggers, sync label, sign-out sweep, the RULE-H6 import-graph assertion | Offline-edit Playwright walk green; `offline-read.spec.ts` green unmodified |
| **D/US3** | `shared_org_id`, the share and duplicate paths, `stripAuthorOnly`, export-for-sharing | The invariant table in `contracts/flow-sharing.md`, all rows proven |
| **D/US1** | Read-view measure rendering and current-item marking | SC-002, SC-003 measured, not assumed |
| **D/US4** | Composer decomposition, `energetic_direction` adoption, testid rename | `npm run test:e2e` 19 pass / 0 fail |

US3 lands immediately after C1, before C2, if the schema argument is still fresh — it needs
only the tables, not the outbox. Sequenced after C2 above because C2 is the smaller
increment on top of C1 and keeps the durability story in one reviewable pair.
