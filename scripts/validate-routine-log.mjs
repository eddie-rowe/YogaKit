#!/usr/bin/env node
// Validates docs/planning/routine-log.md against the format its own header declares
// and against the guardrail #48 added: no routine may be credited with a run on a date
// it has no first-party artifact for. See docs/planning/routines.md "Shared
// guardrails" and specs/007-autonomous-operations/spec.md FR-030/FR-035.
//
// This is the mechanical half of the #48 fix. It cannot catch a false attribution
// buried in a *different* routine's free-text prose (that is what actually happened on
// 2026-09-21/22 — /autoretro's own note credited /autodev in a sentence, not in a
// routine-log line of its own) — that half stays a spec-discipline matter. What this
// script does catch: a line that structurally claims routine X ran on date Y with no
// artifact X's own spec says it produces for Y.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validateRoutineLog } from './lib/routine-log.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..')
const logPath = path.join(repoRoot, 'docs/planning/routine-log.md')

function reflectionsFor(date) {
  const dir = path.join(repoRoot, 'docs/planning/retro')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(f => f.startsWith(`${date}-reflection-`))
    .map(f => `docs/planning/retro/${f}`)
}

if (!fs.existsSync(logPath)) {
  console.error(`❌ ${logPath} does not exist.`)
  process.exit(1)
}

const { errors, warnings, lineCount } = validateRoutineLog({
  text: fs.readFileSync(logPath, 'utf8'),
  exists: p => fs.existsSync(path.join(repoRoot, p)),
  reflectionsFor,
})

for (const w of warnings) console.warn(w)
for (const e of errors) console.error(e)

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s) in docs/planning/routine-log.md.`)
  process.exit(1)
} else {
  console.log(`✅ routine-log.md: all ${lineCount} dated line(s) valid.`)
}
