#!/usr/bin/env node
/**
 * Copy-lint: the I/O half (009 US1, FR-008/FR-013/FR-019).
 *
 * Walks the user-facing directories, hands each file to the pure module, prints the
 * report, exits non-zero on any violation. Everything decidable lives in
 * `scripts/lib/copy-lint.mjs` and is unit-tested there; this file only finds files and
 * writes to stdout.
 *
 * Usage:
 *   node scripts/copy-lint.mjs                 # scan the repo's user-facing dirs
 *   node scripts/copy-lint.mjs --dir <path>    # scan one directory (used by the SC test)
 *
 * The `--dir` flag exists for the same reason `validate-poses.mjs --dir` does: proving
 * the gate actually fails needs a seeded violation somewhere that is not `src/`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  SCAN_DIRS,
  SCAN_EXTENSIONS,
  EXCLUDED_PATTERNS,
  compileRules,
  lintSource,
  formatReport,
} from './lib/copy-lint.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..')

const dirFlag = process.argv.indexOf('--dir')
const targets = dirFlag !== -1 && process.argv[dirFlag + 1]
  ? [path.resolve(process.argv[dirFlag + 1])]
  : SCAN_DIRS.map((d) => path.join(repoRoot, d))

const ruleSet = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'data/voice/voice-rules.json'), 'utf8'),
)
const rules = compileRules(ruleSet)

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(full))
      continue
    }
    if (!SCAN_EXTENSIONS.includes(path.extname(entry.name))) continue
    const rel = path.relative(repoRoot, full)
    if (EXCLUDED_PATTERNS.some((p) => p.test(rel))) continue
    out.push(full)
  }
  return out
}

const files = targets.flatMap(walk)
const violations = []
const suppressed = []
const malformed = []
let stringsScanned = 0

for (const file of files) {
  const relative = path.relative(repoRoot, file)
  const rel = relative.startsWith('..') ? file : relative
  const result = lintSource(fs.readFileSync(file, 'utf8'), rel, rules)
  violations.push(...result.violations)
  suppressed.push(...result.suppressed)
  malformed.push(...result.malformed)
  stringsScanned += result.scanned
}

console.log(
  formatReport({
    violations,
    filesScanned: files.length,
    stringsScanned,
    suppressed,
    malformed,
    ruleCount: rules.length,
  }),
)

if (violations.length > 0 || malformed.length > 0) process.exit(1)
