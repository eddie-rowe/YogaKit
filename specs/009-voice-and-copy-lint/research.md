# Research: Voice and Copy-Lint

**Feature**: `009-voice-and-copy-lint` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

Six questions had to be settled before the checker could be written. Four were settled by
the spec's own Assumptions section; two were settled by building it and watching what
happened. The last one — §6 — was not visible from the spec at all.

---

## 1. Which document is authoritative, and what does it not repeat?

**Decision.** `VOICE.md` at the repository root, referenced from `CLAUDE.md`'s key
artifacts list (FR-001). It states the voice and points at the constitution; it does not
restate RULE-C1 through RULE-C6 (FR-005).

**Why the pointer rather than a copy.** Two documents that both state a rule will
eventually state it differently, and then the question of which one is binding is decided
by whoever is reading. `VOICE.md` §4 carries a precedence list with the constitution at
the top and a sentence saying that if the two ever disagree, `VOICE.md` is the bug.

What `VOICE.md` §4 *does* add is a worked before/after pair per rule. A rule without an
example is not checkable by a human, and RULE-C1–C6 are stated in the constitution as
prohibitions rather than as sentences. The violating examples are deliberately plausible
shapes this product could have shipped, not straw men.

## 2. Extraction: parse, or grep?

**Decision.** Parse. `extractCopy` walks the TypeScript AST via `ts.createSourceFile`.

**Why.** FR-014 requires the check ignore identifiers, comments, and technical strings. A
regex over raw text cannot do that — it would flag a commented-out string, an import
path, and a Tailwind class list, and the fix for each would be another exclusion regex.
An AST walk gets it structurally: a comment is not a node, an import specifier's parent is
an `ImportDeclaration`, and a class name's parent is a `JsxAttribute` named `className`.

`typescript` is already a devDependency, so this cost nothing.

**What the attribute allow/deny list gets wrong if it goes wrong.** `alt`, `aria-label`,
`placeholder`, `title`, and `label` all carry text a person reads and are deliberately
*absent* from `TECHNICAL_ATTRIBUTES`. Adding one of them by mistake is the likeliest way
this check quietly loses coverage, which is why there is a test naming all four.

## 3. Scope: which directories?

**Decision.** `src/app` and `src/components`. Location-based, as the spec's Assumptions
adopted, with `.test.` / `.spec.` / `__tests__` excluded.

**`src/lib` is deliberately out.** It holds the friction engine and validator-lite. They
author no copy — Principle IV forbids it — so scanning them can only produce noise, and
lint noise on the RULE-H6 path is worse than no coverage there.

**`data/poses/` is deliberately out.** The traditional, anatomical, and energetic material
is authored content with its own review path (`docs/design/003-tier1-review.md`). It is
not subject to the product's voice, and RULE-O6 makes it open data rather than product
copy. Stated in `VOICE.md` §6.2 so nobody later reads a green run as covering it.

## 4. Rules as data, not code

**Decision.** `data/voice/voice-rules.json`. `compileRules()` turns it into matchers.

**Why.** Same argument the constitution makes for the friction engine's weights: tuning is
data, not code. Changing what the product's voice forbids should be a reviewable diff
against a file of rules with rationales and examples, not an edit inside a checker where
the change is invisible in the diff's shape.

Each rule carries the constitution rule it derives from, or `VOICE.md` where it has no
constitutional basis (only `VOICE-AI-TELLS`), plus a rationale and a matched
compliant/violating example pair. A unit test asserts every rule matches its own
violating example and clears its own compliant one, so a rule that stops working fails
the build rather than silently passing everything.

**Precision over recall, deliberately.** `unlock` and `elevate` are scoped to
`unlock your potential` / `elevate your practice`, because **"unlock the hips" and
"elevate the ribs" are real cues a teacher gives**. A voice check that flags correct
teaching language gets bypassed, and a bypassed check is worse than a narrow one.

## 5. Em dashes: a deliberate divergence from the source conventions

`docs/BEST_PRACTICES_FROM_NEXTMOVE.md` bans the em dash. **Not adopted.**

That rule belongs to a briefing voice optimised for scanning. This product's voice is a
teacher speaking out loud, and an em dash is how a spoken aside actually sounds. The rest
of the repository — this file included — uses them freely, so importing the ban would have
meant either a lint that fails on its own documentation or a rule nobody follows.

Recorded here because it is the one place `VOICE.md` knowingly departs from its source,
and a later reader comparing the two should find the reason rather than an oversight.

## 6. Two things only building it revealed

Neither was visible from the spec.

**a. JSX forces `&apos;`, and that defeats half the rules.** `react/no-unescaped-entities`
is on, so a bare apostrophe cannot appear in JSX text — copy is written
`Don&apos;t let yourself down`. Every rule pattern containing an apostrophe therefore
matched nothing on the surface where most copy actually lives. Found by seeding a
two-violation string and watching one violation report. `decodeEntities()` now runs before
matching, and typographic `’`/`‘` are normalised to the straight form at match time, since
they are the same word to a reader.

**b. The exception marker cannot sit inside a multi-line template literal.** The marker is
a comment on the preceding line; inside a template, the preceding line is string content,
so writing the marker there would have inserted the words `copy-lint-ignore-next-line`
into a customer's invitation email. The resolution is to hoist the fragment to a named
constant and mark that. This is a real constraint on the mechanism, not a bug — logged in
`FRICTION.md`.

## 7. The coverage boundary, and why it is printed every run

The check prints its own limits on **every** run, passing or failing — five of them, from
`coverageLimits()`, matching `VOICE.md` §6.

A gate trusted for more than it does is worse than no gate: it converts "nobody checked
the copy" into "the copy was checked", and the second is harder to argue with. The only
durable defence is for the gate to say what it does not cover at the moment somebody is
watching it go green. This is the same reasoning behind `validate:poses` printing a
Tier-1 coverage *figure* rather than a pass mark.

The five: interpolated copy, location, tone, coercive structure assembled from compliant
sentences, and language (English only, FR-025).

## 8. Deferred

- **US3 (operational writing, P2)** — FR-023/024. Not built. `VOICE.md` §5 states the
  standard; nothing checks it.
- **FR-020 (session-end gates)** cannot be satisfied: it depends on `007`'s headless
  done-gates, which have no implementation.
