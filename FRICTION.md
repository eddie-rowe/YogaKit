# Friction Log

The running log of sequencing friction discovered through actual use — building flows,
reading them at 6am, teaching from them. Append dated, one-liner entries at the bottom.
**Do not edit or delete old entries** — if something changes, add a new entry that says
so. This file is the seed for the v0.2 spec (see `docs/krama-v0.1-spec.md` §8).

Format: `YYYY-MM-DD — observation (pose slugs / phase / context if relevant)`

---

2026-08-17 — Log opened. No entries yet — first entries land once poses are entered and
the friction engine is running against real flows (target: Sept 30 gate, per spec §9).

2026-08-31 — `globals.css` maps `--font-serif: var(--font-cormorant)` but `layout.tsx` only
loads Geist, so `--font-cormorant` is never defined and every `font-serif` heading (page
titles across Settings, Flows, Read) silently falls back to the sans stack. The serif
treatment the design calls for has never actually rendered.

2026-08-31 — Radix packages installed at different times pull their own copies of
`react-dismissable-layer` and `react-focus-scope`. Those keep a module-level layer stack, so
two versions means two stacks: a dropdown and a dialog each believed they owned focus and
recursed until the stack blew. Caught by a jsdom component test; would have been a subtler
focus bug in a browser. `npm ls @radix-ui/react-dismissable-layer` should show one version
after adding any Radix overlay package.

2026-08-31 — `public/sw.js` handles every GET with an unconditional cache-first
`caches.match(event.request)`, and `/_next/static/chunks/*` gets written into the same
`krama-v2` cache as the app shell. So the second visit to a page serves the *previous*
build's chunks against the current build's HTML: in dev every chunk request came back
`ERR_ABORTED` and React never hydrated at all — the header rendered as bare server HTML
with no avatar, which read exactly like a broken sign-in. In production the same shape
means a deploy is invisible until `CACHE_VERSION` is bumped by hand. Found while
verifying the account avatar; the fix is to exclude `/_next/` from the cache-first branch
(or serve it network-first) and stop precaching hashed assets, but that touches the
RULE-L2/L3/L4 offline read path and deserves its own change.

2026-09-01 — The `sw.js` cache-first defect above is fixed: navigations are network-first,
`/_next/static/*` stays cache-first in a separate unversioned-by-deploy asset cache, and
everything else same-origin is stale-while-revalidate. Two things learned that the original
entry did not anticipate. First, **a browser test cannot catch this bug**: poisoning needs a
document cached from one build served against another build's chunks, and a fresh Playwright
context only ever has one build — `tests/e2e-qa/offline-read.spec.ts` was written first and
verified to pass against the *broken* worker. The regression is only checkable at the
strategy level, so it is a unit test (`tests/unit/sw/service-worker.test.ts`, 12 cases, 7 of
which fail against the old worker). Second, the two caches must be separated: hashed asset
URLs are safe to keep across deploys and are what make an offline load work *after* a
deploy, whereas documents are not, so wiping both together would have traded this bug for a
worse one.

2026-09-01 — The `--font-cormorant` entry above is fixed: `Cormorant_Garamond` is loaded in
`layout.tsx` and the token now reads `var(--font-cormorant, ui-serif), Georgia, …`. The
fallback in the `var()` is the actual lesson — the original bug was silent for two features
because an undefined custom property makes `font-family` fall through to inherited sans
rather than erroring, so nothing anywhere reported it. Any token that resolves to another
token should carry a terminal fallback for the same reason.

2026-09-01 — `tests/e2e-qa/walk4-read.spec.ts` asserts every read-view item carries a
breath mark, and it does not hold: the vinyasa flow renders **53 items and 34
`read-breath-mark` nodes**, so 19 items show no breath or time marking at all. This is one
of the four e2e failures that have been carried as "pre-existing" for three features
without anyone reading what they said — the failure is a real content gap on the surface a
teacher reads from a mat, not a flaky test. Found while writing the offline read test, which
initially copied walk4's assertion and inherited its failure. Belongs to `004` US1.

2026-09-01 — The copy-lint's first real hit was a false one, and the fix for it found a
limit in the mechanism. `src/app/api/org/invitations/route.ts` says "This link expires in
7 days" — a factual statement of a security token's lifetime, not a practice countdown, so
`VOICE-COUNTDOWN` is right to see it and wrong to fail on it. That is what the FR-016
exception marker is for. But the string sat inside a **multi-line template literal**, and
the marker is a comment on the preceding line — inside a template, the preceding line is
string content, so writing the marker there would have shipped the words
`copy-lint-ignore-next-line` into a customer's invitation email. The fix was to hoist the
fragment to a named constant and mark that, which is fine, but it is a real constraint:
**an exception can only be granted to a string that has a line of code above it.** Anyone
adding a marker inside a template will discover this the same way.

2026-09-01 — `react/no-unescaped-entities` silently disarmed half the copy-lint's rules.
JSX text cannot carry a bare apostrophe, so real copy is written `Don&apos;t let yourself
down` — and every rule pattern containing an apostrophe therefore matched nothing on the
surface where most copy actually lives. Cost: nothing, because it was caught within
minutes; found only by seeding a **two**-violation test string and noticing the report said
one. A single-violation fixture would have passed and the gap would have shipped. The
lesson is the fixture, not the entity: a check that is verified with one seeded hit only
proves one path works. `decodeEntities()` now runs before matching and typographic
apostrophes are normalised at match time.

2026-09-02 — The walk4 entry above is **wrong**, and the entry stands only because this log
forbids editing old ones. The vinyasa flow has 34 items and every one carries a measure;
`[data-testid^="read-item-"]` also matched the 19 `read-item-note-{i}` nodes, and 34 + 19 =
53. There was never a content gap. Two lessons, and the second is the one that generalises.
First, **no testid may be a prefix of another** — a prefix selector is a normal thing to
write, so the note testid is now `read-note-{index}` and the rule is in
`docs/krama-guardrails.md` §1.3. The `compose-item-*` family still violates it, which is why
`tests/e2e-qa/walk2-compose.spec.ts:22` carries a hardcoded index list instead of a prefix
selector; that rename belongs to `004` US4. Second, **a failing assertion is a claim about
the test as much as about the code** — this one was carried as "pre-existing" across three
features and then written up as a defect in the product on the strength of a count, without
anyone asking why the count differed. Reading the flow JSON took two minutes and would have
found it at any point in those three features.

2026-09-02 — The fourth long-running e2e failure ("bottom tab bar … nav is instant") had two
independent causes, and neither was the >200ms transition assertion the failure looked like
it was about. **One:** Playwright's `page.screenshot()` defaults to `caret: 'hide'`, which it
implements by writing `style="caret-color: transparent"` onto inputs. A screenshot taken
immediately after `goto` lands *before* React hydrates, so React reports an attribute
mismatch on `poses-search-input`, the Next dev error overlay opens full-screen, and
`<nextjs-portal>` then intercepts every click for the rest of the test. `caret: 'initial'` is
now on all 20 screenshot calls in `tests/e2e-qa/`. **Two:** the Next dev tools indicator
renders at `[20, 788, 36, 36]`, which at 390×844 sits on top of the bottom tab bar's first
tab — so in dev you also cannot tap Home by hand. `devIndicators: false` in `next.config.ts`;
every corner collides with something on a mobile-first layout, so it is off rather than
moved. Verified by putting it back: 1 of 2 runs failed with the caret fix already in place.
The generalisable part: **a test-harness convenience can author a hydration error**, and a
dev-only overlay that swallows pointer events reports itself as "element is visible, enabled
and stable" followed by 58 silent retries — the symptom is nowhere near the cause.
