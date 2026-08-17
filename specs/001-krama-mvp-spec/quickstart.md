# Quickstart: Krama Development (v0.1)

**Validates**: plan.md | **Date**: 2026-06-22 | **Amended**: 2026-08-17

## Amendment note (2026-08-17)

v0.1 has no AI call anywhere in the critical path — no `ANTHROPIC_API_KEY`, no
`/api/generate`, no fallback-testing step. This quickstart is rewritten around Compose,
the friction engine, and the read view. The old "Verify the Pipeline Manually" section
(AI generation, invalid-key fallback, contraindication filtering) is preserved at the
bottom under **Deferred to v0.2** — it still applies to `src/lib/pipeline/` whenever
that module returns.

## Prerequisites

- Node.js 20+ (`node --version`)
- No API key of any kind is required for v0.1.

## Setup

```bash
git clone <repo>
cd YogaKit
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Validate Pose Library

```bash
npm run validate:poses
```

Runs `ajv validate` against every file in `data/poses/` using
`data/schemas/pose.schema.json`, plus a Tier-1 completeness report (see
`docs/krama-atlas.md`). CI fails on Tier-1 gaps only; Tier-2 gaps produce a warning, not
a failure.

## Run Tests

```bash
npm test                    # all tests
npm test -- friction         # friction engine unit tests (mandatory 100% line coverage)
npm test -- validator        # validator-lite unit tests (mandatory 100% line coverage)
npm test -- storage           # .krama.json export/import round-trip
npm run test:e2e              # Playwright smoke tests
npm run test:coverage         # coverage report — friction + validator must show 100% lines
```

**The friction engine and validator-lite must maintain 100% line coverage.** CI blocks
merges that reduce coverage below this threshold on those two modules.

## Verify Compose and the Friction Engine Manually

With the dev server running:

1. Open `http://localhost:3000/compose`
2. Search for and add at least 5 poses, including two adjacent poses with clearly
   different `orientation` (e.g. a prone pose next to a supine pose).
3. Confirm a seam indicator renders between every adjacent pair, and that the two
   differently-oriented poses show a visibly higher friction tier with a reasoning line
   naming the orientation change.
4. Set a breaths-based measure on one item and a seconds-based measure on another;
   confirm the live total duration updates.
5. Group items into at least two phases using the six-phase template; confirm each
   phase shows its summed duration.
6. Save the flow, navigate to Flows, confirm it's listed. Export it as `.krama.json`,
   then re-import it (a fresh browser profile or private window works) — confirm the
   reimported flow matches exactly.
7. Add a bilateral pose only once (skip its paired side) — confirm the laterality
   warning renders and does not block saving.
8. Open the flow's read view on a narrow (phone-width) viewport, toggle dark mode, and
   confirm phase grouping, large type, and breath-notation marks all render.

## Constitution Check (Quick Reference)

Before shipping any PR touching the friction engine or validator-lite, run:

```bash
npm test -- friction    # 100% line coverage required
npm test -- validator    # 100% line coverage required
```

See `tests/unit/friction/` and `tests/unit/validator/`.

## Adding a Pose

1. Create `data/poses/<slug>.json` (see `contracts/pose-library-schema.md` and
   `docs/krama-atlas.md`), filling every Tier-1 field including the ten new geometry
   fields the friction engine depends on.
2. Run `npm run validate:poses`.
3. Open a PR.

## Project Structure Reference

See `plan.md` → Project Structure for the full directory layout.

---

## Deferred to v0.2 — verifying the AI pipeline (parked, not run in v0.1 CI)

This section describes how the pre-2026-08-17 pipeline was verified. It still applies to
`src/lib/pipeline/` and `/api/generate`, which remain on disk but unlinked from nav —
see `DECISIONS.md` and `contracts/pipeline-api.md`. Do not wire this into v0.1 tasks.

1. Set an `ANTHROPIC_API_KEY` in `.env.local` (never commit this).
2. Open `/dimensions` (not in nav in v0.1 — direct URL only).
3. Set style=yin, duration=60, theme="letting go"; generate — should complete in < 30s.
4. Kill the dev server, set `ANTHROPIC_API_KEY=invalid`, restart; generate again — should
   fall back to rules-engine-only with the indicator shown.
5. Add "high-blood-pressure" to constraints, regenerate — no inverted poses should appear.
