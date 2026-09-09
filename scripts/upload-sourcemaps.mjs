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
 *
 * And when the key *is* present, this script still never fails the build: it exits 0
 * whether the upload worked or not. On Vercel `npm run build` is the deploy, so the
 * cost of aborting here is not degraded telemetry, it is the product not shipping.
 * The maps are deleted either way — see the note above that deletion.
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  shouldUpload,
  buildUploadArgs,
  mapFilesToDelete,
  releaseVersion,
  uploadEnv,
  siteMismatchWarning,
} from './lib/sourcemaps.mjs'

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

// Every failure from here on is a warning, never a non-zero exit. This step is
// optional telemetry plumbing running inside `npm run build`, which on Vercel *is* the
// deploy: a throw here does not degrade observability, it stops the product shipping.
// That is exactly what happened — a missing `DATADOG_API_KEY` alias failed two
// production deploys in a row while both builds themselves were completely fine (see
// FRICTION.md). `ci.yml` already made this call for the JUnit upload with
// `continue-on-error: true`; this is the same call, in the one place it costs a deploy.
const mismatch = siteMismatchWarning(process.env)
if (mismatch) console.warn(`[sourcemaps] ${mismatch}`)

let uploaded = false
try {
  const args = buildUploadArgs({
    buildDir,
    service: process.env.NEXT_PUBLIC_DD_SERVICE ?? 'yogakit',
    releaseVersion: releaseVersion(process.env),
    minifiedPathPrefix: '/_next/static',
  })

  console.log(`[sourcemaps] npx @datadog/datadog-ci ${args.join(' ')}`)
  execFileSync('npx', ['@datadog/datadog-ci', ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, ...uploadEnv(process.env) },
  })
  uploaded = true
} catch (err) {
  console.warn(`[sourcemaps] upload failed, continuing the build: ${err.message}`)
  console.warn('[sourcemaps] RUM error stacks for this release will stay minified.')
}

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

// Deleted whether or not the upload succeeded. The two failure modes are not
// symmetric: an unresolved stack trace in Datadog is degraded telemetry, while a map
// left in `.next/static` is readable by anyone who requests it, which the header of
// this file rules out. So on a failed upload we accept the worse telemetry rather than
// the disclosure — and say which of the two happened.
const mapFiles = mapFilesToDelete(walk(buildDir))
for (const file of mapFiles) fs.unlinkSync(file)
console.log(
  uploaded
    ? `[sourcemaps] uploaded and removed ${mapFiles.length} map file(s) from the build output`
    : `[sourcemaps] upload failed; removed ${mapFiles.length} map file(s) anyway so none ship publicly`
)
