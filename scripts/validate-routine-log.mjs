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

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..')
const logPath = path.join(repoRoot, 'docs/planning/routine-log.md')

// One entry per routine that self-reports a run in routine-log.md. `artifacts` returns
// candidate paths (repo-root-relative) for a given date; the line passes if at least
// one exists. Kept in sync with docs/planning/routines.md's File layout convention.
const ROUTINE_ARTIFACTS = {
  autoobs: date => [`docs/observation/autoobs/${date}.md`],
  autopm: date => [`docs/planning/autopm/${date}.md`],
  autoretro: date => [`docs/planning/retro/${date}.md`],
  // /autodev has never actually run (see #48) so there is no real example of its own
  // artifact yet. Its spec (autodev.md Step 5) declares the handoff file; Step 3
  // declares per-issue reflections. Either is acceptable first-party evidence.
  autodev: date => [
    `docs/planning/autopm/autodev-handoff-${date}.md`,
    ...globReflectionFiles(date),
  ],
}

function globReflectionFiles(date) {
  const dir = path.join(repoRoot, 'docs/planning/retro')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(f => f.startsWith(`${date}-reflection-`))
    .map(f => `docs/planning/retro/${f}`)
}

const ROUTINE_LINE = /^(\d{4}-\d{2}-\d{2})(?: \d{2}:\d{2})? \/(\w+) \[/
// A manual/interactive-session correction line — annotated as such, not a routine
// self-report, so it is exempt from the artifact check (there is no routine to have
// produced an artifact). See routine-log.md's 2026-09-22 manual-intake line.
const ANNOTATION_LINE = /^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})? \[/

if (!fs.existsSync(logPath)) {
  console.error(`❌ ${logPath} does not exist.`)
  process.exit(1)
}

const lines = fs
  .readFileSync(logPath, 'utf8')
  .split('\n')
  .map((text, i) => ({ text, num: i + 1 }))
  .filter(({ text }) => /^\d{4}-\d{2}-\d{2}/.test(text)) // only dated entries; skip prose/header

let errors = 0

for (const { text, num } of lines) {
  if (ANNOTATION_LINE.test(text)) continue

  const match = ROUTINE_LINE.exec(text)
  if (!match) {
    console.error(`❌ routine-log.md:${num}: does not match the documented run format or the annotation format:`)
    console.error(`   ${text}`)
    errors++
    continue
  }

  const [, date, routine] = match
  const candidates = ROUTINE_ARTIFACTS[routine]
  if (!candidates) {
    // Unknown routine name — not a violation of #48 specifically, but worth flagging so
    // a typo'd or renamed routine doesn't silently stop being checked.
    console.warn(`⚠️  routine-log.md:${num}: unrecognized routine "/${routine}" — add it to ROUTINE_ARTIFACTS or fix the name.`)
    continue
  }

  const paths = candidates(date)
  const found = paths.some(p => fs.existsSync(path.join(repoRoot, p)))
  if (!found) {
    console.error(
      `❌ routine-log.md:${num}: /${routine} claims a run on ${date} but none of its first-party artifacts exist:`
    )
    for (const p of paths) console.error(`   - ${p}`)
    console.error(`   This is the #48 guardrail — no routine may be credited with a run it has no evidence for.`)
    errors++
  }
}

if (errors > 0) {
  console.error(`\n${errors} error(s) in docs/planning/routine-log.md.`)
  process.exit(1)
} else {
  console.log(`✅ routine-log.md: all ${lines.length} dated line(s) valid.`)
}
