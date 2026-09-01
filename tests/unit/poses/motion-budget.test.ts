import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/** Guardrails §2 caps motion at 200ms and permits ease curves only. That has been a
 *  promise in a document; this makes it a measurement (SC-007). Cheap, and it fails on
 *  the next hand-written `transition: all 300ms cubic-bezier(...)` rather than at review. */
const DIRS = ['src/components/poses', 'src/app/poses']
const BUDGET_MS = 200
const BANNED = [/cubic-bezier/, /\bspring\b/, /\bbounce\b/]

function sourceFiles(dir: string): string[] {
  const abs = path.join(process.cwd(), dir)
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .flatMap(entry =>
      entry.isDirectory()
        ? sourceFiles(path.join(dir, entry.name))
        : /\.tsx?$/.test(entry.name)
          ? [path.join(dir, entry.name)]
          : []
    )
}

describe('pose-surface motion budget (FR-019, SC-007)', () => {
  const files = DIRS.flatMap(sourceFiles)

  it('finds the pose surfaces to measure', () => {
    // Guards against the scan silently covering nothing if the directories move.
    expect(files.length).toBeGreaterThan(5)
  })

  it('keeps every literal duration inside the budget', () => {
    const violations: string[] = []
    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
      source.split('\n').forEach((line, i) => {
        for (const match of line.matchAll(/(\d+)ms/g)) {
          if (Number(match[1]) > BUDGET_MS) violations.push(`${file}:${i + 1} — ${match[0]}`)
        }
      })
    }
    expect(violations).toEqual([])
  })

  it('uses no easing the token set does not sanction', () => {
    const violations: string[] = []
    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
      source.split('\n').forEach((line, i) => {
        for (const pattern of BANNED) {
          if (pattern.test(line)) violations.push(`${file}:${i + 1} — ${pattern.source}`)
        }
      })
    }
    expect(violations).toEqual([])
  })
})
