# Decisions

A running why-we-chose log. Append new entries at the bottom; do not edit or delete old
entries — if a decision is reversed, add a new entry that supersedes it and says so.

---

## 2026-08-17 — v0.1 supersedes `specs/001-krama-mvp-spec/`, not a new feature branch

**Context:** `docs/krama-v0.1-spec.md` reframes Krama/Yoga Kit as a deterministic,
teacher-authored sequencing tool. The existing `specs/001-krama-mvp-spec/` artifacts (and
the constitution they were built against) describe an AI-first three-stage pipeline.

**Decision:** Rewrite `specs/001-krama-mvp-spec/` in place to match v0.1, and amend the
constitution to 2.0.0, rather than opening a `specs/002-*` feature and leaving 001 as a
historical fork. `docs/krama-v0.1-spec.md` is the locked, human-facing authority; the
`specs/001-*` tree is its derived, machine-facing form.

**Why:** There is one product. Keeping two live spec trees invites drift between what's
locked and what's implemented. 001 already has a git history worth keeping (clarifications,
checklists) — rewriting in place preserves that trail instead of orphaning it.

---

## 2026-08-17 — Park the AI pipeline; don't delete it

**Context:** `src/lib/pipeline/propose.ts`, the `/api/generate` route, the `/dimensions`
form, and 47 passing tests implement the AI-first pipeline. v0.1 explicitly puts "any AI
at runtime" out of scope.

**Decision:** Leave the modules and their tests in place, unlinked from nav and routes.
Do not delete `propose.ts`, `/api/generate`, `/dimensions`, or their tests. Reuse
`constrain.ts`'s bilateral-pairing logic in validator-lite; reuse `transitions.ts`'s
affinity scoring as the starting point for v0.2's Suggest ranking.

**Why:** This is real, tested work that maps directly onto v0.2 (the Suggest button,
per the spec's crawl → walk → run staging in §6). Deleting it would mean re-deriving the
same logic in a few months. The cost of parking it is a `README` note and some dead nav
links removed — much cheaper than a rewrite.

---

## 2026-08-17 — "Flow" is canonical, end-to-end, including the file format

**Context:** The 001 spec locked a clarification that "Sequence" is the entity name in
data models, APIs, and exports; "class sequence" was explicitly banned. `docs/krama-v0.1-spec.md`
calls the entity a "Flow" throughout (the Flows tab, save/duplicate/edit/delete, the
`.krama.json` export format).

**Decision:** Rename the entity to `Flow` everywhere — types, routes, storage keys, and
the `.krama.json` internal schema (`{"schema_version": ..., "flow": {...}}`, not
`{"sequence": {...}}`). Retire the old "Sequence is canonical" clarification.

**Why:** The alternative — "Flow" in UI copy only, "Sequence" in code and the file format
— means every future contributor has to learn a translation layer, and the exported file
format (meant to be inspectable, hand-editable JSON) would use a word nobody sees in the
app. Renaming once, now, before the format has any real users, is cheaper than migrating
`.krama.json` files later.

---

## 2026-08-17 — Superset pose corpus: keep all 43, add the ~20 missing yang poses

**Context:** The library has 43 poses, all yin/floor-based. The v0.1 roster names ~33
poses covering standing/yang shapes (Warriors, Down Dog, Chaturanga, Triangle, etc.) that
don't exist yet, plus ~28 of the existing 43 aren't on the roster.

**Decision:** Keep all 43 existing poses and author the ~20 missing roster poses, landing
at roughly 63. Do not delete the off-roster yin poses.

**Why:** The 43 existing poses already pass schema validation and several are used by
built-in flows beyond the yin one; deleting working, validated content to match a roster
count is pure loss. The yin built-in gets richer for free. The real cost — more Tier-1
entry work before the Sept 30 gate — is accepted explicitly here rather than discovered
during entry.

---

## 2026-08-18 — Drop HTML5 drag-and-drop reorder in Compose; buttons are the only reorder path

**Context:** Compose's item reorder used native HTML5 `draggable`/`dragstart`/`drop`
handlers. HTML5 DnD does not fire on iOS Safari touch, which is the primary target device
for this app — on a real iPhone, dragging an item silently did nothing, with no error and
no fallback.

**Decision:** Remove the HTML5 DnD handlers entirely. The always-visible ↑/↓ reorder
buttons (already present and working everywhere, including touch) are the sole reorder
mechanism for v0.1. A touch-friendly drag implementation (Pointer Events, drag handle,
drop indicator) is deferred to v0.2.

**Why:** A reorder control that silently does nothing on the primary target device is
worse than no drag at all — it reads as a bug, not a missing feature. The button path
already covers the same functionality end to end; shipping only that path now is honest
about what v0.1 actually supports, and a real touch-drag implementation is worth doing
properly rather than bolted on under gate pressure.

---

## 2026-08-18 — Rename "Krama" to "YogaKit" in UI copy and docs prose only

**Context:** The product is being renamed from "Krama" to "YogaKit" in all user-visible
copy: page title/metadata, the home screen heading, the header wordmark, the PWA manifest,
and the prose/headings in `docs/*.md`.

**Decision:** Rename visible strings only. Deliberately did NOT rename the `.krama.json`
export/import format, the `krama-file.ts` module or its `exportKramaFile`/`importKramaFile`
exports, the IndexedDB database name (`krama`), the `krama-v2` service worker cache
version, or the `krama-compose-layer` / `krama-pose-detail-layer` / `krama_sequence`
localStorage keys.

**Why:** Those identifiers are load-bearing for already-saved and already-exported user
data. Renaming them would silently break existing `.krama.json` exports and in-browser
state with no user-facing benefit — the rename is a branding change, not a data model
change.

---

## 2026-08-26 — Constitution amended to v3.0.0: multi-tenant platform pivot

**Context:** Giaconda reviewed the v0.1 build and loved it, then proposed expanding it
into a multi-tenant platform (`docs/mvp-spec-suggestions.md`): a sequencing composer,
pose library, and a DuoLingo-inspired but explicitly non-punitive "Daily Sadhana"
feature; a Supabase-backed schema with schools/studios/certifying-bodies tenancy,
Supabase auth, and a personal profile area; and a named persona — a newly-graduated
YTT-200 teacher, given a 3-month post-graduation membership so the app acts as a
guru/accountabilibuddy through their first 90 days. The first paying customer is named
and concrete: **One Om School of Yoga**, a certification body that wants cohort-level
analytics on whether its graduates keep a practice going.

This directly contradicted five load-bearing points in constitution v2.0.0: RULE-L3 (no
database), RULE-L4 (no accounts/login), RULE-O1 (no paywall, ever), and the locked
`docs/krama-v0.1-spec.md`'s explicit scope exclusions (accounts, sync, sharing) and
persona (Eddie's own 6am practice, not a cohort of new teachers).

**Decision:** Amend the constitution to v3.0.0 (MAJOR) rather than build the new MVP
against a constitution that forbids it. Key changes:
- Principle V "Free, Open, and Contributable" → "Open Data, Sustainable Product": the
  free-forever clause and RULE-O1 are retired; the pose/meridian/quote data stays open
  and CI-validated regardless of the application being commercial.
- Principle VI "Lightweight and Accessible": RULE-L3/L4 rewritten so user data lives in
  Postgres as source of truth but MUST be cached client-side (IndexedDB) so the offline
  read view — the "6am test" — still works with no network and no re-auth.
- New Principle VII "Compassion Over Compliance": streaks pause, never zero; no
  guilt/shame/urgency copy; every lapse response offers a smaller re-entry; rest is a
  recordable practice state; enforced by a CI copy-lint.
- New Principle VIII "Consent-Scoped Visibility": replaces the blanket "no
  student-identifying information" rule (which cannot survive cohorts) with a structural
  split — practice *content* (journal, mood, notes) is author-only forever, enforced by
  table/RLS separation; practice *signals* (check-in dates, streaks, milestones) are
  visible to a cohort teacher by default, revocable in one interaction, with a CI test
  proving a teacher cannot read a student's journal.

The full execution plan — five new spec-kit features (`002-auth-tenancy-billing` through
`006-profile-settings`), schema design (normalized flows, generated pose mirror, RLS
helper functions, entitlement resolution), and verification strategy — lives in
`/Users/eddie.rowe/.claude/plans/i-met-with-giaconda-declarative-dewdrop.md`.

**Why:** A repo whose constitution actively forbids the product it is building would
either get amended informally feature-by-feature (eroding the document's authority) or
ignored outright. Doing the amendment first, explicitly, with a Sync Impact Report,
keeps the constitution meaningful as the single source of non-negotiables through a
much larger and more consequential expansion than any prior change. `docs/krama-v0.1-spec.md`
is kept as a historical record rather than deleted, per this repo's established pattern
of parking rather than discarding superseded work (see the AI-pipeline parking decision
above).

---

## 2026-08-28 — Design-research corpus added: best-in-class UI/UX per feature

**Context:** With specs 003–006 about to build a large surface of currently-unbuilt or
half-built UI (daily sadhana, settings, billing, offline sync UX, navigation restructure),
there was no reference library of how excellent products actually solve the same
interaction problems YogaKit faces — only the guardrails' typographic/motion constraints,
with no grounding in what "good" looks like in practice.

**Decision:** Ran a 21-agent research fan-out, one report per feature (13 differentiators,
8 implicit/table-stakes features), each independently web-searched and citing ≥3 verified,
current-2026 exemplar apps. Per explicit product direction, exemplars are drawn from
popular/successful apps generally — not limited to yoga or fitness — whenever a non-yoga
app solves the interaction problem better (e.g. Grammarly for advisory warnings, Notion for
progressive depth layers, Apple Find My for revocable sharing). Output lives entirely in
`docs/design-research/` (`README.md` index + synthesis, `01`–`21` per-feature reports); no
`src/` files were touched. Each report ends with an explicit constitution-check section and
tags every concrete proposal `quick win` / `spec 00X` / `needs decision`.

**Why:** Building specs 003–006 from a blank page risks re-deriving, by trial and error,
interaction patterns the industry has already converged on (ambient save-state, threshold-
gated sync indicators, structural rest/pause states, one-interaction-deep revocation). A
one-time research pass, scoped and cited, gives every future spec a concrete design floor
to build from or explicitly deviate from — cheaper up front than discovering the same
lessons live in production. The research also surfaced several real implementation gaps
in already-shipped code (breath cues rendered as text instead of the spec-mandated glyphs
in `ReadView.tsx`; a 300ms transition in `BodySvg.tsx` exceeding the ≤200ms motion budget;
a scope gap in the built phase-structure vs. the full v0.1 spec) — tracked in the README's
"Real implementation gaps" section rather than fixed silently as a side effect of this
research pass.

---

## 2026-08-28 — Design research folded into `003`–`006` as `design-input.md`, not into specs

**Context:** With the design-research corpus in hand (see the entry above), the next step
was to fold its "Fold into YogaKit" findings into `specs/003-pose-library` through
`specs/006-profile-settings`. Those four directories don't exist yet — only
`specs/001-krama-mvp-spec/` and `specs/002-auth-tenancy-billing/` are scaffolded, despite
`CLAUDE.md`, the constitution's Governance section, and the platform-pivot plan all
referencing `003`–`006` by name as the remaining features in dependency order.

**Decision:** Rather than hand-author `spec.md`/`plan.md`/`tasks.md` for four features ahead
of the spec-kit workflow generating them, write one `design-input.md` per feature
(`specs/00X-*/design-input.md`), each with candidate `UX-NNN` requirements (a distinct ID
space from `FR-NNN`, so a generated spec can renumber freely), a constitution-constraints
section, and an open-decisions table with a recommended default stated but left open for
sign-off. All 21 research reports' "Fold into YogaKit" items are routed to exactly one
feature (three previously-unassigned `spec 00X` placeholders were resolved during routing:
01's seam-hover affordance and 02's per-item warning anchor both went to `004` rather than
`003`, since `003` owns no Compose code; 05's multi-select chip-treatment placeholder went to
`003`, since it first surfaces on `/poses`). `specs/002-auth-tenancy-billing/research.md`
got one appended numbered section (billing/paywall UI) rather than new FRs, since `002` is
already merged (commit `a479e4a`) and mid-flight requirement changes there are riskier than
additive research notes. No `src/` file, and no `002` `spec.md`/`plan.md`/`tasks.md`, was
touched.

**Why:** Pre-writing full specs for features that haven't been through `/speckit.specify`
would fork the spec-kit workflow's authority over those documents; a `design-input.md`
staging file gets the research in front of whoever runs that command next without
pre-empting it. Keeping `UX-NNN` distinct from `FR-NNN` means the eventual generated spec
isn't stuck renumbering around IDs written a step early. Appending to `002`'s `research.md`
rather than reopening its merged `spec.md` keeps a shipped feature's requirements stable
while still recording the design intent for its unbuilt billing UI.

## Sign-out clears synced flows only

**Date:** 2026-08-31

**Context:** Two staged decisions gave directly opposite instructions about what sign-out
does to the IndexedDB flow cache. `specs/004-sequencing-composer/design-input.md` UX-011
said "Sign-out MUST clear the flow cache and outbox from IndexedDB" — shared-device safety,
sourced from research 18. `docs/design-research/16-auth-onboarding-claim.md` said the
opposite in its constitution check: "signing out must never clear or hide the
IndexedDB-cached flows that were working offline before any account existed." RULE-L3/L4
back the second: reading a flow already in the client-side cache must work with no login.

The code had already picked a side. `AccountMenu.handleSignOut` called `clearAllFlows()`
unconditionally, so an anonymous practitioner with local flows who signed in once to see
what an account did, then signed out, lost every flow they had ever made — with no warning
and no undo.

**Decision:** Sign-out clears only flows whose `syncState` is `synced`. Locally-authored
`pending` and `failed` records survive. Implemented as `clearSyncedFlows()` in
`src/lib/storage/flow-store.ts`; `clearAllFlows()` stays as the primitive for a future,
explicit "forget everything on this device". UX-011 is amended to match. The sign-out
confirmation dialog states the split in plain language rather than leaving it implicit.

**Why:** Both requirements are about protecting a person, and only one of them is about
protecting them from data they still have elsewhere. A `synced` flow exists on the server;
deleting the local copy costs its owner nothing and is exactly what shared-device safety
asks for. A `pending` flow exists nowhere else, so deleting it is destruction, not hygiene
— and it is precisely the flow RULE-L4's 6am test is about. Reading UX-011 as "clear what
came from the account" satisfies its actual intent (don't leak the previous user's practice)
without the collateral damage its literal wording caused.

This is also forward-safe rather than a stopgap: there is no sync target yet, every record
today reads back `pending` via `withSyncState()`, so the new behaviour is "keep everything"
until the outbox lands — correct for a user who has never synced, and correct afterwards
without a second decision.

---

## 2026-09-01 — Service worker: strategy per request type, and two caches rather than one

**Context:** `public/sw.js` answered every same-origin GET cache-first out of a single
`krama-v2` cache holding both documents and `/_next/static/*` chunks. That serves one
build's HTML against another build's hashed chunks, so React never hydrates and the page
renders as bare, dead server HTML — and it makes a deploy invisible until someone bumps
`CACHE_VERSION` by hand. Logged in `FRICTION.md` on 2026-08-31 and deliberately deferred
out of the 006 PR because it sits on the RULE-L2/L3/L4 offline read path.

**Decision:** Choose the strategy from the request type — navigations network-first,
`/_next/static/*` cache-first, other same-origin stale-while-revalidate, cross-origin and
`/api/`, `/auth/` not intercepted at all — and split the store into `krama-shell-v3` and
`krama-assets-v3`.

**Why:** Cache-first is correct for exactly one class of URL and wrong for the rest.
Content-hashed asset URLs cannot go stale, because the URL changes when the bytes do; a
document URL says nothing about which build answered it. So the single blanket strategy was
never a simplification, it was two different problems sharing one branch.

The two caches matter more than they look. The tempting version of this fix bumps one
version and wipes everything on each deploy — which trades a hydration bug for a worse
offline one, because a practitioner who is offline *after* a deploy would have no document
and no chunks. Hashed URLs are safe to carry across deploys and are what make that load
work; documents are not, and are replaced on every successful navigation. Keeping them in
one cache forces a single eviction policy onto two things with opposite lifetimes.

**Also decided:** the guarantee is asserted at the strategy level, not in a browser. A
Playwright test in a fresh context has only one build and therefore cannot reproduce a
cross-build mismatch — the offline spec written for this change passes against the broken
worker too, which was verified rather than assumed. `tests/unit/sw/service-worker.test.ts`
loads `public/sw.js` into a fake worker global and fails on 7 of 12 cases against the old
one. The Playwright spec is kept for what it *can* prove: that the 6am read works offline
and the page is interactive, which is the constitutional claim rather than the mechanism.

## 2026-09-01 — The copy-lint parses instead of grepping, and prints its own limits

**Context.** RULE-C5 has required a CI-gating copy-lint since constitution v3.0.0 and none
existed. It is a hard prerequisite for `005`, and two features immediately downstream —
`003` US5's thirteen theme subheads and `004`'s fifty-nine FRs — write the most
voice-sensitive copy in the backlog. Built now, out of ladder order, so that copy is linted
as it is authored rather than retrofitted.

**Decision.** Three choices, each of which had an easier alternative.

*Parse the TypeScript AST, do not grep.* FR-014 requires ignoring identifiers, comments,
and technical strings. A regex over raw text cannot do that structurally — it flags a
commented-out string, an import path, and a Tailwind class list, and each fix is another
exclusion regex. An AST walk gets it for free: a comment is not a node. `typescript` was
already a devDependency, so the more correct option was also the cheaper one.

*The rules are data, not code.* `data/voice/voice-rules.json`, each rule carrying the
constitution rule it derives from, a rationale, and a matched compliant/violating example
pair that a unit test asserts against. Same argument the constitution makes for the
friction engine's weights: changing what the product's voice forbids should be a reviewable
diff against a file of rules, not an edit buried inside a checker.

*The check states what it cannot do, on every run, passing or failing.* Five limits, from
`coverageLimits()`, mirroring `VOICE.md` §6.

**Why the last one matters most.** A gate trusted for more than it does is worse than no
gate: it converts "nobody checked the copy" into "the copy was checked", and the second is
much harder to argue with in review. This check cannot read interpolated copy, cannot judge
tone, cannot see a coercive *structure* built from individually compliant sentences, and
covers English only. The only durable defence against being over-trusted is to say so at
the moment somebody is watching it go green. Same reasoning as `validate:poses` printing a
Tier-1 coverage figure rather than a pass mark.

**Also decided.** Precision over recall, deliberately: `VOICE-AI-TELLS` matches
`unlock your potential`, never bare `unlock`, because **"unlock the hips" and "elevate the
ribs" are real cues a teacher gives**. A voice check that flags correct teaching language
gets bypassed, and a bypassed check is worse than a narrow one. And the em-dash ban from
`docs/BEST_PRACTICES_FROM_NEXTMOVE.md` is **not** adopted — that rule belongs to a briefing
voice; this product speaks out loud, and an em dash is how a spoken aside sounds.

---

## 2026-09-03 — FR-001's breath glyphs describe a transition, so they belong on the seam

**Context:** `docs/krama-v0.1-spec.md:141` mandates "breath notation as marks (↑ ↓ ~), never
paragraphs"; `docs/krama-guardrails.md:65` already claims `read-breath-mark` carries those
glyphs; `docs/design-research/09-mat-side-read-view.md:46` calls the text rendering the
single highest-priority quick win in the corpus; and `004` FR-001/SC-001 require it. The
code does none of it: `FlowItem` has no breath-cue field, only `measure`, and `breathMark()`
renders that measure as text.

**Decision:** Satisfy FR-001 by rendering the authored duration in compressed, scannable
notation with the count dominant, and fix the contrast and size of that rendering. Do not
render ↑ ↓ ~. Defer an authored inhale/exhale cue to its own story, and put it on the
**seam** — the boundary between two adjacent items — not on the item.

**Why:** The glyphs mean inhale, exhale, free breath. That vocabulary describes movement
*between* two shapes, not a hold; a yin hold is timed and has no inhale to mark. So the
missing field is not an oversight in the data model — the spec put it on the wrong entity,
and FR-042 already mandates the right one for every adjacent pair. And research 09 contains
the evidence against its own prescription: line 53, writing up the 6am test, names the real
failure as breath-mark text rendering "too low-contrast or too small in a genuinely dark
room." That is a contrast finding, not a text-versus-glyph one. At low brightness a glyph the
reader has to learn is strictly worse than a word they can read — the number is the
actionable datum, and an unfamiliar symbol costs a pause. Full argument in
`specs/004-sequencing-composer/research.md` §1.

---

## 2026-09-03 — `claimed_flows` is kept as a write-once audit trail

**Context:** `supabase/migrations/20260826224207_claimed_flows.sql` hands its own fate to
`004`: read `payload` to build the normalized rows, then "retire this table or keep it as an
audit trail — that decision belongs to 004, not here."

**Decision:** Keep it. The claim path writes normalized `flows` rows in addition to the
payload snapshot, a one-time backfill materializes rows for existing records, and nothing
reads `payload` after that.

**Why:** A claimed flow is a teacher's irreplaceable work arriving from a store the server
has never seen, and the shred from one jsonb blob into four tables is the riskiest write in
`004` — run exactly once per flow. Keeping the source snapshot makes a bad backfill
re-runnable; retiring the table makes it unrecoverable. The cost is one dormant table nobody
queries. What the decision does forbid is ambiguity: after the `004` schema lands, a flow
lives in `flows`/`phases`/`flow_items`, and `claimed_flows` is provenance only.

---

## 2026-09-03 — The author boundary is a table split, not a filtered column

**Context:** An earlier draft of the `004` approach proposed enforcing `FR-022` — author-only
notes excluded from anything crossing to a recipient — with "a view without a `note` column
plus column grants."

**Decision:** `FlowItem.note` does not become a column on `flow_items`. It becomes a row in
`flow_item_notes`, a table with no org, cohort, role, or visibility column, whose only policy
is `user_id = (select auth.uid())`. This supersedes the column-grant idea, which was never
built.

**Why:** `docs/design/002-schema.md` §B had already worked it out: RLS is row-level and
Postgres column grants are role-level, so a grant that hides the note from a colleague hides
it from its author too — both are `authenticated`. And SC-009 asks a reviewer to confirm the
exclusion from the schema and query alone; a query over `flows → phases → flow_items` cannot
return a note because those tables have no column holding one. That is a property of the
query's shape rather than of a condition someone remembered to write. `003` reached the same
place independently for `pose_notes`. Contract:
`specs/004-sequencing-composer/contracts/flow-sharing.md`.

## 2026-09-03 — The `flow_item_notes` write policies check flow ownership, not just the caller

`flow_item_notes.flow_item_id` is the primary key, which makes the row's identity guessable
by anyone who has seen a shared flow. An insert policy of the canonical shape —
`user_id = (select auth.uid())` and nothing more — would have let a second account insert a
note row against another teacher's item id, and the primary key would then have locked the
real owner out of writing a note on their own placement. Not a read leak (the SELECT policy
is still the caller alone, so neither party can read the other's row), but a denial of
service against the author's own work.

The insert and update policies therefore also require that the item belongs to a flow the
caller owns. That predicate reaches `flows.user_id` — still the caller, still nothing
joinable to an org, cohort, or role — so the Principle VIII guarantee is unchanged. What
changed is the wording of invariant I2 in `contracts/flow-sharing.md`, from "each
`user_id = (select auth.uid())`" to "keyed on the caller alone", with the SELECT policy
still asserted as the literal expression.

## 2026-09-03 — The claimed-flows backfill shreds inline instead of calling `app_save_flow`

`app_save_flow` is `SECURITY INVOKER` precisely so RLS applies inside it, which means it
takes the owner from `auth.uid()`. In a migration there is no `auth.uid()`. Rather than
weaken the function — a `p_user_id` parameter, or `SECURITY DEFINER` — the one-time backfill
in `20260903091000_backfill_claimed_flows.sql` repeats the shred and takes the owner from
`claimed_flows.user_id`. Duplicated SQL in a migration that runs once is cheaper than a
permanent hole in the function every authenticated session calls.
