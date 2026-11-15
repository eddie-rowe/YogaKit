import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { candidatesFor, isSource, specifiersOf, stripComments } from './import-scan'

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

/** Ways to reach a network without importing anything. Crude on purpose: the rule is that
 *  these modules do not talk to a network, and there is no legitimate use here that would
 *  trip it. Matched against comment-stripped source (the shared lexer, never a regex), so
 *  a sink named in a comment is not reported and one named in a string literal is. That
 *  last part is deliberate: text cannot tell `'fetch('` from a call assembled out of
 *  strings, and the guard fails closed.
 *
 *  Every sink matches on the bare name, not on a call: `fetch` anywhere, not `fetch(`, and
 *  `WebSocket`, not `new WebSocket(`. So `const f = fetch`, `fetch?.(…)`,
 *  `(globalThis as any).fetch(…)`, `globalThis['fetch']`, `const W = WebSocket` and
 *  `const { sendBeacon } = navigator` all report. The cost is that a method or property
 *  that is merely called `fetch` reports too; rename it.
 *
 *  Not seen, by construction: a name assembled at run time (`globalThis['fe' + 'tch']`). */
const SINKS: { pattern: RegExp; report: (match: RegExpMatchArray) => string }[] = [
  {
    // The optional group only improves the message when the global object is spelled out.
    pattern: /(?:\b(globalThis|window|self)\s*[!?]?\.\s*)?\bfetch\b/,
    report: match => (match[1] ? 'reaches the network through ' + match[1] + '.fetch' : 'calls fetch()'),
  },
  ...['XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon'].map(name => ({
    pattern: new RegExp('\\b' + name + '\\b'),
    report: () => 'reaches the network through ' + name,
  })),
]

const repoRoot = path.resolve(__dirname, '../../..')

type Entry = { name: string; isDirectory: () => boolean }

const dirFromDisk = (dir: string): Entry[] => {
  const abs = path.join(repoRoot, dir)
  return fs.existsSync(abs) ? fs.readdirSync(abs, { withFileTypes: true }) : []
}

/** Every source file under `dir`. `readdir` defaults to the real tree; the planted cases
 *  swap it for an in-memory listing. */
function listFiles(dir: string, readdir: (dir: string) => Entry[] = dirFromDisk): string[] {
  return readdir(dir).flatMap(entry => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return listFiles(rel, readdir)
    return isSource(entry.name) ? [rel] : []
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

  const candidates = candidatesFor(base)
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

    const code = stripComments(source)
    for (const sink of SINKS) {
      const match = code.match(sink.pattern)
      if (match) violations.push(file + ' ' + sink.report(match))
    }

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
    const entries = ROOTS.flatMap(root => listFiles(root))

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

  // #301: indirect network sinks, and source files that are not TypeScript. The sink,
  // comment and resolution cases were watched failing against the #298 scanner before it
  // changed. Two could not go red that way and were seeded on the new code instead: the
  // string-literal case (the `'fetch('` half already reported), by pointing sink matching
  // at literal-stripped text; and the listing case (`listFiles` had no seam), by cutting
  // `SOURCE_EXTS` back to `.ts`/`.tsx` and, separately, by putting `/\.tsx?$/` back in
  // `listFiles`.
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

  it('lists .ts, .tsx, .js, .jsx and .mjs files as entry points, nested ones too, and nothing else', () => {
    const file = (name: string) => ({ name, isDirectory: () => false })
    const tree: Record<string, { name: string; isDirectory: () => boolean }[]> = {
      'src/lib/friction': [
        file('a.ts'), file('b.tsx'), file('c.js'), file('d.jsx'), file('e.mjs'),
        file('weights.json'), file('README.md'), file('a.ts.snap'),
        { name: 'deep', isDirectory: () => true },
      ],
      'src/lib/friction/deep': [file('f.mjs'), file('notes.txt')],
    }
    expect(listFiles('src/lib/friction', dir => tree[dir] ?? [])).toEqual([
      'src/lib/friction/a.ts',
      'src/lib/friction/b.tsx',
      'src/lib/friction/c.js',
      'src/lib/friction/d.jsx',
      'src/lib/friction/e.mjs',
      'src/lib/friction/deep/f.mjs',
    ])
  })

  // From #304's review: forms of `fetch` that are not `fetch(` or `<global>.fetch(`.
  it.each([
    ['a cast on the global object', "(globalThis as any).fetch('/x')\n", 'calls fetch()'],
    ['a non-null assertion', "window!.fetch('/x')\n", 'reaches the network through window.fetch'],
    ['a bracket lookup', "globalThis['fetch']('/x')\n", 'calls fetch()'],
    ['a destructured alias', "const { fetch: f } = globalThis\nf('/x')\n", 'calls fetch()'],
    ['an optional call', "fetch?.('/x')\n", 'calls fetch()'],
    ['.call', "fetch.call(null, '/x')\n", 'calls fetch()'],
    ['a plain alias', "const f = fetch\nf('/x')\n", 'calls fetch()'],
  ])('reports fetch reached through %s', (_name, source, message) => {
    expect(scan(source)).toEqual([PLANTED + ' ' + message])
  })

  it('resolves a specifier with a trailing slash to the same index file', () => {
    const index = 'src/lib/friction/widget/index.ts'
    const sources: Record<string, string> = {
      [PLANTED]: "import './widget/'\nimport './widget'\n",
      [index]: "export const get = () => fetch('/api/x')\n",
    }
    expect(violationsFrom([PLANTED], file => sources[file] ?? '', file => file === index)).toEqual([
      index + ' calls fetch()',
    ])
  })

  it('accepts a clean source, so the planted cases are not passing by rejecting everything', () => {
    expect(scan("import type { Pose } from '@/lib/pose-types'\nexport const n = 1\n")).toEqual([])
  })
})
