/**
 * Unit tests for the copy-lint's pure module (009 US1, FR-021).
 *
 * Everything here runs in memory against source strings. No temp files, no fixtures on
 * disk — the whole reason the matching logic was extracted from the script is that a
 * rule should be testable by handing it a sentence.
 *
 * The real rule set is loaded from `data/voice/voice-rules.json` rather than a mock, so
 * a rule that stops matching its own documented violating example fails here.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  EXCEPTION_MARKER,
  EXCLUDED_PATTERNS,
  SCAN_DIRS,
  SCAN_EXTENSIONS,
  compileRules,
  coverageLimits,
  decodeEntities,
  extractCopy,
  formatReport,
  formatViolation,
  lintSource,
  looksLikeProse,
  parseExceptions,
} from '../../../scripts/lib/copy-lint.mjs'

const repoRoot = path.join(__dirname, '../../..')
const ruleSet = JSON.parse(
  readFileSync(path.join(repoRoot, 'data/voice/voice-rules.json'), 'utf8'),
)
const rules = compileRules(ruleSet)

/** Wrap a bare string in a component so it is extracted the way real copy would be. */
const inComponent = (copy: string) =>
  `export function C() {\n  return <p>${copy}</p>\n}\n`

const lint = (source: string, filename = 'C.tsx') => lintSource(source, filename, rules)
const idsFor = (copy: string) => lint(inComponent(copy)).violations.map((v) => v.ruleId)

describe('the rule set as data', () => {
  it('matches every violating example it documents, and clears every compliant one', () => {
    for (const rule of ruleSet.rules) {
      const compiled = rules.find((r: { id: string }) => r.id === rule.id)!
      expect(compiled.match(rule.violatingExample), `${rule.id} violatingExample`).toBeTruthy()
      expect(compiled.match(rule.compliantExample), `${rule.id} compliantExample`).toBeNull()
    }
  })

  it('traces every rule to the constitution or to VOICE.md', () => {
    for (const rule of ruleSet.rules) {
      expect(rule.source, rule.id).toMatch(/^(RULE-C\d|VOICE\.md)$/)
      expect(rule.rationale.length, rule.id).toBeGreaterThan(40)
    }
  })

  it('declares its language scope, because the patterns do not transfer', () => {
    expect(ruleSet.languageScope).toBe('en')
  })
})

describe('the four constitutional rules', () => {
  it('flags a streak returning to zero (RULE-C1)', () => {
    expect(idsFor('You missed a day — your streak is back to zero.')).toContain('VOICE-STREAK-RESET')
    expect(idsFor('Lost your streak? Start over tomorrow.')).toContain('VOICE-STREAK-RESET')
  })

  it('accepts a paused streak, which is what the product actually does', () => {
    expect(idsFor('Your streak is paused at twelve days. It picks up wherever you do.')).toEqual([])
  })

  it('flags guilt and shame (RULE-C2)', () => {
    expect(idsFor('You failed to practise yesterday.')).toContain('VOICE-GUILT')
    expect(idsFor('No more excuses — get back on track.')).toContain('VOICE-GUILT')
  })

  it('flags urgency (RULE-C2)', () => {
    expect(idsFor('Last chance to practise before it is too late.')).toContain('VOICE-URGENCY')
  })

  it('flags a countdown toward loss (RULE-C2 / C6)', () => {
    expect(idsFor('2 days left before you lose your progress.')).toContain('VOICE-COUNTDOWN')
  })

  it('flags rest described as a lapse, but only when both halves are present (RULE-C4)', () => {
    expect(idsFor('Rest day or missed day? Either way the streak lapses.')).toContain('VOICE-REST-LAPSE')
    // "Rest is practice" alone must stay clean, or the rule punishes the compliant phrasing.
    expect(idsFor('Rest is practice. Mark today as rest.')).toEqual([])
  })

  it('flags the vocabulary that marks generated text', () => {
    expect(idsFor('Embark on a journey to unlock your potential.')).toContain('VOICE-AI-TELLS')
  })

  it('leaves real teaching cues alone that share a word with an AI tell', () => {
    // The narrow scoping in VOICE.md §3a exists for exactly these two sentences.
    expect(idsFor('Unlock the hips by letting the knees fall wide.')).toEqual([])
    expect(idsFor('Elevate the ribs away from the floor on the inhale.')).toEqual([])
  })

  it('reports the rule source alongside the id, so a reader can go read the rule', () => {
    const [v] = lint(inComponent('You failed to practise yesterday.')).violations
    expect(v.ruleSource).toBe('RULE-C2')
    expect(v.ruleTitle).toBeTruthy()
    expect(v.matched).toBe('You failed')
  })
})

describe('extraction reads copy and nothing else', () => {
  it('reads JSX text, string literals, and template fragments', () => {
    const kinds = extractCopy(
      'export const a = "the first string"\n' +
        'export function C() {\n' +
        '  return <p>some jsx text here</p>\n' +
        '}\n' +
        'export const b = `a template with ${x} a tail fragment`\n',
      'C.tsx',
    ).map((s) => s.kind)
    expect(new Set(kinds)).toEqual(new Set(['string', 'jsx-text', 'template']))
  })

  it('does not read comments — the AST cannot see them', () => {
    const found = extractCopy('// You failed to practise yesterday\nexport const x = 1\n', 'a.ts')
    expect(found).toEqual([])
  })

  it('does not read import specifiers', () => {
    const found = extractCopy("import { a } from './some/long/module/path'\n", 'a.ts')
    expect(found).toEqual([])
  })

  it('does not read className, style, or testid attributes', () => {
    const found = extractCopy(
      'export function C() {\n' +
        '  return <p className="flex items-center gap-2" data-testid="a-b-c" style={"color: red"}>Real copy here</p>\n' +
        '}\n',
      'C.tsx',
    )
    expect(found.map((f) => f.text)).toEqual(['Real copy here'])
  })

  it('does read alt, aria-label, placeholder, and title — those are copy', () => {
    const found = extractCopy(
      'export function C() {\n' +
        '  return <input aria-label="Name of the flow" placeholder="Untitled flow" title="A flow title" />\n' +
        '}\n',
      'C.tsx',
    ).map((f) => f.text)
    expect(found).toContain('Name of the flow')
    expect(found).toContain('Untitled flow')
    expect(found).toContain('A flow title')
  })

  it('does not read class strings passed to cn()', () => {
    const found = extractCopy('const c = cn("rounded-full px-3", "text-sm font-medium")\n', 'a.ts')
    expect(found).toEqual([])
  })

  it('does not read technical property values or literal types', () => {
    const found = extractCopy(
      'type T = "some literal type"\n' +
        'const o = { className: "a b c", redirectTo: "/some/path here", label: "Save this flow" }\n',
      'a.ts',
    ).map((f) => f.text)
    expect(found).toEqual(['Save this flow'])
  })

  it('does not read object keys or element access keys', () => {
    const found = extractCopy(
      'const o = { "a key here": 1 }\nconst v = o["a key here"]\n',
      'a.ts',
    )
    expect(found).toEqual([])
  })

  it('does not read a template in a technical position', () => {
    // A className built by interpolation is still a className.
    expect(
      extractCopy('export const C = () => <p className={`flex ${g} items here`} />\n', 'C.tsx'),
    ).toEqual([])
  })

  it('does not read a module declaration name', () => {
    expect(extractCopy("declare module 'a long module name' {}\n", 'a.ts')).toEqual([])
  })

  it('reads a string in an ordinary position — a return, or a non-technical call', () => {
    const returned = extractCopy('export function f() { return "a returned message" }\n', 'a.ts')
    expect(returned.map((r) => r.text)).toEqual(['a returned message'])
    const called = extractCopy('describeFlow("a described message")\n', 'a.ts')
    expect(called.map((r) => r.text)).toEqual(['a described message'])
  })

  it('handles a property key that is neither an identifier nor a string', () => {
    // Computed and numeric keys have no `.text` to compare against the technical set;
    // the value must still be read rather than silently dropped.
    const found = extractCopy(
      'const o = { ["className"]: "a computed value", 1: "a numeric key value" }\n',
      'a.ts',
    ).map((f) => f.text)
    expect(found).toContain('a computed value')
    expect(found).toContain('a numeric key value')
  })

  it('handles a callee that is a member expression, or neither', () => {
    expect(extractCopy('logger.info("a logged message")\n', 'a.ts')).toHaveLength(1)
    expect(extractCopy('handlers[0]("an indirect message")\n', 'a.ts')).toHaveLength(1)
  })

  it('does not read a technically-named variable declaration', () => {
    expect(extractCopy('const href = "some path value"\n', 'a.ts')).toEqual([])
  })

  it('reports a 1-based line and column', () => {
    const [found] = extractCopy('\n\nexport const m = "a real message"\n', 'a.ts')
    expect(found.line).toBe(3)
    expect(found.column).toBe(18)
  })

  it('parses .ts as TS and .tsx as TSX', () => {
    expect(extractCopy('export const x = "a plain message"\n', 'a.ts')).toHaveLength(1)
    expect(extractCopy('export const C = () => <p>a jsx message</p>\n', 'a.tsx')).toHaveLength(1)
  })
})

describe('escaped and typographic punctuation', () => {
  it('decodes the entities JSX forces on an apostrophe', () => {
    // `react/no-unescaped-entities` makes `&apos;` the normal spelling in this codebase.
    // Without decoding, every rule containing an apostrophe would silently never fire.
    expect(idsFor('Don&apos;t let yourself down.')).toContain('VOICE-GUILT')
    expect(idsFor('Don&#39;t let yourself down.')).toContain('VOICE-GUILT')
    expect(idsFor('Don&rsquo;t let yourself down.')).toContain('VOICE-GUILT')
  })

  it('matches a typographic apostrophe as if it were straight', () => {
    expect(idsFor('Don\u2019t let yourself down.')).toContain('VOICE-GUILT')
    expect(idsFor('Don\u2018t let yourself down.')).toContain('VOICE-GUILT')
  })

  it('decodes the rest of the entity set it claims to handle', () => {
    expect(decodeEntities('a &amp; b &quot;c&quot; &mdash; &ndash; &hellip; &nbsp;&ldquo;d&rdquo;'))
      .toBe('a & b "c" \u2014 \u2013 \u2026  \u201cd\u201d')
  })

  it('leaves an entity it does not know alone', () => {
    expect(decodeEntities('a &copy; b')).toBe('a &copy; b')
  })
})

describe('looksLikeProse', () => {
  it.each([
    ['two real words', true],
    ['Rest is practice.', true],
    ['a', false],
    ['flow', false],
    ['MAX_ITEMS', false],
    ['https://example.com/a path', false],
    ['/some/route path', false],
    ['./relative path', false],
    ['../up one', false],
    ['#anchor thing', false],
    ['@scope/pkg name', false],
    ['data:image/png thing', false],
    ['x y', false],
  ])('%s -> %s', (input, expected) => {
    expect(looksLikeProse(input)).toBe(expected)
  })
})

describe('the exception marker', () => {
  const marked = (comment: string, copy: string) =>
    `export function C() {\n  ${comment}\n  const m = '${copy}'\n  return <p>{m}</p>\n}\n`

  it('suppresses the named rule on the next line, and records the reason', () => {
    const result = lint(
      marked(
        `// ${EXCEPTION_MARKER} VOICE-COUNTDOWN — the token really does stop working after a week`,
        'This link expires in 7 days.',
      ),
    )
    expect(result.violations).toEqual([])
    expect(result.suppressed).toHaveLength(1)
    expect(result.suppressed[0].reason).toContain('really does stop working')
  })

  it('suppresses only the rule it names', () => {
    const result = lint(
      marked(
        `// ${EXCEPTION_MARKER} VOICE-GUILT — unrelated`,
        'This link expires in 7 days.',
      ),
    )
    expect(result.violations.map((v) => v.ruleId)).toEqual(['VOICE-COUNTDOWN'])
  })

  it('accepts a block comment and a JSX comment form', () => {
    const block = lint(
      `/* ${EXCEPTION_MARKER} VOICE-URGENCY — a genuine deadline stated plainly */\nconst m = 'Act now to confirm the booking'\nexport const C = () => <p>{m}</p>\n`,
    )
    expect(block.violations).toEqual([])
    const jsx = lint(
      `export const C = () => <div>\n  {/* ${EXCEPTION_MARKER} VOICE-URGENCY — a genuine deadline stated plainly */}\n  <p>Act now to confirm the booking</p>\n</div>\n`,
    )
    expect(jsx.violations).toEqual([])
  })

  it('ignores the marker text when it is not in a comment', () => {
    const result = lint(inComponent(`${EXCEPTION_MARKER} VOICE-GUILT — you failed to practise`))
    expect(result.violations.map((v) => v.ruleId)).toContain('VOICE-GUILT')
  })

  it('reports a marker with no rule id and no reason', () => {
    const { malformed } = parseExceptions(`// ${EXCEPTION_MARKER}\nconst x = 1\n`)
    expect(malformed[0].reason).toBe('marker has no rule id and no reason')
  })

  it('reports a marker whose shape is wrong', () => {
    const { malformed } = parseExceptions(`// ${EXCEPTION_MARKER} not a rule id at all\nconst x = 1\n`)
    expect(malformed[0].reason).toContain('must read')
  })

  it('reports a rule id with no real reason — an unexplained silence is the failure mode', () => {
    const { malformed } = parseExceptions(`// ${EXCEPTION_MARKER} VOICE-GUILT — ok\nconst x = 1\n`)
    expect(malformed[0].reason).toContain('needs a real reason')
    expect(malformed[0].reason).toContain('VOICE-GUILT')
  })

  it('finds no exceptions in a file that has none', () => {
    const { exceptions, malformed } = parseExceptions('const x = 1\n')
    expect(exceptions.size).toBe(0)
    expect(malformed).toEqual([])
  })
})

describe('reporting', () => {
  const violation = lint(inComponent('You failed to practise yesterday.')).violations[0]

  it('formats a violation with file, position, rule, the match, and the string', () => {
    const out = formatViolation(violation)
    expect(out).toContain('C.tsx:2')
    expect(out).toContain('VOICE-GUILT (RULE-C2)')
    expect(out).toContain('matched: "You failed"')
    expect(out).toContain('You failed to practise yesterday.')
  })

  it('truncates a very long string rather than flooding the terminal', () => {
    const long = { ...violation, text: 'x'.repeat(200) }
    expect(formatViolation(long)).toContain('…')
    expect(formatViolation(long).length).toBeLessThan(400)
  })

  it('states the coverage limits on a passing run, not only a failing one', () => {
    const report = formatReport({
      violations: [], filesScanned: 60, stringsScanned: 343,
      suppressed: [], malformed: [], ruleCount: 6,
    })
    expect(report).toContain('✓ copy-lint: 343 strings in 60 files')
    expect(report).toContain('What this check does NOT cover')
    for (const limit of coverageLimits()) expect(report).toContain(limit)
  })

  it('reports violations, malformed markers, and suppressions together', () => {
    const report = formatReport({
      violations: [violation],
      filesScanned: 1,
      stringsScanned: 1,
      suppressed: [{ file: 'a.tsx', line: 3, ruleId: 'VOICE-GUILT', reason: 'because' }],
      malformed: [{ file: 'a.tsx', line: 9, reason: 'marker has no rule id and no reason' }],
      ruleCount: 6,
    })
    expect(report).toContain('Malformed exception markers (1)')
    expect(report).toContain('a.tsx:9')
    expect(report).toContain('Voice violations (1)')
    expect(report).toContain('1 suppressed by an explicit, reasoned exception')
  })

  it('names five distinct coverage limits, matching VOICE.md §6', () => {
    expect(coverageLimits()).toHaveLength(5)
  })
})

describe('scoping', () => {
  it('scans the user-facing directories and not src/lib', () => {
    expect(SCAN_DIRS).toEqual(['src/app', 'src/components'])
    // RULE-H6's modules author no copy; lint noise on that path is worse than no cover.
    expect(SCAN_DIRS.some((d) => d.startsWith('src/lib'))).toBe(false)
  })

  it('scans TS and TSX only', () => {
    expect(SCAN_EXTENSIONS).toEqual(['.ts', '.tsx'])
  })

  it('excludes test files, which seed violations on purpose', () => {
    const excluded = (f: string) => EXCLUDED_PATTERNS.some((p) => p.test(f))
    expect(excluded('src/components/a.test.tsx')).toBe(true)
    expect(excluded('src/components/a.spec.ts')).toBe(true)
    expect(excluded('src/components/__tests__/a.tsx')).toBe(true)
    expect(excluded('src/components/a.tsx')).toBe(false)
  })

  it('counts every string it scanned, so the report can be checked against the tree', () => {
    const result = lint(inComponent('Rest is practice. Mark today as rest.'))
    expect(result.scanned).toBe(1)
  })
})
