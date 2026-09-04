import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

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

function importsOf(source: string): string[] {
  const specifiers: string[] = []
  const re = /(?:from|import)\s*['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) specifiers.push(match[1])
  return specifiers
}

/** Resolve a specifier to a repo-relative file, or null if it is not first-party code. */
function resolveLocal(specifier: string, fromFile: string): string | null {
  let base: string
  if (specifier.startsWith('@/')) base = path.join('src', specifier.slice(2))
  else if (specifier.startsWith('.')) base = path.join(path.dirname(fromFile), specifier)
  else return null

  const candidates = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')]
  for (const candidate of candidates) {
    const abs = path.join(repoRoot, candidate)
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return candidate
  }
  return null
}

describe('engine isolation (RULE-H6)', () => {
  it('reaches no server, database, or network from the friction engine or validator-lite', () => {
    const queue = ROOTS.flatMap(listFiles)
    // A refactor that moves or renames these directories must not turn this into a test
    // that passes by having nothing to check.
    expect(queue.length).toBeGreaterThan(0)

    const seen = new Set(queue)
    const violations: string[] = []

    while (queue.length > 0) {
      const file = queue.shift() as string
      const source = fs.readFileSync(path.join(repoRoot, file), 'utf8')

      if (FETCH.test(source)) violations.push(file + ' calls fetch()')

      for (const specifier of importsOf(source)) {
        const forbidden = FORBIDDEN.find(rule => rule.pattern.test(specifier))
        if (forbidden) violations.push(file + ' imports ' + specifier + ' — ' + forbidden.why)

        const resolved = resolveLocal(specifier, file)
        if (resolved && !seen.has(resolved)) {
          seen.add(resolved)
          queue.push(resolved)
        }
      }
    }

    expect(violations).toEqual([])
  })
})
