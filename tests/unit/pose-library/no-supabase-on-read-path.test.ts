// T074 / Test I7 / SC-012 (RULE-O6/O7): the pose library stays readable with no account.
// This walks the static import graph from the pose routes and `src/lib/pose-library/**`
// and fails if any module it reaches imports a Supabase client, the sync/sharing storage
// layers, or the entitlement layer. It is the guard a well-meaning refactor breaks by
// accident — e.g. a pose card that "just" checks a favourite against the server.
//
// Scope: the pose route's own modules only. The global `src/app/layout.tsx`, `AppHeader`
// and `AccountMenu` legitimately use Supabase to show the session; they wrap every route
// and are deliberately out of scope here. The page must still render without them
// reaching the pose read path, which is what this test pins.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { specifiersOf } from '../architecture/import-scan'

const ROOT = join(__dirname, '..', '..', '..')
const SRC = join(ROOT, 'src')

export const FORBIDDEN: RegExp[] = [
  /^@supabase\//,
  /^@\/lib\/supabase(\/|$)/,
  /^@\/lib\/storage\/sync(\/|$)/,
  /^@\/lib\/storage\/sharing(\/|$)/,
  /^@\/lib\/entitlements(\/|$)/,
]

const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs']

function resolveFile(base: string): string | null {
  if (existsSync(base) && statSync(base).isFile()) return base
  for (const ext of EXTS) if (existsSync(base + ext)) return base + ext
  for (const ext of EXTS) if (existsSync(join(base, 'index' + ext))) return join(base, 'index' + ext)
  return null
}

/** Resolve a specifier to a file inside `src/`, or null for packages and out-of-src files. */
function resolveInSrc(spec: string, from: string): string | null {
  let base: string
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec)
  else return null
  const file = resolveFile(base)
  return file && file.startsWith(SRC + '/') ? file : null
}

/** Every forbidden import reachable from `entries`, as `file -> specifier`. */
export function forbiddenImports(
  entries: string[],
  read: (file: string) => string = (f) => readFileSync(f, 'utf8'),
): { from: string; spec: string }[] {
  const seen = new Set<string>()
  const queue = [...entries]
  const hits: { from: string; spec: string }[] = []
  while (queue.length) {
    const file = queue.shift()!
    if (seen.has(file)) continue
    seen.add(file)
    for (const spec of specifiersOf(read(file))) {
      if (FORBIDDEN.some((re) => re.test(spec))) {
        hits.push({ from: relative(ROOT, file), spec })
        continue
      }
      const next = resolveInSrc(spec, file)
      if (next && !seen.has(next)) queue.push(next)
    }
  }
  return hits
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p)
  }
  return out
}

const ENTRIES = [
  join(SRC, 'app/poses/page.tsx'),
  join(SRC, 'app/poses/[slug]/page.tsx'),
  ...walk(join(SRC, 'lib/pose-library')),
]

describe('signed-out pose read path reaches no Supabase client (T074 / I7 / SC-012)', () => {
  it('has real entry points to walk', () => {
    for (const e of ENTRIES) expect(existsSync(e), relative(ROOT, e)).toBe(true)
    expect(ENTRIES.length).toBeGreaterThan(2)
  })

  it('imports no @supabase/*, @/lib/supabase, sync, sharing, or entitlements module', () => {
    expect(forbiddenImports(ENTRIES)).toEqual([])
  })

  it('would catch a forbidden import planted anywhere in the graph, transitively', () => {
    const entry = join(SRC, 'lib/pose-library/index.ts')
    const planted = (f: string) =>
      f === entry
        ? readFileSync(f, 'utf8') + "\nimport { createClient } from '@/lib/supabase/client'\n"
        : readFileSync(f, 'utf8')
    expect(forbiddenImports([join(SRC, 'app/poses/page.tsx')], planted)).toEqual([
      { from: 'src/lib/pose-library/index.ts', spec: '@/lib/supabase/client' },
    ])
  })

  it('parses every import form it claims to', () => {
    const text = [
      "import { a } from '@supabase/ssr'",
      "import type { B } from '@/lib/entitlements'",
      "export * from '@/lib/storage/sync'",
      "import '@/lib/storage/sharing/x'",
      "const m = await import('@/lib/supabase/server')",
      "import { ok } from '@/lib/pose-types'",
      "import {\n  a, // don't\n  b, /* it's */\n} from '@/lib/storage/sync'",
      "const c = require('@supabase/supabase-js')",
    ].join('\n')
    const specs = specifiersOf(text)
    expect(specs.filter((s) => FORBIDDEN.some((re) => re.test(s)))).toHaveLength(7)
    expect(specs).toContain('@/lib/pose-types')
  })
})
