#!/usr/bin/env node
/**
 * Telemetry content-free check: the I/O half (008 US4, FR-021/SC-007).
 *
 * Walks `src/` for telemetry call sites (logger.*, datadogRum.*) and `datadog/` for
 * manifests, hands each to the pure module, prints the report, exits non-zero on any
 * violation. All decidable logic lives in `scripts/lib/telemetry-check.mjs`.
 *
 * Usage:
 *   node scripts/check-telemetry-content-free.mjs                # scan src/ + datadog/
 *   node scripts/check-telemetry-content-free.mjs --dir <path>    # scan one directory
 *
 * `--dir` exists for the same reason `copy-lint.mjs --dir` does: SC-007 requires
 * proving the gate can actually fail, via a seeded violation outside `src/`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  SCAN_DIRS,
  SCAN_EXTENSIONS,
  EXCLUDED_PATTERNS,
  checkSource,
  checkManifestObject,
  formatReport,
} from './lib/telemetry-check.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..')

const dirFlag = process.argv.indexOf('--dir')
const explicitDir = dirFlag !== -1 && process.argv[dirFlag + 1] ? path.resolve(process.argv[dirFlag + 1]) : null

const sourceTargets = explicitDir ? [explicitDir] : SCAN_DIRS.map((d) => path.join(repoRoot, d))
const manifestTargets = explicitDir ? [explicitDir] : [path.join(repoRoot, 'datadog')]

function walk(dir, extensions) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(full, extensions))
      continue
    }
    if (!extensions.includes(path.extname(entry.name))) continue
    const rel = path.relative(repoRoot, full)
    if (EXCLUDED_PATTERNS.some((p) => p.test(rel))) continue
    out.push(full)
  }
  return out
}

const sourceFiles = sourceTargets.flatMap((d) => walk(d, SCAN_EXTENSIONS))
const manifestFiles = manifestTargets.flatMap((d) => walk(d, ['.json']))

const violations = []
let callsScanned = 0
for (const file of sourceFiles) {
  const rel = path.relative(repoRoot, file)
  const result = checkSource(fs.readFileSync(file, 'utf8'), rel.startsWith('..') ? file : rel)
  violations.push(...result.violations)
  callsScanned += result.callsScanned
}

const manifestViolations = []
for (const file of manifestFiles) {
  const rel = path.relative(repoRoot, file)
  const relative = rel.startsWith('..') ? file : rel
  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    continue // not this check's job to validate JSON shape — datadog:validate does that
  }
  for (const v of checkManifestObject(parsed)) {
    manifestViolations.push({ file: relative, ...v })
  }
}

console.log(
  formatReport({
    violations,
    manifestViolations,
    filesScanned: sourceFiles.length + manifestFiles.length,
    callsScanned,
  }),
)

if (violations.length > 0 || manifestViolations.length > 0) process.exit(1)
