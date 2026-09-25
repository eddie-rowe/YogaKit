#!/usr/bin/env node
/**
 * GitHub ruleset sync: the I/O half (#65).
 *
 * Reads `.github/rulesets/*.json`, validates them (blocking the whole run on any
 * failure), fetches the matching live rulesets via `gh api`, diffs, and prints a
 * plan. Nothing mutates unless `--apply` is passed, and per 008's "no auto-apply
 * from CI" this script is never invoked with `--apply` from a workflow — only a
 * deliberate local run. All decidable logic (manifest validation, diffing) lives in
 * `scripts/lib/github-rulesets.mjs` and is unit-tested there; this file only reads
 * files, shells out to `gh`, and prints.
 *
 * Usage:
 *   node scripts/github/sync-rulesets.mjs --validate   # validate only, no network
 *   node scripts/github/sync-rulesets.mjs               # diff against live
 *   node scripts/github/sync-rulesets.mjs --apply       # create/update to match — local only
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { validateManifest, planAction, formatResultLine } from '../lib/github-rulesets.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..', '..')
const rulesetsDir = path.join(repoRoot, '.github', 'rulesets')

function parseArgs(argv) {
  return {
    validateOnly: argv.includes('--validate'),
    apply: argv.includes('--apply'),
  }
}

function readManifests() {
  if (!fs.existsSync(rulesetsDir)) return []
  return fs
    .readdirSync(rulesetsDir)
    .filter((f) => f.endsWith('.json'))
    .map((filename) => ({
      filename,
      manifest: JSON.parse(fs.readFileSync(path.join(rulesetsDir, filename), 'utf8')),
    }))
}

function ghApi(args) {
  return JSON.parse(execFileSync('gh', ['api', ...args], { encoding: 'utf8' }))
}

function fetchLiveRulesetByName(name) {
  const rulesets = ghApi(['repos/eddie-rowe/YogaKit/rulesets'])
  const match = rulesets.find((r) => r.name === name)
  if (!match) return null
  // The list endpoint omits `conditions`/`rules`; fetch the full object.
  return ghApi([`repos/eddie-rowe/YogaKit/rulesets/${match.id}`])
}

function applyManifest(manifest, liveRuleset) {
  const tmpFile = path.join(repoRoot, `.github-ruleset-tmp-${manifest.name}.json`)
  fs.writeFileSync(tmpFile, JSON.stringify(manifest))
  try {
    const endpoint = liveRuleset
      ? `repos/eddie-rowe/YogaKit/rulesets/${liveRuleset.id}`
      : 'repos/eddie-rowe/YogaKit/rulesets'
    const method = liveRuleset ? 'PUT' : 'POST'
    execFileSync('gh', ['api', endpoint, '-X', method, '--input', tmpFile], { stdio: 'inherit' })
  } finally {
    fs.rmSync(tmpFile, { force: true })
  }
}

function main() {
  const { validateOnly, apply } = parseArgs(process.argv.slice(2))

  const manifests = readManifests()

  let anyInvalid = false
  for (const { filename, manifest } of manifests) {
    const { valid, errors } = validateManifest(filename, manifest)
    if (!valid) {
      anyInvalid = true
      console.error(`INVALID  ${filename}`)
      for (const err of errors) console.error(`  - ${err}`)
    }
  }
  if (anyInvalid) {
    console.error('\nOne or more manifests are invalid. Fixing them all, applying nothing.')
    process.exit(1)
  }
  console.log(`Validated ${manifests.length} manifest(s). OK.`)
  if (validateOnly) return

  let anyDrift = false
  for (const { filename, manifest } of manifests) {
    const liveRuleset = fetchLiveRulesetByName(manifest.name)
    const result = planAction(manifest, liveRuleset)
    console.log(formatResultLine(filename, result))
    if (result.action !== 'none') {
      anyDrift = true
      if (apply) {
        console.log(`  applying ${filename}...`)
        applyManifest(manifest, liveRuleset)
      }
    }
  }

  if (anyDrift && !apply) {
    console.log('\nDrift found. Re-run with --apply to reconcile (local only, never from CI).')
  }
}

main()
