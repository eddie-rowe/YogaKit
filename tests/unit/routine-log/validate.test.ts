/**
 * Unit tests for the routine-log validator's pure module (007 T009, FR-030/FR-035).
 *
 * The filesystem is injected, so every case is a string plus a set of "existing" paths —
 * no temp files. The last cases run the validator over the real log as a regression check.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { validateRoutineLog } from '../../../scripts/lib/routine-log.mjs'

const run = (text: string | null, present: string[] = [], reflections: string[] = []) =>
  validateRoutineLog({
    text,
    exists: (p: string) => present.includes(p),
    reflectionsFor: () => reflections,
  })

describe('validateRoutineLog', () => {
  it('passes a valid line whose first-party artifact exists', () => {
    const r = run('2026-09-30 09:30 /autopm [OK] — ok', ['docs/planning/autopm/2026-09-30.md'])
    expect(r.errors).toEqual([])
    expect(r.lineCount).toBe(1)
  })

  it('accepts a line with no time component', () => {
    const r = run('2026-09-30 /autoobs [OK] — ok', ['docs/observation/autoobs/2026-09-30.md'])
    expect(r.errors).toEqual([])
  })

  it('fails a run claim with no first-party artifact (seeded violation)', () => {
    const r = run('2026-09-30 09:30 /autoretro [OK] — ok')
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]).toContain('routine-log.md:1')
    expect(r.errors[0]).toContain('/autoretro claims a run on 2026-09-30')
    expect(r.errors[0]).toContain('docs/planning/retro/2026-09-30.md')
  })

  it('accepts /autodev evidence via the handoff file', () => {
    const r = run('2026-09-30 09:00 /autodev [OK] — ok', ['docs/planning/autopm/autodev-handoff-2026-09-30.md'])
    expect(r.errors).toEqual([])
  })

  it('accepts /autodev evidence via a per-issue reflection', () => {
    const r = run('2026-09-30 09:00 /autodev [OK] — ok', ['docs/planning/retro/2026-09-30-reflection-110.md'], ['docs/planning/retro/2026-09-30-reflection-110.md'])
    expect(r.errors).toEqual([])
  })

  it('reports /autodev with neither handoff nor reflection, listing the handoff path', () => {
    const r = run('2026-09-30 09:00 /autodev [OK] — ok')
    expect(r.errors[0]).toContain('autodev-handoff-2026-09-30.md')
  })

  it('fails a malformed dated line', () => {
    const r = run('2026-09-30 autopm ran fine')
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]).toContain('does not match the documented run format')
    expect(r.errors[0]).toContain('2026-09-30 autopm ran fine')
  })

  it('exempts annotation lines from the artifact check', () => {
    expect(run('2026-09-22 [manual] intake correction').errors).toEqual([])
    expect(run('2026-09-22 10:15 [manual] intake correction').errors).toEqual([])
  })

  it('warns, without failing, on an unrecognized routine name', () => {
    const r = run('2026-09-30 /autofoo [OK] — ok')
    expect(r.errors).toEqual([])
    expect(r.warnings).toHaveLength(1)
    expect(r.warnings[0]).toContain('unrecognized routine "/autofoo"')
  })

  it('ignores prose and header lines that are not dated', () => {
    const r = run('# Routine log\n\nsome prose\n2026-09-30 /autoobs [OK] — ok', ['docs/observation/autoobs/2026-09-30.md'])
    expect(r.lineCount).toBe(1)
    expect(r.errors).toEqual([])
  })

  it('numbers errors by their line in the file', () => {
    const r = run('# header\n\n2026-09-30 /autopm [OK] — ok')
    expect(r.errors[0]).toContain('routine-log.md:3')
  })

  it('degrades on a missing log file as the script documents', () => {
    const r = run(null)
    expect(r.missing).toBe(true)
    expect(r.errors).toEqual([])
  })
})

describe('validateRoutineLog on the real log', () => {
  const root = path.join(__dirname, '../../..')
  const text = readFileSync(path.join(root, 'docs/planning/routine-log.md'), 'utf8')

  it('agrees with the repo state', () => {
    const r = validateRoutineLog({
      text,
      exists: (p: string) => existsSync(path.join(root, p)),
      reflectionsFor: () => [],
    })
    expect(r.errors.filter((e: string) => !e.includes('autodev'))).toEqual([])
    expect(r.lineCount).toBeGreaterThan(0)
  })
})
