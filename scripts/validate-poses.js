#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true, strict: false });
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/schemas/pose.schema.json'), 'utf8'));
const validate = ajv.compile(schema);

// Tier-2 fields never fail CI on omission — see docs/krama-atlas.md. Declared on the
// schema itself (data/schemas/pose.schema.json's "x-tier2-properties") so this script
// and the schema can't drift out of sync.
const TIER2_FIELDS = schema['x-tier2-properties'] || [];

const posesDir = path.join(__dirname, '../data/poses');
const files = fs.readdirSync(posesDir).filter(f => f.endsWith('.json'));

let errors = 0;
const slugs = new Set();
const tier2Gaps = [];

for (const file of files) {
  const filePath = path.join(posesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const expectedSlug = path.basename(file, '.json');

  if (data.slug !== expectedSlug) {
    console.error(`❌ ${file}: slug "${data.slug}" does not match filename "${expectedSlug}"`);
    errors++;
  }
  if (slugs.has(data.slug)) {
    console.error(`❌ ${file}: duplicate slug "${data.slug}"`);
    errors++;
  }
  slugs.add(data.slug);

  if (!validate(data)) {
    console.error(`❌ ${file}:`);
    for (const err of validate.errors) {
      console.error(`   ${err.instancePath} ${err.message}`);
    }
    errors++;
  } else {
    console.log(`✅ ${file}`);
  }

  const missingTier2 = TIER2_FIELDS.filter((field) => data[field] === undefined);
  if (missingTier2.length > 0) {
    tier2Gaps.push({ file, missingTier2 });
  }

  // Non-failing warning: overloaded sanskrit strings carry tradition semantics that
  // belong in `tradition_names` or `modes[]`. Clean up by stripping parentheticals.
  if (data.sanskrit && (data.sanskrit.includes('(') || /\bvariation\b/i.test(data.sanskrit))) {
    console.warn(`⚠️  ${file}: sanskrit "${data.sanskrit}" contains a parenthetical or "variation" — consider moving that semantic to tradition_names or modes[].`);
  }
}

if (tier2Gaps.length > 0) {
  console.log(`\n--- Tier-2 completeness report (${tier2Gaps.length}/${files.length} poses have gaps; never fails CI) ---`);
  for (const { file, missingTier2 } of tier2Gaps) {
    console.log(`⚠️  ${file}: missing ${missingTier2.join(', ')}`);
  }
} else {
  console.log('\n✅ No Tier-2 gaps — full field dictionary populated on every pose.');
}

if (errors > 0) {
  console.error(`\n${errors} error(s) found in pose library (Tier-1 schema failures only — Tier-2 gaps never fail CI).`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${files.length} pose files valid.`);
}
