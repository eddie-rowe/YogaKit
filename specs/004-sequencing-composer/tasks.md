---

description: "Task list for feature 004-sequencing-composer"
---

# Tasks: Sequencing Composer

**Input**: Design documents from `/specs/004-sequencing-composer/`
**Prerequisites**: `spec.md`, `design-input.md`, `checklists/` (complete); `plan.md`,
`research.md`, `data-model.md`, `contracts/flow-sharing.md` (authored in Phase 1 below)

**Tests**: Included, and in four places non-negotiably. US2's whole claim is that a write is
durable before any network attempt — a story about durability with no test of a reload while
offline would be self-refuting (SC-004). US3's invariants are safety-critical and are listed
as assertions, not prose, in `contracts/flow-sharing.md` (SC-008, SC-009). SC-013 explicitly
asks for RULE-H6 to be asserted automatically. And the friction engine and validator-lite must
not lose their constitutionally mandated 100% line coverage as a side effect of new files
entering `vitest.config.ts`'s `coverage.include`.

**Organization**: By phase, and each phase is one PR. The Phase 2 / Phase 3 split is
deliberate — see `plan.md`'s Phasing table — and should not be collapsed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to US1–US4 from `spec.md`

## Path Conventions

Single Next.js project, per `plan.md`'s Project Structure. Paths below are exact matches to
that section.

---

## Phase 1: Planning artifacts and pointer repair

**Purpose**: Give `004` the spec-kit artifacts it never had, and settle the three decisions
that were open before any code could be written.

- [X] T001 Author `specs/004-sequencing-composer/plan.md` — technical context, Constitution
  Check against v3.0.0, the four reality corrections, phasing
- [X] T002 [P] Author `specs/004-sequencing-composer/research.md` — eight resolved unknowns,
  three of them corrections to the spec's own premises
- [X] T003 [P] Author `specs/004-sequencing-composer/data-model.md` — the four tables,
  `app_save_flow`, the outbox store, `stripAuthorOnly`
- [X] T004 [P] Author `specs/004-sequencing-composer/contracts/flow-sharing.md` — the author
  boundary as ten assertions **[OWNER SIGN-OFF]** on the sharing copy, deferred to the US3 PR
- [X] T005 Author this file
- [X] T006 Repoint `.specify/feature.json` from `specs/003-pose-library` to
  `specs/004-sequencing-composer`
- [X] T007 Update the key-artifacts block in `CLAUDE.md` to name `004`'s plan as the current
  one and list its artifacts

---

## Phase 2 (C1): Schema, RLS, and CI assertions — no UI

**Purpose**: Give the teacher's work somewhere to live, and make the author boundary
structural before anything writes across it. **Story: US2 (foundation), US3 (prerequisite).**

**Independent test**: `bash scripts/verify-migrations.sh` passes with the new assertions, and
`npx tsc --noEmit` is clean against the regenerated types. No user-visible change.

- [X] T008 [US2] New migration `supabase/migrations/<ts>_flows.sql` — `flows`, `phases`,
  `flow_items`, `flow_item_notes` exactly as `data-model.md` §2, with the indexes
- [X] T009 [US2] RLS on all four tables: four policies each, `user_id = (select auth.uid())`,
  update carrying both `using` and `with check`. `phases` and `flow_items` reach `user_id`
  through `flow_id`; `flow_item_notes` carries its own
- [X] T010 [US2] `app_save_flow(payload jsonb)` per `data-model.md` §3 — `SECURITY INVOKER`,
  `set search_path = public, pg_temp`, `REVOKE EXECUTE FROM public`, `GRANT TO authenticated`
- [X] T011 [US3] Append the I1 and I2 assertions to `scripts/verify-migrations.sh` —
  `information_schema.columns` and `pg_policies` over `flow_item_notes`. These are the two
  that hold against migrations nobody has written yet
- [X] T012 [P] [US2] Append a `verify-migrations.sh` block proving a second account reads zero
  rows of another's `flows`, `phases`, `flow_items`, and `flow_item_notes`
- [X] T013 [P] [US2] Append a block proving `app_save_flow` writes nothing when the payload
  names another user's flow id — the `SECURITY INVOKER` claim, tested rather than asserted
- [X] T014 [US2] Regenerate `src/types/database.ts` via `scripts/db-types-check.sh` (needs a
  local Supabase stack / Docker)
- [X] T015 [US2] Backfill: every existing `claimed_flows.payload`, once, in
  `20260903091000_backfill_claimed_flows.sql`. Not a loop over `app_save_flow` after all —
  that function is `SECURITY INVOKER` and takes its owner from `auth.uid()`, which is null
  in a migration, so the backfill shreds inline and takes the owner from
  `claimed_flows.user_id`. Idempotent, and it steps over a payload whose flow id is not a
  uuid rather than dropping it. `claimed_flows` is kept as provenance and nothing reads
  `payload` after this (`research.md` §4)
- [X] T016 [US2] `src/app/onboarding/ClaimFlowsPrompt.tsx` — the claim path writes normalized
  rows in addition to the payload snapshot

**Gate**: `bash scripts/verify-migrations.sh` → `MIGRATION VERIFICATION PASSED`.

---

## Phase 3 (C2): Write-through, cache, and the outbox

**Purpose**: A write is safe the instant it is made. **Story: US2.**

**Independent test**: Edit a flow with `context.setOffline(true)`, reload still offline,
confirm the edit survived, go online, confirm it flushed with no user action.

- [ ] T017 [US2] `src/lib/storage/flow-store.ts` — bump `DB_VERSION` to 2, add the `outbox`
  store keyed on `flowId`. The upgrade must leave existing `flows` records untouched
- [ ] T018 [US2] `src/lib/storage/outbox.ts` — `OutboxEntry` per `data-model.md` §5, and the
  queue operations. One entry per flow, replaced on each write
- [ ] T019 [P] [US2] Unit tests for the queue: replacement collapses two writes to one entry
  (FR-017); a rejection moves an entry to `dead` and stops retries (FR-016); `attempts`
  distinguishes "not yet" from "never"
- [ ] T020 [US2] `src/lib/storage/sync.ts` — flush orchestration. One `app_save_flow` per
  queued entry, then delete the entry. Triggers: `online`, `visibilitychange`, 60s interval.
  Authenticated sessions only (`research.md` §7)
- [ ] T021 [US2] Derive `SyncState` from the outbox on read rather than writing it twice
  (`data-model.md` §5). `saveFlow`'s signature keeps its default so existing callers are
  unaffected
- [ ] T022 [US2] `src/app/compose/ComposeClient.tsx` — `handleSave` enqueues after the local
  write succeeds, never before. An edit that could not be recorded durably is not reported as
  saved (FR-008)
- [ ] T023 [US2] `src/components/layout/SyncLabel.tsx` + mount in `AppHeader.tsx` — one small
  label, no hue (guardrails §2: a sync label is chrome), nothing rendered when settled
  (FR-011), no visible polling (FR-013)
- [ ] T024 [US2] FR-015's single non-blocking banner with a manual retry on a `dead` entry. No
  automatic retry loop behind it
- [ ] T025 [US2] Sign-out sweep: drop outbox entries whose flow is `synced`, alongside the
  existing `clearSyncedFlows()`. Do not touch entries for locally-authored flows
  (`research.md` §3)
- [ ] T026 [P] [US2] `npm run lint:copy` over every new string on this path. A sync-failure
  notice is where urgency vocabulary creeps in
- [ ] T027 [P] [US2] SC-013: a Vitest test walking the transitive static import graph of
  `src/lib/friction/` and `src/lib/validator/`, failing on any resolution into
  `src/lib/supabase/`, `@supabase/*`, `src/lib/storage/`, or a bare `fetch`
- [ ] T028 [US2] Playwright: the offline-edit walk described in the independent test above
- [ ] T029 [US2] Confirm `tests/e2e-qa/offline-read.spec.ts` passes **unmodified**. A read must
  never wait on sync state (FR-014). If it needed a change, the design is wrong

**Gate**: 19 pass / 0 fail plus the new walk; `offline-read.spec.ts` untouched in the diff.

---

## Phase 4 (US3): Sharing cannot leak what the author wrote for themselves

**Purpose**: The first time flow data crosses an author boundary. **Story: US3.**

**Independent test**: Populate a flow with notes, share it, and inspect the payload a
recipient can obtain by each of the three routes in `contracts/flow-sharing.md` for the
absence of those fields.

- [ ] T030 [US3] Migration `<ts>_flow_sharing.sql` — `flows.shared_org_id`, its index, and the
  org-member read policies on `flows`, `phases`, `flow_items`. **Nothing on
  `flow_item_notes`**
- [ ] T031 [US3] Append the I3–I7 assertions to `scripts/verify-migrations.sh`: two accounts,
  one org, the admin case included
- [ ] T032 [US3] Regenerate `src/types/database.ts`
- [ ] T033 [US3] The share surface: set and revoke `shared_org_id`, and the org-visible list
- [ ] T034 [US3] One-click duplicate — read the shared structure, `app_save_flow` under new
  ids (FR-025). Independence in both directions falls out of that (FR-026)
- [ ] T035 [P] [US3] `src/lib/flow/share.ts` — `stripAuthorOnly(flow)`, pure, plus I8's unit
  tests. Wire it into the export-for-sharing path only (`data-model.md` §6)
- [ ] T036 [P] [US3] I10: an item whose `pose_slug` no longer resolves renders legibly rather
  than failing the flow (FR-031)
- [ ] T037 [US3] Sharing and revoke copy, through the copy-lint, stating that existing
  duplicates are unaffected (FR-032) **[OWNER SIGN-OFF]**

**Gate**: every row of the invariant table in `contracts/flow-sharing.md` proven.

---

## Phase 5 (US1): The read view is legible at arm's length

**Purpose**: The mat-side surface. **Story: US1.**

- [ ] T038 [US1] `breathMark()` in `src/app/read/[id]/ReadView.tsx` — keep the count dominant,
  compress the unit, fix the contrast and size that
  `docs/design-research/09-mat-side-read-view.md:53` actually indicts (`research.md` §1)
- [ ] T039 [US1] Amend `docs/krama-guardrails.md:65` to describe what `read-breath-mark`
  carries, per guardrails §1.3's own change rule
- [ ] T040 [US1] Current-item marking: exactly one item marked at any time (FR-002), a filled
  background plus a size increase, **no second accent colour** (FR-004, `design-input.md` #10)
- [ ] T041 [US1] FR-005 / SC-003: measure the read view's performance budget after the change
  rather than assuming it
- [ ] T042 [P] [US1] Phase headers show a summed duration in the read view (FR-049, UX-007)

---

## Phase 6 (US4): The composer can be safely worked on

**Purpose**: Decomposition with the testid contract preserved exactly. **Story: US4.**

- [ ] T043 [US4] Decompose `src/app/compose/ComposeClient.tsx` into `src/components/compose/`.
  Every existing test identifier survives unchanged (FR-033, SC-011)
- [ ] T044 [US4] The drag handle and the up/down reorder buttons stay sibling elements in the
  same row at every tested width — no overflow-menu collapse (FR-034, SC-012, UX-002)
- [ ] T045 [US4] Adopt `describeEnergeticDirection` from
  `src/lib/pose-library/energetic-direction.ts` at `ComposeFlowItem.tsx:172`, which currently
  renders the bare Sanskrit token
- [ ] T046 [US4] Fix the `bg-purple-50`/`bg-violet-50` chips in `ComposeFlowItem.tsx` — they
  collide with the sanctioned chakra hue (guardrails §2)
- [ ] T047 [US4] Rename the `compose-item-{index}` testid family so no testid is a prefix of
  another (guardrails, added in `3e6b08d`). Then replace the hardcoded index list at
  `tests/e2e-qa/walk2-compose.spec.ts:22` with a prefix selector
- [ ] T048 [US4] FR-035: scroll position preserved across a reorder by drag and by button,
  guarded with a smoke test
- [ ] T049 [US4] Fix the two `set-state-in-effect` errors handed forward from `003` —
  `PoseDetailContent.tsx:74` and `PoseOverlay.tsx:92` — with `useSyncExternalStore`, per
  `src/lib/hooks/useClientValue.ts`

---

## Deferred, and why

| Item | Reason |
|---|---|
| US2 scenario 9 / FR-018 — two devices, last write wins with disclosure | `research.md` §8. The schema supports it; only the detection and the notice are deferred |
| Authored breath cues (↑ ↓ ~) on the seam | `research.md` §1. The honest form of FR-001, and its own story |
| US5 — drag insertion preview and seam hover (P2) | Follow-on PR |
| US6 — warning anchoring and per-session dismissal (P2) | Follow-on PR |
| US7 — phase drag-reorder, derived intent tag, persisted collapse (P2) | Follow-on PR. Note the `intent_tag` tension in `data-model.md` §2 |
| US8 — inline depth escalation in the composer (P3) | Follow-on PR |
| The `.kk-warning` advisory/error colour split | `spec.md` Assumptions — a real accent-colour exception needing sign-off, and the feature ships without it |

---

## Verification, at each phase boundary

```bash
npx tsc --noEmit
npm test                       # 301 on main; must only rise
npx vitest run --coverage      # friction, validator-lite, tier1-report, copy-lint all at 100
npm run lint:copy              # blocking; must stay green
npm run validate:poses         # 67 valid, 67/67 Tier-1
npm run lint                   # must not rise above 29 problems
npm run build                  # /poses ○, all 67 /poses/[slug] ●
bash scripts/verify-migrations.sh   # from Phase 2 on
npm run dev &                  # playwright.config.qa.ts has no webServer
npm run test:e2e               # 19 pass / 0 fail
```
