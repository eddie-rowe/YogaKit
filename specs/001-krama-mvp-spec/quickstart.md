# Quickstart: Krama Development

**Validates**: plan.md | **Date**: 2026-06-22

## Prerequisites

- Node.js 20+ (`node --version`)
- An Anthropic API key (get one at console.anthropic.com)

## Setup

```bash
git clone <repo>
cd YogaKit
npm install

# Set your Anthropic API key (never commit this)
cp .env.local.example .env.local
# Edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...

npm run dev
```

App runs at `http://localhost:3000`.

## Validate Pose Library

```bash
npm run validate:poses
```

Runs `ajv validate` against every file in `data/poses/` using
`data/schemas/pose.schema.json`. CI runs this on every PR.

## Run Tests

```bash
npm test                  # all tests
npm test -- pipeline      # rules engine + safety layer tests only (mandatory coverage)
npm run test:e2e          # Playwright end-to-end
```

**The rules engine and safety layer must maintain 100% line coverage.** CI blocks
merges that reduce coverage below this threshold.

## Verify the Pipeline Manually

With the dev server running:

1. Open `http://localhost:3000`
2. Set style=yin, duration=60, theme="letting go"
3. Generate a sequence — should complete in < 30 seconds
4. Kill the dev server, set `ANTHROPIC_API_KEY=invalid` in `.env.local`, restart
5. Generate again — should fall back to rules-engine-only with the indicator shown
6. Add "high-blood-pressure" to constraints, regenerate — no inverted poses should appear

## Constitution Check (Quick Reference)

Before shipping any PR touching the pipeline, run:

```bash
npm test -- pipeline/validate  # safety layer tests
npm test -- pipeline/constrain # rules engine tests
```

All constitution RULE-S* and RULE-H* rules have corresponding test files. See
`tests/unit/pipeline/`.

## Adding a Pose

1. Create `data/poses/<slug>.json` (see `contracts/pose-library-schema.md`)
2. Run `npm run validate:poses`
3. Open a PR

## Project Structure Reference

See `plan.md` → Project Structure for the full directory layout.
