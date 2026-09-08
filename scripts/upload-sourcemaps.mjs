#!/usr/bin/env node
/**
 * Source-map upload: the I/O half (008 US2, docs/OBSERVABILITY.md §6).
 *
 * Runs after `next build` (see package.json's `build` script). Uploads
 * `.next/static/**\/*.map` to Datadog via `datadog-ci`, then deletes the maps from the
 * build output — Datadog keeps them server-side so RUM error stacks resolve, but
 * nothing sits publicly readable at `/_next/static` in the deployed app.
 *
 * No-ops quietly (exit 0, nothing uploaded, nothing deleted) when `DD_API_KEY` is
 * absent, so a local `npm run build` or a fork PR without repo secrets still succeeds
 * normally — the same posture as every other optional Datadog integration in 008.
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { shouldUpload, buildUploadArgs, mapFilesToDelete } from './lib/sourcemaps.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..')
const buildDir = path.join(repoRoot, '.next', 'static')

const { shouldRun, reason } = shouldUpload(process.env)
if (!shouldRun) {
  console.log(`[sourcemaps] ${reason}`)
  process.exit(0)
}

if (!fs.existsSync(buildDir)) {
  console.log(`[sourcemaps] ${buildDir} does not exist — nothing to upload (did next build run?)`)
  process.exit(0)
}

const args = buildUploadArgs({
  buildDir,
  service: process.env.NEXT_PUBLIC_DD_SERVICE ?? 'yogakit',
  releaseVersion: process.env.NEXT_PUBLIC_DD_VERSION,
  minifiedPathPrefix: '/_next/static',
})

console.log(`[sourcemaps] npx @datadog/datadog-ci ${args.join(' ')}`)
execFileSync('npx', ['@datadog/datadog-ci', ...args], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
})

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(full))
    } else {
      out.push(full)
    }
  }
  return out
}

const mapFiles = mapFilesToDelete(walk(buildDir))
for (const file of mapFiles) fs.unlinkSync(file)
console.log(`[sourcemaps] uploaded and removed ${mapFiles.length} map file(s) from the build output`)
