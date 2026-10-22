// Decision #3 / FR-024 / T034: the streak has no repair, restore, or undo path. This is a
// test of an absence — it greps the shipped sources and migrations and fails if one appears.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..', '..')
const SCAN = ['src', 'supabase/migrations']

// Streak-tied repair vocabulary: identifiers (camel/snake/kebab) and user-facing phrases.
export const FORBIDDEN = [
  /(repair|restore|undo|recover|fix|reset|rescue|revive)[-_ ]?((my|your|the|a)[-_ ]?)?streak/i,
  /streak[-_ ]?(repair|restore|undo|recover|fix|rescue|revive)/i,
]

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue
      walk(p, out)
    } else if (/\.(ts|tsx|js|jsx|sql|json|md)$/.test(name)) out.push(p)
  }
  return out
}

export function findRepairAffordances(
  files: { path: string; text: string }[],
): { path: string; line: number; text: string }[] {
  const hits: { path: string; line: number; text: string }[] = []
  for (const f of files) {
    f.text.split('\n').forEach((text, i) => {
      if (FORBIDDEN.some((re) => re.test(text))) hits.push({ path: f.path, line: i + 1, text: text.trim() })
    })
  }
  return hits
}

describe('no streak repair / restore / undo affordance (FR-024)', () => {
  it('finds none in src/ or supabase/migrations/', () => {
    const self = relative(ROOT, __filename)
    const files = SCAN.flatMap((d) => walk(join(ROOT, d)))
      .map((p) => ({ path: relative(ROOT, p), text: readFileSync(p, 'utf8') }))
      // This file names the forbidden terms in order to detect them.
      .filter((f) => f.path !== self)
    expect(files.length).toBeGreaterThan(0)
    expect(findRepairAffordances(files)).toEqual([])
  })

  it('would catch a restoreStreak identifier or a repair-streak RPC', () => {
    const planted = [
      { path: 'a.ts', text: 'export function restoreStreak() {}' },
      { path: 'b.sql', text: 'create function app_repair_streak()' },
      { path: 'c.tsx', text: '<button>Restore your streak</button>' },
      { path: 'd.ts', text: 'const undoStreak = 1' },
    ]
    expect(findRepairAffordances(planted)).toHaveLength(4)
  })

  it('does not flag unrelated mentions', () => {
    expect(findRepairAffordances([{ path: 'e.ts', text: 'computeStreak(checkins)' }])).toEqual([])
  })
})
