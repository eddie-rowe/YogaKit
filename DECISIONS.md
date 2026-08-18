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
