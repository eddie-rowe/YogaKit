import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { specifiersOf } from './import-scan'

// SC-013 / RULE-H6, made mechanical.
//
// The constitution says the friction engine and validator-lite are deterministic and
// client-side: no AI call, no database read or write, no network call, anywhere in their
// path. Until now that was a promise kept by everyone remembering it. C2 puts a Supabase
// client and an outbox one directory away, and the failure mode is quiet — an engine that
// reaches for a session degrades from "always works at 6am on a plane" to "usually works"
// without a single test going red.
//
// So this walks the actual import graph from both entry points and fails on the first
// edge into anything that could leave the device. It follows imports transitively,
// because the rule is about the path, not the file.

const ROOTS = ['src/lib/friction', 'src/lib/validator']

const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /^@supabase\//, why: 'a Supabase SDK' },
  { pattern: /^@\/lib\/supabase\//, why: 'the Supabase client' },
  { pattern: /^@\/lib\/storage\//, why: 'persistence (IndexedDB, the outbox, sync)' },
  { pattern: /^next\/(headers|cache)$/, why: 'a per-request server API' },
]

/** Bare `fetch(` in the source. Crude on purpose: the rule is that these modules do not
 *  talk to a network, and there is no legitimate use here that would trip it. */
const FETCH = /(?<![\w.])fetch\s*\(/

const repoRoot = path.resolve(__dirname, '../../..')

function listFiles(dir: string): string[] {
  const abs = path.join(repoRoot, dir)
  if (!fs.existsSync(abs)) return []
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(entry => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return listFiles(rel)
    return /\.tsx?$/.test(entry.name) ? [rel] : []
  })
}

const onDisk = (file: string) => {
  const abs = path.join(repoRoot, file)
  return fs.existsSync(abs) && fs.statSync(abs).isFile()
}
const fromDisk = (file: string) => fs.readFileSync(path.join(repoRoot, file), 'utf8')

/** Resolve a specifier to a repo-relative file, or null if it is not first-party code. */
function resolveLocal(
  specifier: string,
  fromFile: string,
  exists: (file: string) => boolean,
): string | null {
  let base: string
  if (specifier.startsWith('@/')) base = path.join('src', specifier.slice(2))
  else if (specifier.startsWith('.')) base = path.join(path.dirname(fromFile), specifier)
  else return null

  const candidates = [
    base,
    base + '.ts',
    base + '.tsx',
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]
  return candidates.find(exists) ?? null
}

/** Walk the import graph from `entries` and report every edge that could leave the device.
 *  `read` and `exists` default to the real tree; the planted cases below swap them for
 *  in-memory sources, so the guard is tested against the code it is meant to reject. */
function violationsFrom(
  entries: string[],
  read: (file: string) => string = fromDisk,
  exists: (file: string) => boolean = onDisk,
): string[] {
  const queue = [...entries]
  const seen = new Set(queue)
  const violations: string[] = []

  while (queue.length > 0) {
    const file = queue.shift() as string
    const source = read(file)

    if (FETCH.test(source)) violations.push(file + ' calls fetch()')

    for (const specifier of specifiersOf(source)) {
      const forbidden = FORBIDDEN.find(rule => rule.pattern.test(specifier))
      if (forbidden) {
        // Report the edge and stop there. What a Supabase client imports is not news.
        violations.push(file + ' imports ' + specifier + ' — ' + forbidden.why)
        continue
      }

      const resolved = resolveLocal(specifier, file, exists)
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved)
        queue.push(resolved)
      }
    }
  }
  return violations
}

describe('engine isolation (RULE-H6)', () => {
  it('reaches no server, database, or network from the friction engine or validator-lite', () => {
    const entries = ROOTS.flatMap(listFiles)
    // A refactor that moves or renames these directories must not turn this into a test
    // that passes by having nothing to check.
    expect(entries.length).toBeGreaterThan(0)

    expect(violationsFrom(entries)).toEqual([])
  })
})

// The guard, turned on itself. Each case plants a source the engine must never contain and
// requires the walk to report it. Every one of these was seeded and watched fail before it
// was pinned (#296): a scanner is only evidence if it is known to go red.
describe('engine isolation scanner catches what it claims to (RULE-H6)', () => {
  const PLANTED = 'src/lib/friction/__planted__.ts'
  const scan = (source: string) =>
    violationsFrom([PLANTED], file => (file === PLANTED ? source : fromDisk(file)))

  it('reports a dynamic import()', () => {
    expect(scan("export const load = async () => await import('@/lib/supabase/client')\n")).toEqual([
      PLANTED + ' imports @/lib/supabase/client — the Supabase client',
    ])
  })

  it('reports a require()', () => {
    expect(scan("const sdk = require('@supabase/supabase-js')\n")).toEqual([
      PLANTED + ' imports @supabase/supabase-js — a Supabase SDK',
    ])
  })

  it('reports a multi-line import list with an apostrophe in a comment', () => {
    const source = "import {\n  a, // don't\n  b, /* it's */\n} from '@/lib/storage/outbox'\n"
    expect(scan(source)).toEqual([
      PLANTED + ' imports @/lib/storage/outbox — persistence (IndexedDB, the outbox, sync)',
    ])
  })

  it('still reports the static forms and a bare fetch()', () => {
    const source = [
      "import { cookies } from 'next/headers'",
      "export * from '@/lib/storage/sync'",
      "import '@supabase/ssr'",
      "export const get = () => fetch('/api/x')",
    ].join('\n')
    expect(scan(source)).toEqual([
      PLANTED + ' calls fetch()',
      PLANTED + ' imports next/headers — a per-request server API',
      PLANTED + ' imports @/lib/storage/sync — persistence (IndexedDB, the outbox, sync)',
      PLANTED + ' imports @supabase/ssr — a Supabase SDK',
    ])
  })

  it('follows the graph: a dynamic import planted in a real engine file is reported there', () => {
    const real = 'src/lib/friction/index.ts'
    const read = (file: string) =>
      file === PLANTED
        ? "export * from './index'\n"
        : file === real
          ? fromDisk(file) + "\nexport const late = () => import('@/lib/supabase/server')\n"
          : fromDisk(file)
    expect(violationsFrom([PLANTED], read)).toEqual([
      real + ' imports @/lib/supabase/server — the Supabase client',
    ])
  })

  it('resolves a directory import to index.tsx and keeps walking', () => {
    const widget = 'src/lib/friction/widget/index.tsx'
    const sources: Record<string, string> = {
      [PLANTED]: "import { Widget } from './widget'\n",
      [widget]: "import { createClient } from '@/lib/supabase/client'\n",
    }
    expect(violationsFrom([PLANTED], file => sources[file] ?? '', file => file === widget)).toEqual([
      widget + ' imports @/lib/supabase/client — the Supabase client',
    ])
  })

  it('accepts a clean source, so the planted cases are not passing by rejecting everything', () => {
    expect(scan("import type { Pose } from '@/lib/pose-types'\nexport const n = 1\n")).toEqual([])
  })
})
