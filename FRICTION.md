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
