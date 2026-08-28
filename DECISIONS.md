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
