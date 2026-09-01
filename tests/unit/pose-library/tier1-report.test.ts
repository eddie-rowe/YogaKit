import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Ajv from 'ajv'
import { describe, it, expect } from 'vitest'

// Imported from scripts/ rather than src/ on purpose: this is build tooling, and giving it
// a home under src/ would imply the app may import it. The app must not — it reads poses
// through src/lib/pose-library, and this module exists to hold the *gate* to account.
import {
  GEOMETRY_FIELDS,
  deriveNullableFields,
  deriveTier1Fields,
  findStaleReviews,
  formatAjvError,
  formatCoverageReport,
  geometryFingerprint,
  parseReviewRecord,
  tier1Coverage,
} from '../../../scripts/lib/tier1-report.mjs'

// This is the test that 001's T074 asked for and never got, and the mechanical form of
// 003's SC-001. It exists because "Tier-1 completeness is enforced" was, until now, a
// claim about a script with no seam a test could reach.

const schema = JSON.parse(fs.readFileSync('data/schemas/pose.schema.json', 'utf8'))
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

function realPose(slug = 'camel'): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(`data/poses/${slug}.json`, 'utf8'))
}

function allRealPoses(): Record<string, unknown>[] {
  return fs
    .readdirSync('data/poses')
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join('data/poses', f), 'utf8')))
}

describe('deriveTier1Fields', () => {
  it('is required minus the schema-declared Tier-2 set', () => {
    const tier1 = deriveTier1Fields(schema)
    const tier2 = schema['x-tier2-properties'] as string[]

    // The two sets are disjoint today — 001's T019 moved the Tier-2 fields *out* of
    // required rather than marking them in place — so the subtraction is currently a
    // no-op. Asserted anyway: it is what stops a future Tier-2 field added to required
    // from silently becoming a Tier-1 gate.
    for (const field of tier2) expect(tier1).not.toContain(field)
    expect(tier1).toEqual(schema.required.filter((f: string) => !tier2.includes(f)))
  })

  it('treats a schema with neither key as having no Tier-1 fields', () => {
    expect(deriveTier1Fields({})).toEqual([])
  })

  it('derives 24 fields from the current schema', () => {
    // Not a magic number worth guarding for its own sake — it guards the *derivation*.
    // If required or x-tier2-properties changes, this fails and someone reads why.
    expect(deriveTier1Fields(schema)).toHaveLength(24)
  })
})

describe('deriveNullableFields', () => {
  it('finds prop_free_variation, whose null is an authored answer rather than a gap', () => {
    // 50 of the 67 poses carry prop_free_variation: null, meaning "needs no prop-free
    // variation". Treating that as missing reported the library as 25.4% complete.
    expect(deriveNullableFields(schema).has('prop_free_variation')).toBe(true)
    expect(deriveNullableFields(schema).has('base_of_support')).toBe(false)
  })

  it('recognises every way a JSON Schema can admit null', () => {
    const nullable = deriveNullableFields({
      properties: {
        viaOneOf: { oneOf: [{ type: 'string' }, { type: 'null' }] },
        viaAnyOf: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        viaTypeArray: { type: ['string', 'null'] },
        viaBareNull: { type: 'null' },
        notNullable: { type: 'string' },
        typeless: {},
      },
    })

    expect([...nullable].sort()).toEqual(['viaAnyOf', 'viaBareNull', 'viaOneOf', 'viaTypeArray'])
  })

  it('returns an empty set for a schema with no properties', () => {
    expect(deriveNullableFields({}).size).toBe(0)
  })
})

describe('tier1Coverage', () => {
  const tier1 = deriveTier1Fields(schema)
  const nullable = deriveNullableFields(schema)

  it('reports a complete fixture set as 1', () => {
    const coverage = tier1Coverage([realPose('camel'), realPose('butterfly')], tier1, nullable)
    expect(coverage.overall).toBe(1)
    expect(coverage.gaps).toEqual([])
  })

  it('names the slug and the field of a missing Tier-1 field', () => {
    const broken = realPose('butterfly')
    delete broken.base_of_support

    const coverage = tier1Coverage([broken], tier1, nullable)
    expect(coverage.gaps).toContainEqual({ slug: 'butterfly', field: 'base_of_support' })
    expect(coverage.overall).toBe(0)
  })

  it('counts a missing source as a gap, because attribution is Tier-1 (FR-004)', () => {
    const broken = realPose('camel')
    delete broken.source

    expect(tier1Coverage([broken], tier1, nullable).gaps).toContainEqual({
      slug: 'camel',
      field: 'source',
    })
  })

  it('does not count a schema-sanctioned null as a gap', () => {
    const pose = realPose('butterfly')
    expect(pose.prop_free_variation).toBeNull()
    expect(tier1Coverage([pose], tier1, nullable).gaps).toEqual([])
  })

  it('counts an unsanctioned null as a gap', () => {
    const broken = realPose('camel')
    broken.spinal_action = null

    expect(tier1Coverage([broken], tier1, nullable).gaps).toContainEqual({
      slug: 'camel',
      field: 'spinal_action',
    })
  })

  it('measures poses-complete, not cells-filled', () => {
    // One pose missing one of 24 fields is a hole in the library. Averaging over cells
    // would report 95.8% for a two-pose set, which reads as fine.
    const broken = realPose('butterfly')
    delete broken.zone

    const coverage = tier1Coverage([realPose('camel'), broken], tier1, nullable)
    expect(coverage.overall).toBe(0.5)
    expect(coverage.complete).toBe(1)
  })

  it('holds the real library at 67/67 (SC-002)', () => {
    const coverage = tier1Coverage(allRealPoses(), tier1, nullable)
    expect(coverage.gaps).toEqual([])
    expect(coverage.overall).toBe(1)
  })

  it('treats an empty library as complete rather than dividing by zero', () => {
    expect(tier1Coverage([], tier1, nullable).overall).toBe(1)
  })

  it('falls back to a placeholder slug when the pose has none', () => {
    expect(tier1Coverage([{}], ['zone'], nullable).gaps).toEqual([
      { slug: '(no slug)', field: 'zone' },
    ])
  })
})

describe('formatCoverageReport', () => {
  const tier1 = deriveTier1Fields(schema)
  const nullable = deriveNullableFields(schema)

  it('leads with the FR-007 headline figure', () => {
    const lines = formatCoverageReport(tier1Coverage(allRealPoses(), tier1, nullable), tier1)
    expect(lines[0]).toBe('Tier-1 coverage: 67/67 poses complete (100.0%) across 24 fields')
    expect(lines).toHaveLength(1)
  })

  it('adds a per-field line naming the poses below 100%', () => {
    const broken = realPose('butterfly')
    delete broken.cog_height

    const lines = formatCoverageReport(
      tier1Coverage([realPose('camel'), broken], tier1, nullable),
      tier1
    )
    expect(lines[0]).toContain('1/2 poses complete (50.0%)')
    expect(lines.some((line: string) => line.includes('cog_height: 1/2') && line.includes('butterfly'))).toBe(true)
  })
})

describe('formatAjvError', () => {
  const ajv = new Ajv({ allErrors: true, strict: false })
  const validate = ajv.compile(schema)

  function errorsFor(data: unknown): string[] {
    validate(data)
    return (validate.errors ?? []).map(err => formatAjvError(err, data))
  }

  it('names the offending value and the whole permitted set on an enum failure (FR-006)', () => {
    // Ajv alone says only "must be equal to one of the allowed values" — naming neither
    // what was written nor what was allowed. This is US2's third acceptance scenario.
    const broken = realPose('camel')
    broken.energetic_direction = 'yang'

    const messages = errorsFor(broken)
    const message = messages.find(m => m.includes('/energetic_direction'))

    expect(message).toBeDefined()
    expect(message).toContain('"yang"')
    expect(message).toContain('brahmana')
    expect(message).toContain('langhana')
    expect(message).toContain('samana')
  })

  it('names the missing property rather than the container on a required failure', () => {
    const broken = realPose('butterfly')
    delete broken.base_of_support

    expect(errorsFor(broken).some(m => m.includes('missing required property "base_of_support"'))).toBe(
      true
    )
  })

  it('reports the actual value on a plain type failure', () => {
    const broken = realPose('camel')
    broken.complexity = 'six'

    expect(errorsFor(broken).some(m => m.includes('/complexity') && m.includes('got "six"'))).toBe(true)
  })

  it('resolves a nested instancePath through an array index', () => {
    const broken = realPose('camel')
    broken.modes = [{ ...(broken.modes as Record<string, unknown>[])[0], type: 'invented' }]

    const message = errorsFor(broken).find(m => m.includes('/modes/0/type'))
    expect(message).toContain('"invented"')
  })

  it('describes non-primitive and absent values without throwing', () => {
    expect(formatAjvError({ keyword: 'type', instancePath: '/zone', message: 'must be string' }, { zone: [1, 2] })).toContain(
      'an array of 2'
    )
    expect(formatAjvError({ keyword: 'type', instancePath: '/zone', message: 'must be string' }, { zone: {} })).toContain(
      'an object'
    )
    expect(formatAjvError({ keyword: 'type', instancePath: '/zone/deep', message: 'x' }, { zone: 'flat' })).toContain(
      'absent'
    )
    expect(formatAjvError({ keyword: 'type', instancePath: '/zone', message: 'x' }, { zone: 4 })).toContain('got 4')
  })

  it('unescapes JSON-pointer segments', () => {
    expect(
      formatAjvError({ keyword: 'type', instancePath: '/a~1b', message: 'x' }, { 'a/b': 'value' })
    ).toContain('"value"')
  })

  it('resolves an empty instancePath to the whole document', () => {
    // Reachable for a root-level enum — rare, but the resolver must not treat "" as a
    // path with one empty segment.
    expect(
      formatAjvError(
        { keyword: 'enum', instancePath: '', message: 'bad', params: { allowedValues: ['a'] } },
        { zone: 'x' }
      )
    ).toContain('an object')
  })

  it('handles a root-level error with no instancePath', () => {
    expect(formatAjvError({ keyword: 'type', instancePath: '', message: 'must be object' }, {})).toBe(
      '(root) must be object'
    )
  })

  it('falls back gracefully when an enum error carries no allowedValues', () => {
    expect(
      formatAjvError({ keyword: 'enum', instancePath: '/zone', message: 'bad', params: {} }, { zone: 'x' })
    ).toContain('got "x"')
  })
})

describe('geometryFingerprint', () => {
  it('is stable across property reordering and reformatting', () => {
    const pose = realPose('butterfly')
    const shuffled = Object.fromEntries(Object.entries(pose).reverse())

    expect(geometryFingerprint(shuffled, sha256)).toBe(geometryFingerprint(pose, sha256))
  })

  it('changes when a geometry field changes', () => {
    const pose = realPose('butterfly')
    const before = geometryFingerprint(pose, sha256)

    expect(geometryFingerprint({ ...pose, spinal_action: 'extension' }, sha256)).not.toBe(before)
  })

  it('does not change when a teaching field changes', () => {
    // The review is a geometry review. Rewording a cue must not invalidate it, or the
    // record becomes noise and everyone stops reading the warning.
    const pose = realPose('butterfly')
    const before = geometryFingerprint(pose, sha256)

    expect(
      geometryFingerprint({ ...pose, breathing_cues: { entering: 'reworded', holding: '', exiting: '' } }, sha256)
    ).toBe(before)
  })

  it('treats an absent geometry field as null rather than throwing', () => {
    expect(geometryFingerprint({}, sha256)).toMatch(/^[0-9a-f]{12}$/)
  })

  it('covers only Tier-1 geometry fields', () => {
    const tier1 = deriveTier1Fields(schema)
    for (const field of GEOMETRY_FIELDS) expect(tier1).toContain(field)
  })
})

describe('parseReviewRecord', () => {
  it('reads the shipped review record and skips its prose', () => {
    const records = parseReviewRecord(fs.readFileSync('docs/design/003-tier1-review.md', 'utf8'))

    expect(records).toHaveLength(10)
    expect(records.map((r: { slug: string }) => r.slug)).toContain('butterfly')
    for (const record of records) expect(record.geometry).toMatch(/^[0-9a-f]{12}$/)
  })

  it('skips headers, separators, and short rows', () => {
    const records = parseReviewRecord(
      [
        'Some prose about reviews.',
        '| Pose | Reviewer | Date | Verdict | Geometry | Corrections |',
        '|---|---|---|---|---|---|',
        '| `camel` | Tavo | 2026-09-01 | correct | `abc123abc123` | — |',
        '| too | short |',
        '| _placeholder_ | | | | | |',
      ].join('\n')
    )

    expect(records).toEqual([
      {
        slug: 'camel',
        reviewer: 'Tavo',
        date: '2026-09-01',
        verdict: 'correct',
        geometry: 'abc123abc123',
        corrections: '—',
      },
    ])
  })

  it('tolerates a row with no corrections cell', () => {
    const records = parseReviewRecord('| `camel` | Tavo | 2026-09-01 | correct | `abc` |')
    expect(records[0].corrections).toBe('')
  })
})

describe('findStaleReviews', () => {
  const poses = allRealPoses()

  it('finds nothing stale in the shipped record', () => {
    const records = parseReviewRecord(fs.readFileSync('docs/design/003-tier1-review.md', 'utf8'))
    const { stale, unknown } = findStaleReviews(records, poses, sha256)

    expect(stale).toEqual([])
    expect(unknown).toEqual([])
  })

  it('flags a pose whose geometry moved since its recorded fingerprint', () => {
    const { stale } = findStaleReviews(
      [{ slug: 'butterfly', date: '2026-09-01', geometry: '000000000000' }],
      poses,
      sha256
    )

    expect(stale).toHaveLength(1)
    expect(stale[0].slug).toBe('butterfly')
    expect(stale[0].reviewed).toBe('000000000000')
    expect(stale[0].current).not.toBe('000000000000')
  })

  it('flags a review naming a pose that is no longer in the library', () => {
    const { unknown } = findStaleReviews([{ slug: 'pigeon', geometry: 'abc' }], poses, sha256)
    expect(unknown).toEqual(['pigeon'])
  })

  it('ignores a row with no fingerprint yet', () => {
    const { stale } = findStaleReviews([{ slug: 'butterfly', geometry: '' }], poses, sha256)
    expect(stale).toEqual([])
  })
})

// SC-001 is about the *gate* failing, not about the reporter noticing — so one case has to
// run the real script. --dir exists for exactly this.
describe('the validator as a gate (SC-001)', () => {
  it('exits 1 on a pose missing a Tier-1 field, naming the pose and the field', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'krama-tier1-'))
    try {
      const broken = realPose('butterfly')
      delete broken.base_of_support
      fs.writeFileSync(path.join(dir, 'butterfly.json'), JSON.stringify(broken, null, 2))

      let status = 0
      let output = ''
      try {
        output = execFileSync('node', ['scripts/validate-poses.mjs', '--dir', dir], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } catch (error) {
        const failure = error as { status: number; stdout: string; stderr: string }
        status = failure.status
        output = `${failure.stdout}${failure.stderr}`
      }

      expect(status).toBe(1)
      expect(output).toContain('butterfly.json')
      expect(output).toContain('base_of_support')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }, 20_000)

  it('exits 0 on the real library and prints the coverage figure', () => {
    const output = execFileSync('node', ['scripts/validate-poses.mjs'], { encoding: 'utf8' })
    expect(output).toContain('Tier-1 coverage: 67/67 poses complete (100.0%)')
  }, 20_000)
})
