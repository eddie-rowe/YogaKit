import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// @ts-expect-error — untyped .mjs module
import { SCAN_DIRS, compileRules, lintSource } from '../../../scripts/lib/copy-lint.mjs'

const root = path.join(__dirname, '../../..')
const rules = compileRules(JSON.parse(readFileSync(path.join(root, 'data/voice/voice-rules.json'), 'utf8')))

// T040, T045: claim re-entry and sign-in/out copy sit inside the lint scope and pass it.
const FILES = [
  'src/app/settings/sections/SecuritySection.tsx',
  'src/app/auth/sign-in/SignInClient.tsx',
  'src/lib/settings/claim.ts',
]

describe('006 claim re-entry and sign-in copy (RULE-C2)', () => {
  it.each(FILES)('%s is inside the copy-lint scan scope', (f) => {
    expect(SCAN_DIRS.some((d: string) => f.startsWith(`${d}/`))).toBe(true)
  })

  it.each(FILES)('%s has no copy-lint violations', (f) => {
    const src = readFileSync(path.join(root, f), 'utf8')
    expect(lintSource(src, f, rules).violations).toEqual([])
  })

  it('sign-in copy has no countdown or urgency wording', () => {
    const src = readFileSync(path.join(root, FILES[1]), 'utf8')
    expect(src).not.toMatch(/expires? in|\bseconds?\b|hurry|last chance|resend in|\bnow or\b/i)
  })

  it('re-entry copy has no counter, badge or reminder wording', () => {
    const src = readFileSync(path.join(root, FILES[0]), 'utf8')
    expect(src).not.toMatch(/reminder|don't forget|still waiting|pending decision/i)
  })
})
