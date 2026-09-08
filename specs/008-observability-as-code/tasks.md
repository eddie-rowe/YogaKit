# Tasks: Observability as Code

**Feature**: `008-observability-as-code` | **Plan**: [plan.md](./plan.md)

Status as of 2026-09-04. Phases 1-3.5 complete and live-verified against us5,
including a hand-run `/autoobs` sweep and `docs/OBSERVABILITY.md`. Verification
(T042-T048) complete except T048: RULE-L6's Lighthouse floor is not met on the read
view (87/100 mobile), but the gap is pre-existing (client-side IndexedDB round trip
in `ReadViewClient.tsx`) and not caused by RUM (86 without RUM on the same build) —
see T048's note. Everything else in this feature is done.

## Phase 1 — US4: instrumentation cannot leak practice content (P1)

| # | Task | FR | State |
|---|---|---|---|
| T001 | `src/lib/telemetry/scrub.ts` — pure `scrubViewUrl`, `scrubErrorMessage` | FR-022 | ✅ |
| T002 | `tests/unit/telemetry/scrub.test.ts`, 100% of the module | FR-022 | ✅ |
| T003 | Add `scrub.ts` to `vitest.config.ts` `coverage.include` | — | ✅ |
| T004 | `src/instrumentation-client.ts` — RUM init with `beforeSend` wired to the scrubber, posture flags held fixed | FR-025, FR-026 | ✅ |
| T005 | Delete `src/components/DatadogRum.tsx` and its mount in `src/app/layout.tsx` | FR-026 | ✅ |
| T006 | `src/app/global-error.tsx`, `src/app/error.tsx` — error boundaries, scrubbed | — (closes a pre-existing gap) | ✅ |
| T007 | `scripts/lib/telemetry-check.mjs` — pure content-free assertion over manifests + logger call sites | FR-021 | ✅ |
| T008 | `scripts/check-telemetry-content-free.mjs` — thin CLI, `--dir` flag, non-zero exit | FR-021 | ✅ |
| T009 | `tests/unit/telemetry-check/check.test.ts`, incl. a seeded-violation case proving the gate can fail | SC-007 | ✅ |
| T010 | Add `telemetry-check.mjs` to `vitest.config.ts` `coverage.include` | — | ✅ |
| T011 | `.github/workflows/ci.yml` — blocking step, no `\|\| true` | FR-021 | ✅ |
| T012 | Extend `src/lib/utils/logger.ts` — `dd.trace_id`/`dd.span_id`, top-level `error.kind`/`error.message`/`error.stack` | — | ✅ |

## Phase 2 — US1: alerting reviewed in a PR, not clicked in a console (P1)

| # | Task | FR | State |
|---|---|---|---|
| T013 | Create the YogaKit RUM application in us5; record application ID + client token | — | ✅ |
| T014 | `.env.example` — document every Datadog var, purpose, required-ness | FR-017 | ✅ |
| T015 | `datadog/monitors/*.json` — RUM error rate, web vitals (LCP/INP), API error rate, API latency p95, synthetic-down | FR-009 | ✅ |
| T016 | `datadog/slos/*.json` — read-view availability (FR-009 floor), RUM error-free sessions | FR-009 | ✅ |
| T017 | `datadog/synthetics/api/*.json` — homepage, read view, poses index | — | ✅ |
| T018 | `datadog/synthetics/browser/*.json` — read-flow stub, `status: paused` | — | ✅ |
| T019 | `datadog/dashboards/yogakit-health.json` | — | ✅ |
| T020 | `datadog/logs-metrics/*.json` | — | ✅ |
| T021 | `datadog/service-catalog/yogakit.yaml` | — | ✅ |
| T022 | `datadog/README.md` — structure, identity convention, running the sync | FR-001 | ✅ |
| T023 | `scripts/lib/datadog-sync.mjs` — pure: validation, diffing, tag/handle resolution, dashboard title matching, widget-ID stripping | FR-002–FR-008, FR-024 | ✅ |
| T024 | `scripts/datadog/sync.mjs` — thin: CLI parsing, `pup`/REST calls per type, table output | FR-002–FR-007 | ✅ |
| T025 | `tests/unit/datadog/sync.test.ts`, incl. invalid-manifest-blocks-whole-run and idempotent-second-run cases | SC-002, SC-003 | ✅ |
| T026 | Add `datadog-sync.mjs` to `vitest.config.ts` `coverage.include` | — | ✅ |
| T027 | `package.json` — `datadog:diff`, `datadog:apply`, `datadog:validate` | — | ✅ |
| T028 | First live `--apply` run; verify diff-then-apply-then-no-diff against us5 | SC-001, SC-003, SC-004 | ✅ (all 6 types: monitors, slos, synthetics-api, synthetics-browser, dashboards, logs-metrics, service-catalog — every one idempotent on re-diff) |

## Phase 3 — US2: a headless routine can read production health unattended (P1)

| # | Task | FR | State |
|---|---|---|---|
| T029 | `src/instrumentation.ts` — `registerOTel` from `@vercel/otel`, `dontPropagateContextUrls` for Supabase/Stripe/Anthropic/Resend | FR-012 | ✅ |
| T030 | `src/lib/dd-service-name.ts` — `normalizeServiceName`, ported from NextMove | — | ✅ |
| T031 | Verify key-auth-only read path: `pup auth logout`, then run every documented query from env vars alone | FR-010, FR-011, SC-005 | ✅ (full `npm run datadog:diff` against all 17 manifests, zero OAuth session, no drift beyond the documented synthetic-monitor artifact) |
| T032 | `.claude/commands/autoobs.md` — degrade-not-abort, per-step time budget, no background subagent, no `AskUserQuestion` | FR-014, FR-015 | ✅ |
| T033 | `docs/routine_runs/autoobs/system-instructions.md` — thin wrapper; command file wins on conflict | — | ✅ |
| T034 | `docs/observation/.gitkeep`, `docs/planning/routine-log.md` — dated-output scaffolding | — | ✅ |
| T035 | Run `/autoobs` by hand once end-to-end; confirm dated digest + one routine-log line | — | ✅ (2026-09-04 sweep: `docs/observation/autoobs/2026-09-04.md` + routine-log line; overall DEGRADED — expected, since RUM has no traffic yet — with all 8 manifest monitors/2 SLOs in sync and all 3 live synthetics passing) |

## Phase 3.5 — US3: one guide maps every routine to its telemetry (P2)

Assembled from Phases 1-3's outputs, not built independently — see `plan.md` "Where the
spec and the plan diverge."

| # | Task | FR | State |
|---|---|---|---|
| T036 | `docs/OBSERVABILITY.md` §1 — content-free invariant, stated before any query detail | FR-018 | ✅ |
| T037 | §2 — attribute-naming conventions (`usr.*`, `session.*`, `dd.*`) | FR-019 | ✅ |
| T038 | §3 — every env var, purpose, required-ness | FR-017 | ✅ |
| T039 | §4 — routine → signal → query map, each query's time window stated | FR-013, FR-016 | ✅ |
| T040 | §5 — manual setup checklist (log drain, Vercel env, Datadog integrations, synthetics globals) | — | ✅ |
| T041 | §6 — source-map upload command, closing the gap NextMove never closed | — | ✅ |

## Verification (plan.md's numbered list, condensed)

| # | Check | Ref | State |
|---|---|---|---|
| T042 | Full unit suite + coverage gate green | — | ✅ (405/405 tests, 100% across all 4 metrics) |
| T043 | `lint:copy`, `validate:poses`, `tsc --noEmit`, `next build` all green | — | ✅ (all four green; fixed a pre-existing `sync.test.ts` TS strictness gap in `formatResultLine`'s optional `detail` field along the way) |
| T044 | Seed invalid manifest → `--apply` changes zero objects | SC-002 | ✅ (seeded a monitor missing `query`; `--apply` rejected it, applied nothing, real monitors confirmed unchanged on the next diff) |
| T045 | Seed unresolvable-handle monitor → sync rejects it | SC-010 | ✅ (seeded `@not-a-real-handle@nowhere.invalid`; rejected before any network mutation) |
| T046 | Unset every `NEXT_PUBLIC_DD_*` → clean console, no thrown error | SC-011 | ✅ (ran `next dev` with every `NEXT_PUBLIC_DD_*` explicitly empty; server started clean, `/` returned 200, no thrown error — `instrumentation-client.ts`'s `if (applicationId && clientToken …)` guard skips `init()` entirely) |
| T047 | Live RUM proof: load `/poses/<slug>` and `/read/<id>`, query us5, assert no slug/title reached Datadog | FR-020 | ✅ (production build + headless Chromium via Playwright, real `.env.local` creds; captured the actual RUM beacons sent to `browser-intake-us5-datadoghq.com` for `/poses/down-dog` and `/read/test-flow-secret-title-abc123` — both carried `view.url: "/poses/[slug]"` / `"/read/[id]"`, never the real slug/id; re-queried `us5` live via `/api/v2/rum/events/search` and confirmed the stored event's `view.url`/`view.url_path` are the same scrubbed values) |
| T048 | Lighthouse mobile ≥ 90 on the read view with RUM live | RULE-L6 | ⚠️ (measured 87 with RUM live vs. 86 with RUM disabled on the same build/route — RUM's own overhead is ~1 point, not the gate. The real ~4s mobile LCP comes from `ReadViewClient.tsx`'s async `getFlow(id)` IndexedDB lookup, a pre-existing "Loading…" → content/not-found round trip unrelated to 008. Below the RULE-L6 floor, but 008 is not the cause and fixing the read view's loading pattern is out of this feature's scope — flagging as a pre-existing gap for a future perf pass rather than silently marking green.) |

## Open against another feature

| # | Task | FR | Owner |
|---|---|---|---|
| T049 | Schedule `/autoobs` on a cadence; owner-digest issue automation; escalation ladder | FR-015 (partial) | `007-autonomous-operations` — no scheduler exists yet |
| T050 | Retrofit structured logging into call sites that don't yet exist | — | Deferred by spec Assumptions; not this feature's job |
