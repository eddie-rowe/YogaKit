/**
 * Unit tests for the guidance-corpus validator (005 US6, T059/T060, FR-036..FR-038).
 *
 * The corpus is injected as `{ file, text }` pairs, so each case is a string — no temp
 * files. The last case runs the validator over the real `data/guidance/` as a regression.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { validateGuidance } from '../../../scripts/lib/guidance.mjs'

const entry = (file: string, front: string) => ({ file, text: `---\n${front}\n---\nbody\n` })

describe('validateGuidance', () => {
  it('passes an empty corpus (the tone contract is not signed off)', () => {
    expect(validateGuidance([])).toEqual({ errors: [], count: 0 })
  })

  it('passes well-formed entries with distinct priorities', () => {
    const r = validateGuidance([
      entry('a.md', 'trigger: first-checkin\npriority: 1'),
      entry('b.md', 'trigger: lapse-return\npriority: 2'),
    ])
    expect(r.errors).toEqual([])
    expect(r.count).toBe(2)
  })

  it('fails a missing priority (FR-038)', () => {
    const r = validateGuidance([entry('a.md', 'trigger: first-checkin')])
    expect(r.errors.join('\n')).toMatch(/a\.md.*priority.*missing/i)
  })

  it('fails a priority that is not a non-negative integer', () => {
    const r = validateGuidance([entry('a.md', 'trigger: t\npriority: high')])
    expect(r.errors.join('\n')).toMatch(/a\.md.*priority.*integer/i)
  })

  it('fails a duplicate priority and names both files (FR-038)', () => {
    const r = validateGuidance([
      entry('a.md', 'trigger: one\npriority: 3'),
      entry('b.md', 'trigger: two\npriority: 3'),
    ])
    const out = r.errors.join('\n')
    expect(out).toMatch(/duplicate priority 3/i)
    expect(out).toContain('a.md')
    expect(out).toContain('b.md')
  })

  it('fails an entry with no trigger (FR-036)', () => {
    const r = validateGuidance([entry('a.md', 'priority: 1')])
    expect(r.errors.join('\n')).toMatch(/a\.md.*trigger.*missing/i)
  })

  it('fails an entry with an empty trigger value', () => {
    const r = validateGuidance([entry('a.md', 'trigger:\npriority: 1')])
    expect(r.errors.join('\n')).toMatch(/a\.md.*trigger.*missing/i)
  })

  it('fails an entry with two trigger keys (FR-036)', () => {
    const r = validateGuidance([entry('a.md', 'trigger: one\ntrigger: two\npriority: 1')])
    expect(r.errors.join('\n')).toMatch(/a\.md.*exactly one trigger/i)
  })

  it('fails a comma-separated trigger value', () => {
    const r = validateGuidance([entry('a.md', 'trigger: one, two\npriority: 1')])
    expect(r.errors.join('\n')).toMatch(/a\.md.*exactly one trigger/i)
  })

  it('fails a list-valued trigger', () => {
    const r = validateGuidance([entry('a.md', 'trigger:\n  - one\n  - two\npriority: 1')])
    expect(r.errors.join('\n')).toMatch(/a\.md.*exactly one trigger/i)
  })

  it('fails a plural `triggers` key', () => {
    const r = validateGuidance([entry('a.md', 'triggers: one\npriority: 1')])
    expect(r.errors.join('\n')).toMatch(/a\.md.*exactly one trigger/i)
  })

  it('fails a trigger name that is not a kebab-case identifier', () => {
    const r = validateGuidance([entry('a.md', 'trigger: First Checkin\npriority: 1')])
    expect(r.errors.join('\n')).toMatch(/a\.md.*kebab-case/i)
  })

  it('fails a file with no frontmatter block', () => {
    const r = validateGuidance([{ file: 'a.md', text: 'just prose\n' }])
    expect(r.errors.join('\n')).toMatch(/a\.md.*frontmatter/i)
  })

  it('fails an unterminated frontmatter block', () => {
    const r = validateGuidance([{ file: 'a.md', text: '---\ntrigger: t\npriority: 1\n' }])
    expect(r.errors.join('\n')).toMatch(/a\.md.*frontmatter/i)
  })

  it('ignores comments, blank lines and unrelated keys', () => {
    const r = validateGuidance([entry('a.md', '# note\n\ntitle: Hello\ntrigger: t\npriority: 0')])
    expect(r.errors).toEqual([])
  })

  it('accepts quoted scalar values and CRLF line endings', () => {
    const r = validateGuidance([
      { file: 'a.md', text: '---\r\ntrigger: "first-checkin"\r\npriority: \'4\'\r\n---\r\nbody' },
    ])
    expect(r.errors).toEqual([])
  })
})

describe('the real data/guidance corpus', () => {
  it('passes the validator as committed', () => {
    const dir = path.join(__dirname, '../../../data/guidance')
    const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.md')) : []
    const entries = files.map(f => ({ file: f, text: readFileSync(path.join(dir, f), 'utf8') }))
    expect(validateGuidance(entries).errors).toEqual([])
  })
})
