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
      // A relative path names the same module as its alias. `../storage/db` from the
      // engine is `@/lib/storage/db`, and the rule is about the module, not the spelling.
      const aliased = resolved?.startsWith('src/') ? '@/' + resolved.slice(4) : null
      const viaPath = aliased && aliased !== specifier && FORBIDDEN.find(rule => rule.pattern.test(aliased))
      if (viaPath) {
        violations.push(file + ' imports ' + specifier + ' — ' + viaPath.why)
        continue
      }
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
    // A refactor that moves or renames either directory must not turn this into a test
    // that passes by having nothing to check, so each root is counted on its own.
    for (const root of ROOTS) expect(listFiles(root).length, root).toBeGreaterThan(0)
    const entries = ROOTS.flatMap(listFiles)

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

  // The next four came out of #298's review. Each hid a real import from the first
  // version of the shared scanner.
  it('is not fooled by a comment marker inside a string literal', () => {
    expect(scan("const A = 'image/*'\nimport x from '@/lib/supabase/client'\n/** doc */\n")).toEqual([
      PLANTED + ' imports @/lib/supabase/client — the Supabase client',
    ])
    expect(scan("const s = cond ? '//cdn' : require('@supabase/supabase-js')\n")).toEqual([
      PLANTED + ' imports @supabase/supabase-js — a Supabase SDK',
    ])
  })

  it('reports a template-literal specifier and a dynamic import with options', () => {
    const source = [
      'const a = import(`@/lib/supabase/client`)',
      "const b = import('@/lib/storage/outbox', { with: { type: 'json' } })",
    ].join('\n')
    expect(scan(source)).toEqual([
      PLANTED + ' imports @/lib/supabase/client — the Supabase client',
      PLANTED + ' imports @/lib/storage/outbox — persistence (IndexedDB, the outbox, sync)',
    ])
  })

  it('reports an import written with no whitespace', () => {
    expect(scan("import{a}from'@/lib/supabase/client'\nexport*from'@supabase/ssr'\n")).toEqual([
      PLANTED + ' imports @/lib/supabase/client — the Supabase client',
      PLANTED + ' imports @supabase/ssr — a Supabase SDK',
    ])
  })

  it('reports a forbidden module reached by a relative path', () => {
    const db = 'src/lib/storage/db.ts'
    expect(
      violationsFrom([PLANTED], file => (file === PLANTED ? "import { getDb } from '../storage/db'\n" : ''), file => file === db),
    ).toEqual([PLANTED + ' imports ../storage/db — persistence (IndexedDB, the outbox, sync)'])
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

  // #301: indirect network sinks, and source files that are not TypeScript. Every case
  // below except the string-literal one was watched failing against the #298 scanner
  // before the scanner changed. The string-literal case already reported under #298, so
  // it was seeded the other way: sink matching was pointed at literal-stripped text and
  // the case went red.
  it.each([
    ['globalThis.fetch(', "export const get = () => globalThis.fetch('/api/x')\n", 'globalThis.fetch'],
    ['window.fetch(', "export const get = () => window.fetch('/api/x')\n", 'window.fetch'],
    ['self.fetch(', "export const get = () => self.fetch('/api/x')\n", 'self.fetch'],
    ['optional-chained fetch', "export const get = () => globalThis?.fetch('/api/x')\n", 'globalThis.fetch'],
    ['new XMLHttpRequest', 'const xhr = new XMLHttpRequest()\n', 'XMLHttpRequest'],
    ['new WebSocket', "const ws = new WebSocket('wss://x')\n", 'WebSocket'],
    ['new EventSource', "const es = new EventSource('/events')\n", 'EventSource'],
    ['sendBeacon(', "navigator.sendBeacon('/log', body)\n", 'sendBeacon'],
  ])('reports %s', (_name, source, sink) => {
    expect(scan(source)).toEqual([PLANTED + ' reaches the network through ' + sink])
  })

  it('reports each sink once per file, and still reports the imports after it', () => {
    const source = [
      "const a = new WebSocket('wss://a')",
      "const b = new WebSocket('wss://b')",
      "navigator.sendBeacon('/log')",
      "import '@supabase/ssr'",
    ].join('\n')
    expect(scan(source)).toEqual([
      PLANTED + ' reaches the network through WebSocket',
      PLANTED + ' reaches the network through sendBeacon',
      PLANTED + ' imports @supabase/ssr — a Supabase SDK',
    ])
  })

  it('does not report a sink that is only named in a comment', () => {
    const source = [
      '// never call fetch( here, and no new WebSocket( either',
      '/* globalThis.fetch(url) and navigator.sendBeacon(url) are out too;',
      '   so are new XMLHttpRequest() and new EventSource(url) */',
      'export const n = 1',
    ].join('\n')
    expect(scan(source)).toEqual([])
  })

  it('reports a sink spelled inside a string literal, because it cannot tell that from a call', () => {
    // Fail-closed by choice. The shared lexer keeps literals so that `'image/*'` stays a
    // string; the cost is that a sink name in a string reports. An engine file has no
    // reason to hold one, and a false report is cheap next to a missed call built from
    // a template (`${'fetch'}`-style indirection, or code handed to `new Function`).
    expect(scan("export const label = 'fetch('\n")).toEqual([PLANTED + ' calls fetch()'])
    expect(scan('export const hint = `open a WebSocket`\n')).toEqual([
      PLANTED + ' reaches the network through WebSocket',
    ])
  })

  it('is not fooled by a comment marker in a string ahead of a sink', () => {
    expect(scan("const A = 'image/*'\nconst ws = new WebSocket(A)\n/** doc */\n")).toEqual([
      PLANTED + ' reaches the network through WebSocket',
    ])
  })

  it.each(['.js', '.jsx', '.mjs'])('resolves an import to a %s file and scans it', ext => {
    const helper = 'src/lib/friction/helper' + ext
    const sources: Record<string, string> = {
      [PLANTED]: "import { help } from './helper'\n",
      [helper]: "export const help = () => fetch('/api/x')\n",
    }
    expect(violationsFrom([PLANTED], file => sources[file] ?? '', file => file === helper)).toEqual([
      helper + ' calls fetch()',
    ])
  })

  it.each(['.js', '.jsx', '.mjs'])('resolves a directory import to index%s', ext => {
    const index = 'src/lib/friction/widget/index' + ext
    const sources: Record<string, string> = {
      [PLANTED]: "import { Widget } from './widget'\n",
      [index]: "import { createClient } from '@/lib/supabase/client'\n",
    }
    expect(violationsFrom([PLANTED], file => sources[file] ?? '', file => file === index)).toEqual([
      index + ' imports @/lib/supabase/client — the Supabase client',
    ])
  })

  it.each(['.ts', '.tsx', '.js', '.jsx', '.mjs'])('lists a %s file as an entry point', ext => {
    expect(isSource('engine' + ext)).toBe(true)
  })

  it('does not list data or docs as entry points', () => {
    for (const name of ['weights.json', 'README.md', 'engine.ts.snap', 'tsx']) expect(isSource(name), name).toBe(false)
  })

  it('accepts a clean source, so the planted cases are not passing by rejecting everything', () => {
    expect(scan("import type { Pose } from '@/lib/pose-types'\nexport const n = 1\n")).toEqual([])
  })
})
