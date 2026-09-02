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
