#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true });
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/schemas/pose.schema.json'), 'utf8'));
const validate = ajv.compile(schema);

const posesDir = path.join(__dirname, '../data/poses');
const files = fs.readdirSync(posesDir).filter(f => f.endsWith('.json'));

let errors = 0;
const slugs = new Set();

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

  // Non-failing warning: overloaded sanskrit strings carry tradition semantics that
  // belong in `tradition_names` or `modes[]`. Clean up by stripping parentheticals.
  if (data.sanskrit && (data.sanskrit.includes('(') || /\bvariation\b/i.test(data.sanskrit))) {
    console.warn(`⚠️  ${file}: sanskrit "${data.sanskrit}" contains a parenthetical or "variation" — consider moving that semantic to tradition_names or modes[].`);
  }
}

if (errors > 0) {
  console.error(`\n${errors} error(s) found in pose library.`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${files.length} pose files valid.`);
}
