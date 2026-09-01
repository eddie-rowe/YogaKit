#!/usr/bin/env node
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv'
import {
  deriveNullableFields,
  deriveTier1Fields,
  findStaleReviews,
  formatAjvError,
  formatCoverageReport,
  geometryFingerprint,
  parseReviewRecord,
  tier1Coverage,
} from './lib/tier1-report.mjs'

const sha256 = value => createHash('sha256').update(value).digest('hex')

const here = path.dirname(fileURLToPath(import.meta.url))

// --dir exists for one caller: the SC-001 test, which needs to point the real gate at a
// fixture directory holding a deliberately broken pose and assert exit code 1. SC-001 is
// about the gate failing, not about the reporter noticing, so it cannot be proven against
// the pure module alone.
const dirArg = process.argv.indexOf('--dir')
const posesDir =
  dirArg !== -1 && process.argv[dirArg + 1]
    ? path.resolve(process.cwd(), process.argv[dirArg + 1])
    : path.join(here, '../data/poses')

const ajv = new Ajv({ allErrors: true, strict: false })
const schema = JSON.parse(
  fs.readFileSync(path.join(here, '../data/schemas/pose.schema.json'), 'utf8')
)
const validate = ajv.compile(schema)

// Tier-2 fields never fail CI on omission — see docs/krama-atlas.md. Declared on the
// schema itself (data/schemas/pose.schema.json's "x-tier2-properties") so this script
// and the schema can't drift out of sync.
const TIER2_FIELDS = schema['x-tier2-properties'] || []
const TIER1_FIELDS = deriveTier1Fields(schema)
const NULLABLE_FIELDS = deriveNullableFields(schema)

const files = fs.readdirSync(posesDir).filter(f => f.endsWith('.json'))

let errors = 0
const slugs = new Set()
const tier2Gaps = []
const poses = []

for (const file of files) {
  const filePath = path.join(posesDir, file)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const expectedSlug = path.basename(file, '.json')
  poses.push(data)

  if (data.slug !== expectedSlug) {
    console.error(`❌ ${file}: slug "${data.slug}" does not match filename "${expectedSlug}"`)
    errors++
  }
  if (slugs.has(data.slug)) {
    console.error(`❌ ${file}: duplicate slug "${data.slug}"`)
    errors++
  }
  slugs.add(data.slug)

  if (!validate(data)) {
    console.error(`❌ ${file}:`)
    for (const err of validate.errors) {
      console.error(`   ${formatAjvError(err, data)}`)
    }
    errors++
  } else {
    console.log(`✅ ${file}`)
  }

  const missingTier2 = TIER2_FIELDS.filter(field => data[field] === undefined)
  if (missingTier2.length > 0) {
    tier2Gaps.push({ file, missingTier2 })
  }

  // Non-failing warning: overloaded sanskrit strings carry tradition semantics that
  // belong in `tradition_names` or `modes[]`. Clean up by stripping parentheticals.
  if (data.sanskrit && (data.sanskrit.includes('(') || /\bvariation\b/i.test(data.sanskrit))) {
    console.warn(
      `⚠️  ${file}: sanskrit "${data.sanskrit}" contains a parenthetical or "variation" — consider moving that semantic to tradition_names or modes[].`
    )
  }
}

// FR-007. Printed above the Tier-2 report and unconditionally, pass or fail: a gate that
// only speaks when it fails cannot show a partial regression (SC-002).
console.log(`\n--- Tier-1 coverage report ---`)
for (const line of formatCoverageReport(tier1Coverage(poses, TIER1_FIELDS, NULLABLE_FIELDS), TIER1_FIELDS)) {
  console.log(line)
}

// FR-009's review itself is owner-blocked (001's T027). This is the part a script can
// own: noticing when a pose's geometry has been edited since the review that signed off
// on it. Warns, never fails — an unsigned or stale review is a provenance gap, not a
// broken build, and a red CI run for it would only teach everyone to ignore red.
const reviewPath = path.join(here, '../docs/design/003-tier1-review.md')
if (fs.existsSync(reviewPath)) {
  const records = parseReviewRecord(fs.readFileSync(reviewPath, 'utf8'))
  const { stale, unknown } = findStaleReviews(records, poses, sha256)
  for (const entry of stale) {
    console.warn(
      `⚠️  Tier-1 review stale: ${entry.slug} — geometry changed since review on ${entry.date} (recorded ${entry.reviewed}, current ${geometryFingerprint(poses.find(p => p.slug === entry.slug), sha256)})`
    )
  }
  for (const slug of unknown) {
    console.warn(`⚠️  Tier-1 review names a pose that is not in the library: ${slug}`)
  }
}

if (tier2Gaps.length > 0) {
  console.log(
    `\n--- Tier-2 completeness report (${tier2Gaps.length}/${files.length} poses have gaps; never fails CI) ---`
  )
  for (const { file, missingTier2 } of tier2Gaps) {
    console.log(`⚠️  ${file}: missing ${missingTier2.join(', ')}`)
  }
} else {
  console.log('\n✅ No Tier-2 gaps — full field dictionary populated on every pose.')
}

if (errors > 0) {
  console.error(
    `\n${errors} error(s) found in pose library (Tier-1 schema failures only — Tier-2 gaps never fail CI).`
  )
  process.exit(1)
} else {
  console.log(`\n✅ All ${files.length} pose files valid.`)
}
