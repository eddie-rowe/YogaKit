#!/usr/bin/env node
// Validates data/guidance/*.md frontmatter: exactly one named trigger and one unique
// authored priority per entry (005 FR-036..FR-038, decision #7). An empty corpus passes —
// no entry body is authored until the tone contract (T007) is signed off.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validateGuidance } from './lib/guidance.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const dir = path.join(here, '..', 'data', 'guidance')

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort() : []
const entries = files.map(f => ({ file: `data/guidance/${f}`, text: fs.readFileSync(path.join(dir, f), 'utf8') }))

const { errors, count } = validateGuidance(entries)
for (const e of errors) console.error(`❌ ${e}`)

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s) in data/guidance/.`)
  process.exit(1)
}
console.log(`✅ guidance: ${count} entr${count === 1 ? 'y' : 'ies'} valid.`)
