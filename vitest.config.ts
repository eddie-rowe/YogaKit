import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['**/node_modules/**', '**/.claude/worktrees/**', 'tests/e2e/**', 'tests/e2e-qa/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Coverage mandate transferred from the (now parked) rules engine + safety layer
      // to the friction engine + validator-lite — constitution v2.0.0, RULE-S3.
      include: [
        'src/lib/friction/index.ts',
        'src/lib/validator/lite.ts',
        // 003 US1: the Tier-1 reporting logic. Not constitutionally mandated, but the
        // whole point of extracting it was that "Tier-1 completeness is enforced" should
        // be a tested claim rather than an asserted one — an untested reporter would put
        // us back where we started with a different file name.
        'scripts/lib/tier1-report.mjs',
        // 009 US1: the copy-lint's matching logic. Same argument as above, with more
        // force — this module is the mechanism behind a constitutional rule (RULE-C5),
        // and a voice gate nobody has tested is exactly the kind of check that quietly
        // stops matching and lets the thing it guards through.
        'scripts/lib/copy-lint.mjs',
        // 008 US4: the telemetry scrubber. This is the mechanism behind RULE-L7 for
        // RUM — the same argument as tier1-report.mjs and copy-lint.mjs above, with
        // the same force: an untested privacy gate is a claim, not a gate.
        'src/lib/telemetry/scrub.ts',
        // 008 US1: the sync tool's validation, diffing, tag/handle resolution, and
        // dashboard title/widget-ID logic — the same argument as tier1-report.mjs and
        // copy-lint.mjs above, with the same force: the sync tool is the only path by
        // which config reaches production Datadog, so an untested gate here is a claim,
        // not a gate.
        'scripts/lib/datadog-sync.mjs',
        // 008 US4: the content-free check's matching logic — the automated test RULE-L7
        // never had. Same argument again: a check that asserts a constitutional
        // guarantee and is itself untested is a claim, not a gate.
        'scripts/lib/telemetry-check.mjs',
        // 008 US2: the source-map upload's decision logic (whether to run, what
        // datadog-ci gets, which files to clean up) — same argument as the other
        // Datadog-adjacent modules above: this is the only thing standing between
        // "captured" and "readable" for production error stacks, so it needs to be a
        // tested claim, not an asserted one.
        'scripts/lib/sourcemaps.mjs',
      ],
      // One threshold for all three files. The plan allowed the new module its own,
      // lower number; it turned out not to need one — a pure function over parsed JSON
      // has nothing in it that is hard to reach, so a separate threshold would only have
      // documented an exemption nobody was using.
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
