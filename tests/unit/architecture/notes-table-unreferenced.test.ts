import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// SC-009, invariant I1/I2's client-side half. The structural claim in the migration
// (no org column on the notes table, no policy on it mentioning one) protects the data.
// This protects the claim from the other direction: no application code may query that
// table at all.
//
// It does not need to. A note travels inside app_save_flow's payload, written by the
// author's own session, and every read of a flow the client performs is either from
// IndexedDB or through the share path in src/lib/storage/sharing.ts. So a query naming
// the table is either a mistake or an attempt to widen the author boundary in
// application code — the exact thing Principle VIII puts at the table layer instead.
//
// If a later feature genuinely needs to read a teacher's own notes directly, this test
// fails and the fix is to add that file here, deliberately, in a diff a reviewer sees.

const NOTES_TABLE = ['flow', 'item', 'notes'].join('_')

// Generated from the schema, so it names every table by construction. It is a type
// declaration, not a query.
const ALLOWED = new Set(['src/types/database.ts'])

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full, out)
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

describe('the author-only notes table', () => {
  it('is not referenced by any application code', () => {
    const offenders = walk('src')
      .map(f => relative('.', f))
      .filter(f => !ALLOWED.has(f))
      .filter(f => readFileSync(f, 'utf8').includes(NOTES_TABLE))

    expect(offenders).toEqual([])
  })

  it('is scanning something — the walk is not silently empty', () => {
    const files = walk('src')
    expect(files.length).toBeGreaterThan(50)
    expect(files.some(f => f.endsWith('sharing.ts'))).toBe(true)
  })
})
