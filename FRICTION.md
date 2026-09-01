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
