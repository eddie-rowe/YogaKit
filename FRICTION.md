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

## `supabase gen types --local` fails on macOS: "client password must be a string"

**2026-09-03, regenerating `src/types/database.ts` for the 004 C1 migration; resolved
2026-09-04.** `npx supabase gen types typescript --local` starts its generator container,
resolves the database host on the project's docker network (`Connecting to
supabase_db_YogaKit 5432`), and then dies inside `pg-meta` with `SASL:
SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`. The container never receives
a password, and `--debug` adds nothing but a missing `~/.supabase/profile`.

Three things it is *not*, each ruled out rather than assumed. **Not authentication** — the
CLI is logged in and linked, and `migration list --linked` works. **Not stale local state** —
`stop --no-backup` + `rm -rf supabase/.temp` + `start` changes nothing (and costs you the
project link, which `supabase link --project-ref` restores). **Not a regression in the
current CLI** — 2.113.0, 2.115.0 and 2.116.0 fail identically. `--db-url` is not a way out
either: that generator container is *not* attached to the project network, so every host
spelling — `db`, `host.docker.internal`, the container name, with or without `--network-id` —
fails with `getaddrinfo ENOTFOUND`.

The way through, since the running stack already contains the exact generator the CLI would
have shelled out to, is to query it over HTTP instead of through the broken hand-off. That is
now `npm run db:types` (`scripts/db-types-local.sh`), and it produces byte-identical output —
given two things that cost an hour between them. `included_schemas` must carry
`graphql_public` as well as `public`, or the diff comes back with 28 deleted lines and looks
like a regression. And the CLI appends one trailing newline the raw pg-meta response does
not, so the script finishes with `printf '\n' >>` — otherwise the local diff is clean and CI
fails on a single blank line, which is exactly what happened on #13.

**CI is unaffected and stays on the official `--local` path.** `scripts/db-types-check.sh` is
green on GitHub's runners, so this is a local-only shim, and repointing the check at the shim
would mean CI no longer verifies the command a developer is told to run.

2026-09-04 — The `supabase-preview` gate added in #14 passes, and gates nothing. Two
distinct causes both surface as the same `skipped` conclusion, and only one of them is
benign. On #14 (config change, no migration) the integration correctly had nothing to apply.
On #13 — two new files under `supabase/migrations/`, exactly the case the gate exists for —
it also came back `skipped`, and the check's own summary says why: *"This git branch is not
associated with any Supabase Branch."* No preview branch was created, because **automatic
branching is off**, so there was nothing to migrate and nothing to fail. `supabase branches
list` shows only the default `main`. The generalisable part: **a gate that returns the same
verdict when it is working and when it is disabled is not yet a gate**, and the first PR that
should have exercised it is the only place that shows the difference. The job now emits a
`::warning::` on any skip and names both causes, because the alternative — treating `skipped`
as a hard failure — would block every PR until the setting is changed, and the setting is not
in this repo. Cheap to have caught here; expensive to discover the day a migration is broken.

2026-09-08 — The generated-types drift check failed on #18, a PR that touches no schema and
no migration. The whole diff was five `extends` clauses gaining parentheses:
`EnumName extends DefaultSchemaEnumNameOrOptions extends { … } : never = never` became
`EnumName extends (DefaultSchemaEnumNameOrOptions extends { … } : never) = never`. Nothing
about this project changed; `postgres-meta` v0.99.0 emits it and v0.98.0 did not.

The mechanism is worth writing down because it looked twice like something it wasn't. The job
pinned nothing: `supabase/setup-cli@v1` was on `version: latest`, and the steps then called
`npx supabase`, which ignores the installed binary and fetches the newest package from npm
anyway — so **the pin would not have held even when it was written**. The check compares a
committed file against freshly generated output, which makes the generator's version an input
to the comparison, on a par with the migrations. Pointing it at a moving generator means any
upstream release fails the next PR to open, whoever wrote it and whatever it contains.

Now pinned to CLI 2.117.0, and `db-types-check.sh` prefers a `supabase` on PATH over
`npx supabase` so the pin is real. Bumping it is a deliberate commit that carries the
regenerated file — which is what a drift check is supposed to make people do.

The generalisable part: **an equality check against regenerated output is only as
deterministic as its generator**, and `latest` anywhere in that path converts an upstream
release into a failure attributed to an unrelated author. The local shim has the same coupling
from the other side — its output comes from whatever pg-meta the running stack pulled, which
lags until the stack is restarted — so `db-types-local.sh` now says so and gives the one-line
`docker ps` that settles which side of a disagreement is stale.

2026-09-08 — Two production deploys failed in a row, and neither build was broken. `#17`
(008) and `#18` (004 US1) both reached `Error` on Vercel with `Command "npm run build"
exited with 1`, after `next build` had already printed a complete, successful route table.
What failed was the step after it: `scripts/upload-sourcemaps.mjs`, throwing
`DATADOG_API_KEY environment variable not set`.

The cause is a bug in `datadog-ci` 5.23.0, not in the configuration. `sourcemaps upload`
resolves its API key from `DATADOG_API_KEY || DD_API_KEY` like every other command — but it
builds its internal metrics logger *first*, and alone among the upload commands it
constructs that logger with no `apiKey` argument at all, so the bundled `datadog-metrics`
falls back to `process.env.DATADOG_API_KEY` only and throws. Every sibling command passes
`apiKey: this.config.apiKey`; this one passes site, tags, and prefix and nothing else. So a
repo that standardised on `DD_API_KEY` — this one did, deliberately and consistently — hits
it on every build that has a key at all. Mirroring the key under the other name is the
entire fix.

Three things made this cost more than it should have.

**Preview builds passed, so the gate looked green.** `DD_API_KEY` is scoped to production,
so previews took the no-op path and every PR check was clean. The failure was only ever
reachable on the one environment with no pre-merge signal. A secret scoped to production is
also a *code path* scoped to production.

**The failure was in the deploy, not the build.** `ci.yml` had already learned this lesson
for the JUnit upload and marked it `continue-on-error: true`; the sourcemap upload made the
same optional-telemetry call inside `npm run build`, which on Vercel *is* the deploy. Its
own docstring claimed a degrade-don't-abort posture it did not implement once a key was
present. It now exits 0 on any upload failure, and deletes the maps either way — an
unresolved stack is degraded telemetry, a map left in `.next/static` is a disclosure.

**Nothing was down.** Vercel keeps serving the last successful deployment, so the site was
fine on a build from before either merge — which is why this surfaced as "an error after the
merge" rather than an outage, and why it could have sat unnoticed for days while every
merged change quietly failed to ship.

The generalisable part: **a build step that is optional must be optional at the point where
the build is also the deploy**, and the environment that runs it in anger must not be the
only one with no pre-merge signal. A near-miss found while fixing it: datadog-ci defaults
its upload site to US1 while this project's RUM is on `us5`, so setting `DD_API_KEY` without
`DD_SITE` uploads every map to the wrong region, where both halves succeed and stacks never
resolve. That one now warns.

2026-09-08 — The source maps have been uploading with no commit attached since 008 shipped,
and the only trace of it was one line in a deploy log nobody reads. `datadog-ci` printed
`⚠️ An error occurred while invoking git: Error: No git remotes available` on every
production deploy. Vercel builds from a tarball, not a clone: there is no `.git`, so there is
no remote and no SHA. The upload succeeded, the maps resolved, and stacks de-minified — so
nothing looked broken. What silently did not happen is the part the maps were uploaded for:
no frame linked to a line on GitHub, and no error could be attributed to a deploy.

It sat because it was found by accident. It was noticed while reading a deploy log for an
unrelated failure, three weeks after 008 shipped. Nothing was watching for it: warnings in a
build log have no monitor, no gate, and no owner, and this one is printed by a step that is
deliberately non-fatal — the same degrade-don't-abort posture that (correctly) keeps a
telemetry failure from stopping a deploy also guarantees its failures are invisible.

Two related things were sitting in exactly the same blind spot, and were only found by
pulling the same thread. `NEXT_PUBLIC_DD_VERSION` had been hardcoded `1.0.0` since 008
shipped, so every deploy reported as the same release and every build's maps piled up under
one version. And CI's Datadog integration was a JUnit XML upload — a file of pass/fail lines
with no per-test spans, so no test history, no flaky detection, no per-session coverage.
Neither was a bug anyone had filed. Both were "configured", which reads as done.

The generalisable part: **"the integration is set up" and "the integration is producing the
thing you set it up for" are different claims, and only the first one is easy to check.**
Every one of these three passed a plausible smoke test — maps uploaded, tests reported, RUM
had a version — while the specific capability each was for (deploy attribution, commit
deep-links, test history) had never once worked. A checklist item that says "GitHub
integration enabled" would have been checked; the box at `docs/OBSERVABILITY.md:129` was in
fact an unchecked manual step whose stale text still described the JUnit upload as a *future*
plan, months after it shipped. What would have caught it is asking, once, of each integration:
what would I look at in the UI to see this working? For source maps that is a stack frame
with a GitHub link on it — a thirty-second check that had never been run.

Same day, found by the CI run on the branch that fixed the above: **the JUnit upload had
never once succeeded.** `DD_API_KEY` is not a GitHub Actions secret and never has been —
`gh secret list` on this repo returns nothing at all. Every run since `008` shipped ended
that step with `Neither DATADOG_API_KEY nor DD_API_KEY is in your environment` →
`Internal Error: API key is missing` → `Process completed with exit code 1`, swallowed by
`continue-on-error: true`. Datadog has received zero test results for the entire life of
the integration.

Three separate things had to line up for that to stay invisible for three weeks, and all
three were deliberate choices that were individually right. `continue-on-error: true` was
correct — an optional telemetry upload must not fail a build. A step that fails but is
allowed to fail renders as a green check with a small annotation nobody opens. And the
plan for *this* change asserted "`DD_API_KEY` already exists as a repo secret (the JUnit
step uses it) — no new secret needed", reasoning from the workflow file rather than from
the secret store: **the YAML references a secret, therefore the secret exists.** It does
not. The reference compiles to an empty string and everything downstream degrades politely.

That last one is the generalisable part, and it is nastier than it looks, because the new
dd-trace step inherits the exact same shape: no key means no `NODE_OPTIONS`, which means
no tracer, which means a green build that sends nothing. The failure mode is identical;
only the error message is gone. **A configuration claim read out of the file that consumes
the config is not evidence** — `gh secret list` is one command, and it would have caught
this three weeks and one incorrect plan earlier.

Same day, one layer up: **the service name was already right everywhere in the repo, and
that was not enough.** `src/lib/dd-service-name.ts` exists precisely to defend the
`service:yogakit` tag — it normalizes a hyphenated `DD_SERVICE` back to `yogakit` and warns
loudly at boot, with a comment explaining that a hyphen would silently break every monitor
query. `DD_SERVICE` was set correctly. Traces, metrics and RUM all carried
`service:yogakit`. Logs arrived as `service:yoga-kit` anyway, for the whole life of the log
drain.

The reason is that two different mechanisms decide that name and only one of them reads
config. `@vercel/otel` takes the service name from `DD_SERVICE`, through the guard.
Vercel's Datadog log drain takes it from the **Vercel project slug** and never looks at
`DD_SERVICE` at all — nor does it parse the JSON stdout line, so the `service` field
`logger.ts` writes into every log body was never promoted to an attribute
(`@service:yogakit`: zero results, which is itself the tell).

The generalisable part: **a guard protects the path it sits on, and its existence is
reassuring out of proportion to its reach.** The comment in `dd-service-name.ts` describes
the hazard accurately and completely for tracing, which made the tag feel settled and made
the logs' disagreement read as a Datadog bug rather than a second, unguarded code path. The
check that would have caught it is the same one that catches everything else in this file:
for each signal type, ask *what actually sets this field*, and confirm it — logs, traces,
metrics and RUM are four separate answers, not one.

Runner-up from the same investigation, worth naming because it wasted the most time: I
concluded "the Vercel drains are not connected" from a query that filtered on the very tag
that was broken. APM had 1,526 spans the whole time, under `env:production` rather than
`env:prod`. **A zero from a filtered query is evidence about the filter until you have
proved the filter.** The fix is to widen to a control query first — no tag filter, or a
known-good service — and only trust a zero once something non-zero has come back through
the same code path.
