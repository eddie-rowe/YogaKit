import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/node_modules/**', '**/.claude/worktrees/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Coverage mandate transferred from the (now parked) rules engine + safety layer
      // to the friction engine + validator-lite — constitution v2.0.0, RULE-S3.
      include: ['src/lib/friction/index.ts', 'src/lib/validator/lite.ts'],
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
