import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { stripComments } from './import-scan'

// docs/krama-guardrails.md §1.3, made mechanical: "No testid may be a prefix of another."
//
// `[data-testid^="read-item-"]` matched `read-item-note-3` as well as `read-item-3`, and a
// walk counted 53 items where there were 34 (FRICTION.md, 2026-09-01). The rule was written
// down after that and kept by memory. This is a ratchet: the ids that already break it are
// pinned below, and the list can only shrink.
//
// Covered: literal ids, `data-testid="…"`, `data-testid='…'` and `data-testid={'…'}`.
// Not covered: template-literal ids (`settings-preset-item-${index}`), ids passed through a
// prop or a variable, and ids built anywhere other than on the attribute.

/** Container ids that predate this check. Each has children whose ids extend its own with
 *  `-…`. Renaming them touches shipped components, tests and the Datadog synthetic
 *  selectors, which is an owner call (#302, owner digest #38). Do not add to this list:
 *  give a new id a sibling name instead (§1.3). Remove an entry when its container is
 *  renamed; the stale-entry test below fails until you do. */
const KNOWN_CONTAINER_PREFIXES: string[] = [
  'account-avatar',
  'account-menu',
  'onboarding-claim-flows',
  'poses-overlay',
  'sadhana-dashboard-row',
  'sadhana-guidance',
  'sadhana-milestone',
  'sadhana-return',
  'sadhana-return-offer',
  'sadhana-sharing',
  'sadhana-streak',
  'sadhana-undo-toast',
]

const repoRoot = path.resolve(__dirname, '../../..')

function listFiles(dir: string): string[] {
  const abs = path.join(repoRoot, dir)
  if (!fs.existsSync(abs)) return []
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(entry => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return listFiles(rel)
    return /\.(?:tsx?|jsx?|mjs)$/.test(entry.name) ? [rel] : []
  })
}

const LITERAL_TESTID = /\bdata-testid=(?:"([^"]+)"|'([^']+)'|\{\s*(?:"([^"]+)"|'([^']+)')\s*\})/g

/** Every literal testid in `sources`, mapped to the files that carry it. */
function collectTestids(sources: Record<string, string>): Map<string, string[]> {
  const ids = new Map<string, string[]>()
  for (const [file, text] of Object.entries(sources)) {
    for (const m of stripComments(text).matchAll(LITERAL_TESTID)) {
      const id = m[1] ?? m[2] ?? m[3] ?? m[4]
      const files = ids.get(id) ?? []
      if (!files.includes(file)) files.push(file)
      ids.set(id, files)
    }
  }
  return ids
}

/** Check the rule. Returns one message per problem: a pair that breaks the rule and is
 *  not pinned, or a pinned id that no longer has a longer sibling. */
function prefixProblems(ids: Map<string, string[]>, known: string[]): string[] {
  const where = (id: string) => '`' + id + '` (' + (ids.get(id) ?? []).join(', ') + ')'
  const all = [...ids.keys()].sort()
  const problems: string[] = []
  const hasSibling = new Set<string>()

  for (const short of all) {
    for (const long of all) {
      if (!long.startsWith(short + '-')) continue
      hasSibling.add(short)
      if (known.includes(short)) continue
      problems.push(
        where(short) + ' is a prefix of ' + where(long) + '. Give the longer id a sibling name' +
          ' (docs/krama-guardrails.md §1.3, "No testid may be a prefix of another").',
      )
    }
  }
  for (const id of known) {
    if (hasSibling.has(id)) continue
    problems.push(
      '`' + id + '` is pinned in KNOWN_CONTAINER_PREFIXES but no longer has a longer sibling.' +
        ' Remove it from the list (docs/krama-guardrails.md §1.3).',
    )
  }
  return problems
}

describe('testid prefix rule (guardrails §1.3)', () => {
  const sources = Object.fromEntries(
    listFiles('src').map(file => [file, fs.readFileSync(path.join(repoRoot, file), 'utf8')]),
  )
  const ids = collectTestids(sources)

  it('finds literal testids to check, so it cannot pass by reading nothing', () => {
    expect(ids.size).toBeGreaterThan(100)
  })

  it('no literal testid is a prefix of another, beyond the pinned containers', () => {
    expect(prefixProblems(ids, KNOWN_CONTAINER_PREFIXES)).toEqual([])
  })

  it('pins no more than the twelve containers that predate the check', () => {
    // Twelve on 2026-11-15. Lower this number when an entry is removed; never raise it.
    expect(KNOWN_CONTAINER_PREFIXES.length).toBeLessThanOrEqual(12)
    expect([...KNOWN_CONTAINER_PREFIXES].sort()).toEqual(KNOWN_CONTAINER_PREFIXES)
    expect(new Set(KNOWN_CONTAINER_PREFIXES).size).toBe(KNOWN_CONTAINER_PREFIXES.length)
  })
})

// The check, turned on itself, against sources it must reject and accept.
describe('testid prefix check catches what it claims to (guardrails §1.3)', () => {
  const check = (sources: Record<string, string>, known: string[] = []) =>
    prefixProblems(collectTestids(sources), known)

  it('reports a new prefix pair, naming both ids, both files and the rule', () => {
    const problems = check({
      'src/a.tsx': '<ul data-testid="foo"></ul>',
      'src/b.tsx': '<li data-testid="foo-bar"></li>',
    })
    expect(problems).toEqual([
      '`foo` (src/a.tsx) is a prefix of `foo-bar` (src/b.tsx). Give the longer id a sibling name' +
        ' (docs/krama-guardrails.md §1.3, "No testid may be a prefix of another").',
    ])
  })

  it('sees the single-quoted and braced literal forms', () => {
    const problems = check({
      'src/a.tsx': "<ul data-testid='foo'><li data-testid={'foo-bar'} /><li data-testid={\"foo-baz\"} /></ul>",
    })
    expect(problems).toHaveLength(2)
  })

  it('lists every file that carries an id', () => {
    const problems = check({
      'src/a.tsx': '<ul data-testid="foo"></ul>',
      'src/b.tsx': '<ul data-testid="foo"><li data-testid="foo-bar"></li></ul>',
    })
    expect(problems[0]).toContain('`foo` (src/a.tsx, src/b.tsx)')
  })

  it('accepts a pinned container, and one pinned id does not excuse another', () => {
    const sources = {
      'src/a.tsx': '<ul data-testid="foo"><li data-testid="foo-bar" /></ul>',
      'src/b.tsx': '<ul data-testid="baz"><li data-testid="baz-qux" /></ul>',
    }
    expect(check(sources, ['foo', 'baz'])).toEqual([])
    expect(check(sources, ['foo'])).toHaveLength(1)
  })

  it('reports a pinned id whose longer sibling is gone, so the list cannot go stale', () => {
    expect(check({ 'src/a.tsx': '<ul data-testid="foo"></ul>' }, ['foo'])).toEqual([
      '`foo` is pinned in KNOWN_CONTAINER_PREFIXES but no longer has a longer sibling.' +
        ' Remove it from the list (docs/krama-guardrails.md §1.3).',
    ])
    expect(check({}, ['foo'])).toHaveLength(1)
  })

  it('does not treat a shared stem as a prefix: the next character must be a hyphen', () => {
    expect(check({ 'src/a.tsx': '<a data-testid="read-item" /><a data-testid="read-items" />' })).toEqual([])
    expect(check({ 'src/a.tsx': '<a data-testid="nav-flows" /><a data-testid="nav-poses" />' })).toEqual([])
  })

  it('ignores a testid in a comment and a template-literal id', () => {
    const source = [
      '// was <ul data-testid="foo">',
      '/* and <li data-testid="foo-bar"> */',
      '<li data-testid={`foo-${index}`} />',
      '<li data-testid="foo-baz" />',
    ].join('\n')
    expect(check({ 'src/a.tsx': source })).toEqual([])
  })
})
