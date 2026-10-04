# Implementation Plan: Profile & Settings

**Branch**: `006-profile-settings` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-profile-settings/spec.md`

## Summary

One `/settings` shell, then the things that only make sense once it exists. Three P1
stories, one shared component, and a deliberate ordering because one story is
safety-critical and the others mount into the shell:

1. **US1 — the shell.** A single route with a visible index, fixed section order, and
   conditional sections (org memberships, studio) that are *absent*, not disabled. Every
   other story mounts into this.
2. **US2 — one-interaction revoke.** One practice-visibility component, mounted in settings
   and inline on Today. The concrete implementation of RULE-V6. This is the feature's
   load-bearing story.
3. **US3 — explicit, itemized claim.** No local flow is adopted without a confirmation
   that names every flow; a decline leaves a named way back.
4. **US4/US5 (P2)** — discoverable sign-in and sign-out with resend and code paste;
   explicit re-grant of signal sharing. **US6 (P3)** — pre-paint theme, stranded preference
   keys, named field presets.

**Why US2 is reviewed hardest even though US1 is built first.** US1 is plumbing. US2 is the
place where a UI decision (inline versus link-out, open decision #1) is a constitutional
compliance decision, and where the database function behind the control
(`app_revoke_signal_sharing`, `supabase/migrations/20260826224206_cohorts.sql:233`) is
today a *toggle*. A toggle cannot satisfy FR-019 (re-grant only by explicit named action) or
FR-016 (never report a revoke that was not recorded) without a closer look. See "Where the
spec and the code disagree" below.

**What does not change.** The friction engine and validator-lite are not touched (RULE-H6).
Nothing in this feature adds a database or network dependency to their path. The pose
library in `data/poses/` stays readable with no account (RULE-O6). The billing portal is
`002`'s; this feature owns placement and copy only.

## Dependencies on `005` (explicit)

`006` consumes three things from `005` and states its fallback for each, so a slipped `005`
never blocks a privacy-relevant requirement.

| `006` needs | From `005` | If `005` has not landed |
|---|---|---|
| Header account element to host sign-in and sign-out (FR-028, UX-009) | FR-063/064: the standalone header avatar with initials placeholder, from the three-tab nav restructure | **Do not defer.** Place sign-in and sign-out in the existing `src/components/layout/AppHeader.tsx` navigation. An undiscoverable sign-out on a shared device is not acceptable while waiting (spec Assumptions). Re-home to the avatar when `005` lands |
| Today screen to mount the practice-visibility control inline (FR-011/012, RULE-V6) | US4 / FR-044 to FR-051: the visible sharing pill, plain-language sheet, and one-interaction revoke with undo on the practice screen | `006` builds the shared component and mounts it in settings first. The Today mounting is a small import once `005`'s Today exists. **Until then RULE-V6 is met only by the settings path, which is the secondary path; record that as an open gap, not as done** |
| The per-enrollment sharing semantics and the signals-only boundary | `005` FR-050/051 (undo window, signals stop being returned) and the cohort dashboard's signal view | `006` does not redefine them. It owns the *control and its copy*; `005` owns what the dashboard returns |

Also stated, so the boundary is not re-litigated:

- **Ownership of the control.** `005` specifies the inline pill and sheet on Today; `006`
  specifies the single shared component both mount. They must be one component (FR-013,
  SC-006). Whichever feature lands second adopts the first's component rather than building
  a second. Neither may fork the copy.
- **`005`'s blocked dependency** (the enrollment UI does not exist) means there is currently
  no grant moment. `006` US5's named re-grant action therefore ships on the memberships
  surface and does not assume an enrollment join flow.
- **Nav test identifiers.** `005` retires five navigation identifiers in one commit
  (FR-065). `006` adds sign-in and sign-out identifiers after that; it must not reintroduce
  a retired one and must follow `docs/krama-guardrails.md` (no testid a prefix of another).

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 (App Router), React 19 + React Compiler
**Primary Dependencies**: `@supabase/ssr` + `@supabase/supabase-js` (existing clients in
`src/lib/supabase/`), `idb` (existing), Tailwind v4 `@theme inline` tokens
**Storage**: Postgres (Supabase) is the source of truth for profile, enrollments, and
presets. Theme is a cookie (`krama-theme`) read by a pre-paint inline script, per
`src/lib/theme.ts`. The four per-surface `localStorage` keys (`krama-compose-layer`,
`krama-pose-detail-layer`, `krama-pose-detail-custom-fields`, `krama-claim-flows-decided`)
are migrated, not abandoned
**Testing**: Vitest (pure modules, section-visibility derivation, claim itemization,
preference migration); Playwright QA config (`playwright.config.qa.ts`, 390x844) for the
walks; `scripts/verify-migrations.sh` against bare Postgres in the `db-verify` CI job for
RLS and function assertions
**Target Platform**: Web, mobile-first PWA with service worker
**Performance Goals**: No regression to Lighthouse mobile >= 90 on the read view (RULE-L6);
the theme pre-paint script is inline and tiny, with no added render-blocking request
**Constraints**: Settings introduces no read-gate on cached personal preferences (FR-010,
RULE-L3/L4); a revoke is not reported complete until durably recorded (FR-016); practice
content is excluded structurally, not by application code (RULE-V1/V2); every string on
this surface passes `npm run lint:copy` (RULE-C5); one accent colour (guardrails section 2)
**Scale/Scope**: Nine sections, one account at a time, tens of flows to claim, a handful of
enrollments and presets. No settings search (open decision #3, below the threshold)

## Resolved open decisions

The spec adopts the recommended default for all four; the plan treats them as settled and
builds to them.

| # | Decision | Resolution |
|---|---|---|
| 1 | Today's privacy control | The full shared component inline, never a link-out (RULE-V6: a link-out is two interactions) |
| 2 | Studio location | Inside `/settings`, separated by spacing, hairlines, and labels; no `/admin` route, no second accent |
| 3 | Settings search | Not at launch; revisit past roughly ten sections |
| 4 | Claim confirmation | Full list of flow names plus count, inline; never a bare count |

## Constitution Check

*GATE: Must pass before implementation. Re-check after each phase.*

Evaluated against constitution v3.0.0 (`.specify/memory/constitution.md`):

| Principle | Check | Result |
|---|---|---|
| I. Safety is Sovereign | No sequence generation and no safety judgement in this feature. | PASS (N/A) |
| II. The Teacher Decides; the App Proposes | Claiming local flows is the practitioner's explicit decision (FR-021): the app lists, the person confirms. Nothing is adopted on the app's initiative. | PASS |
| III. Deterministic Authority, AI Optional | `src/lib/friction/` and `src/lib/validator/` are not modified. Section-visibility derivation and claim itemization are pure functions over account state. No AI call. | PASS |
| IV. Embodied Intelligence | Authors no cue, movement name, or teacher voice. Preset names are the user's own. | PASS (N/A) |
| V. Open Data, Sustainable Product | RULE-O6: nothing here gates `data/poses/`. RULE-O7: billing copy states plainly what is and is not gated and surfaces, not redefines, fail-open-on-read and fail-closed-on-write (FR-009). Settings adds no entitlement check on reading what the person owns (FR-010). The billing portal is a hand-off to `002`'s, not a reimplementation. | PASS |
| VI. Lightweight and Accessible | RULE-L3/L4: cached preferences render with no login and no network (FR-010, FR-036). Theme via cookie plus pre-paint script keeps pages statically renderable; `src/lib/theme.ts` records why the layout must not call `cookies()`. RULE-L6: no new blocking request. RULE-L7: no preference value, preset name, or flow name is sent to telemetry. | PASS, with the pre-paint measurement in the US6 phase |
| VII. Compassion Over Compliance | This feature has no streak and no lapse prompt, but it is where a declined claim or a revoked share could be met with nagging. RULE-C1/C2: no copy on the declined-claim re-entry, the revoked-sharing state, or an empty memberships list may use guilt, shame, loss framing, urgency, or a countdown. The re-entry point is a plain named link, not a recurring reminder. Revoking is never discouraged; `005` already chose a brief undo over a blocking confirmation. Every string goes through `npm run lint:copy`, which is blocking CI (`448ee6a`). | PASS, enforced by lint and by the copy tasks in US2 and US3 |
| VIII. Consent-Scoped Visibility | RULE-V3/V6: the revoke control names the org/cohort in plain language and is one interaction from the primary practice screen, via the shared component inline on Today. RULE-V4: each enrollment's sharing flag is a row the user modifies directly, individually legible (FR-018). RULE-V1/V2: nothing in this feature adds a practice-content table or a column joining content to an org, cohort, or teacher. Data export (FR-038) is the author's own rows only. RULE-V5: the existing teacher-cannot-read-content assertion must keep passing, and a new assertion covers any table this feature adds. | PASS, with the function and RLS review flagged needs-human |

No violations requiring Complexity Tracking justification.

### RLS on practice content (explicit)

Practice *content* (journal, reflections, mood/energy, flow notes) is author-only at the
table and RLS layer. This feature must not weaken that:

- **No new content table** is introduced. A preset is a list of pose-detail field names, not
  a note; preferences are display choices.
- **Any new table** (`custom_field_presets`, and preferences if stored server-side) gets four
  policies keyed on `user_id = (select auth.uid())`, update with both `using` and
  `with check`, and carries **no org, cohort, or role column**, so no policy can join it to a
  teacher (RULE-V2). Asserted against `information_schema.columns` and `pg_policies` in
  `scripts/verify-migrations.sh`, the technique `004` used for `flow_item_notes`.
- **Data export** reads through the requesting user's own RLS-scoped client, never a
  service-role path, so "zero rows belonging to another account" (SC-014) is a property of
  the policies, tested with two accounts in one org.
- **Sharing changes** touch only `cohort_enrollments.share_signals`. That flag gates
  signals (RULE-V3), never content, and no content policy references it.

### No-guilt copy rules (explicit)

Applied to every string this feature adds, kept as data in `data/voice/voice-rules.json`
terms and enforced by `npm run lint:copy`:

- The revoke confirmation states what stopped and with whom, in the past tense, with no
  consequence framing.
- The grant action states what will become visible and to whom, before it takes effect
  (FR-020). It does not pressure.
- The declined-claim re-entry is a calm, named, permanent link. No badge, no counter, no
  reminder cadence.
- Sign-in failure copy (expired code, rate limit) states the cause and the next step. No
  countdown on resend; the rate limit is stated as a plain fact.
- Billing copy states what is and is not gated (RULE-O7), without urgency or loss framing.

## Where the spec and the code disagree

Recorded so a later reader is not misled. Re-check each against the code before the task
that depends on it starts.

1. **A settings shell already exists in part.** `src/app/settings/` has `SettingsClient.tsx`
   and `sections/{Appearance,Profile,Security,Section}.tsx`, and `src/lib/theme.ts` already
   implements the cookie plus pre-paint script (its header cites FR-032/033). This is a
   *completion and conformance* feature, not a greenfield one: the tasks begin by auditing
   the shipped surface against FR-001 to FR-007 and FR-032/033 rather than rebuilding it.
   `src/app/account/page.tsx` is a second account surface that the index must reconcile
   (FR-001: no section reachable only by URL).
2. **`app_revoke_signal_sharing` is a toggle.** It sets `share_signals = not share_signals`.
   A toggle can silently re-enable sharing, which FR-019 forbids, and a double tap races.
   The control needs an explicit "set to false" revoke and a separate, named grant. Whether
   that is a new function or a changed one is a schema decision, so **needs-human**.
3. **`cohort_enrollments.share_signals` defaults to `true`**
   (`20260826224206_cohorts.sql:40`). That default is `002`'s and is why the pre-grant
   disclosure matters; `006` does not change it, but must not assume "off by default".
   Raised for owner awareness, not changed here.
4. **There is no enrollment join flow** (`005` records this). The memberships surface can
   show and change existing enrollments; it cannot be where enrollment begins.
5. **`claimed_flows` is the existing claim sink** (`20260826224207_claimed_flows.sql`, with
   `004` backfilling normalized rows). The claim confirmation sits in front of
   `ClaimFlowsPrompt.tsx`; second-device idempotence (FR-026) must be checked against
   `004`'s `app_save_flow` and the `claimed_flows` key, not assumed.

## Project Structure

### New (names confirmed at implementation, shapes fixed here)

```
supabase/migrations/
└── <ts>_profile_settings.sql          # explicit revoke/grant of share_signals;
                                       # custom_field_presets (+ preferences if server-side)

src/components/privacy/
└── PracticeVisibilityControl.tsx      # THE one component; its copy lives in one module

src/lib/settings/
├── sections.ts                        # pure: visibleSections(accountState) -> ordered list
├── preferences.ts                     # pure: stranded-key migration, defaults when storage absent
└── claim.ts                           # pure: itemize(localFlows) for the claim prompt
```

### Modified

```
src/app/settings/SettingsClient.tsx    # index, ordering, conditional sections (US1)
src/app/settings/sections/*            # add Notifications, Privacy, Data, Billing, Memberships, Studio
src/app/account/page.tsx               # reconcile with the index; claim re-entry point (US3)
src/components/layout/AppHeader.tsx    # sign-in / sign-out entry (US4); avatar when 005 lands
src/app/onboarding/ClaimFlowsPrompt.tsx # itemized confirm, decline re-entry, partial failure (US3)
src/app/auth/sign-in/SignInClient.tsx  # resend, rate-limit statement, code paste (US4)
src/lib/theme.ts                       # conformance check only; change only if a gap is found
src/app/poses/PoseDetailContent.tsx    # named presets for the custom field checklist (US6)
src/app/compose/ComposeClient.tsx      # read compose-layer preference from the migrated model
scripts/verify-migrations.sh           # appended DO blocks for the new/changed function and tables
src/types/database.ts                  # regenerated after the migration
```

## Phasing

Each phase is one PR. The schema phase is split from the UI phases on purpose, the same
split `003` and `004` made: a reviewer looking at a function and a UI in one diff reasons
about the UI's conditionals instead of the function's guarantees.

| Phase | Contents | Tier | Gate before the next |
|---|---|---|---|
| **B** | These planning artifacts; `CLAUDE.md` key-artifacts line | auto-ok | `npm run lint:copy` green |
| **C1** | Schema: explicit revoke and grant functions, presets table, RLS, `verify-migrations.sh` assertions, regenerated types. No UI | **needs-human** (schema, RLS) | `bash scripts/verify-migrations.sh` passes; owner reviews the migration |
| **D/US1** | Settings shell audit and completion: index, order, conditional sections, studio separation | auto-ok | Section-visibility unit tests; Playwright walk for zero-org, member, owner |
| **D/US2** | Shared practice-visibility component, settings mounting, Today mounting when `005`'s Today exists | **needs-human** (privacy copy sign-off, RULE-V6 compliance) | One-interaction walk; identical-copy test; RULE-V5 still green |
| **D/US3** | Itemized claim, decline re-entry, partial-failure report | **needs-human** (auth-adjacent claim path, `claimed_flows`) | Zero-adoption-without-confirmation test across the auth paths (SC-007) |
| **D/US4** | Header sign-in and sign-out, resend, rate-limit copy, code paste | **needs-human** (auth) | Cross-device paste walk; no partial session on a bad code |
| **D/US5** | Named re-grant on memberships; no implicit reactivation | **needs-human** (RLS, privacy) | SC-010 across membership, billing, and profile change paths |
| **D/US6** | Pre-paint theme conformance, stranded-key migration, named presets | auto-ok | First-paint measurement; migration preserves values |

## Tiering policy for tasks

`tasks.md` marks every task `[auto-ok]` or `[needs-human]`, matching the labels already used
by `007-autonomous-operations` (`auto-ok`, `auto/needs-human`):

- **needs-human** is mandatory for any task touching a migration, an RLS policy or the
  function behind a visibility grant, authentication or session handling, billing or
  entitlement, or privacy copy carrying an `[OWNER SIGN-OFF]` marker. This follows `007`
  FR-008.
- **auto-ok** is for additive, reversible, test-covered work with none of the above: pure
  modules, UI inside the existing shell, preference handling, docs.
- A mixed task (a UI change that also needs a schema change) is split so the schema half is
  needs-human and the UI half is auto-ok.

Schema, RLS, auth, and billing tasks carry a second flag, written `(schema)`, `(rls)`,
`(auth)`, or `(billing)`, so a reader can see why each needs-human task is gated.

## Risks to name up front

- **The toggle function** (item 2 above) is the highest risk: shipping the inline control on
  top of it would let a double tap re-enable sharing.
- **A second copy of the privacy copy.** If `005` builds its own pill text before this
  component exists, the two will drift. The copy module must land first and `005` must
  import it.
- **Offline revoke (spec edge case).** The control must show "not yet recorded" rather than
  "revoked" when the write has not landed (FR-016). `004`'s outbox is for flows; a revoke is
  a privacy action that should fail visibly, not queue silently.
