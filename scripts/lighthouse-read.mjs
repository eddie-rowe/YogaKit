#!/usr/bin/env node
/**
 * RULE-L6 gives the read view a number — Lighthouse mobile performance >= 90 — and
 * until now nothing in the repo measured it, so "the established performance budget"
 * named nothing. This runs it.
 *
 * Why medians of several runs rather than one: single-run Lighthouse performance
 * varies by roughly +/-5 points on the same machine and the same build, which is wider
 * than most regressions worth catching. One before/after pair cannot tell a regression
 * from noise, so this takes the median of N (default 5).
 *
 * What it does NOT prove:
 *   - It measures `next start` on localhost, where TTFB is near zero. The score
 *     flatters production, so treat 90 as a floor that a local run must clear
 *     comfortably, not as a production measurement.
 *   - It measures the built-in-flow path, which `page.tsx` renders on the server.
 *     A teacher's own flow goes through `ReadViewClient` -> IndexedDB, which has a
 *     later LCP and cannot be driven from the Lighthouse CLI without seeding storage.
 *     That path is checked by hand.
 *
 * Usage:
 *   npm run build && npm start &
 *   node scripts/lighthouse-read.mjs [url] [runs]
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_URL = 'http://localhost:3000/read/b79a753d-fc7c-42e7-8abc-10181fabdb12'
const BUDGET = 90

const url = process.argv[2] ?? DEFAULT_URL
const runs = Number(process.argv[3] ?? 5)

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const workdir = mkdtempSync(join(tmpdir(), 'krama-lh-'))
const scores = []
const lcps = []

try {
  for (let run = 1; run <= runs; run++) {
    const out = join(workdir, `run-${run}.json`)
    execFileSync(
      'npx',
      [
        '--yes',
        'lighthouse',
        url,
        '--only-categories=performance',
        '--form-factor=mobile',
        '--screenEmulation.mobile',
        '--output=json',
        `--output-path=${out}`,
        '--quiet',
        '--chrome-flags=--headless=new --no-sandbox',
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] }
    )
    const report = JSON.parse(readFileSync(out, 'utf8'))
    const score = Math.round(report.categories.performance.score * 100)
    const lcp = report.audits['largest-contentful-paint'].numericValue
    scores.push(score)
    lcps.push(lcp)
    console.log(`run ${run}: performance ${score}, LCP ${Math.round(lcp)}ms`)
  }
} finally {
  rmSync(workdir, { recursive: true, force: true })
}

const medianScore = median(scores)
const medianLcp = Math.round(median(lcps))
console.log(`\n${url}`)
console.log(`median performance over ${runs} runs: ${medianScore}  (budget ${BUDGET})`)
console.log(`median LCP: ${medianLcp}ms`)
console.log(`all runs: ${scores.join(', ')}`)

if (medianScore < BUDGET) {
  console.error(`\nBelow the RULE-L6 floor of ${BUDGET}.`)
  process.exit(1)
}
