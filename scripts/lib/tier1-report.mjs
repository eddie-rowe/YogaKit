/** Pure reporting logic for the pose-library validator — no fs, no process, no console.
 *
 *  It lives apart from scripts/validate-poses.mjs for one reason: US1's claim is that
 *  Tier-1 completeness is *provable*, and the script as it stood was a straight line of
 *  readFileSync and Ajv with no seam a test could reach. Everything here takes data and
 *  returns data, so tests/unit/pose-library/tier1-report.test.ts can hold it to account
 *  in memory without fixture directories on disk.
 */

/** The Tier-1 field set, derived rather than transcribed.
 *
 *  Tier-1 is "required, minus the fields the atlas marks Tier-2" — Tier-2 fields may be
 *  absent and never fail CI (docs/krama-atlas.md). Both halves are declared on the schema
 *  itself, so a hand-copied list here would be one more thing to keep in sync and one
 *  more place to be wrong. */
export function deriveTier1Fields(schema) {
  const tier2 = new Set(schema['x-tier2-properties'] || [])
  return (schema.required || []).filter(field => !tier2.has(field))
}

/** Fields whose schema admits an explicit null.
 *
 *  This distinction is load-bearing, and I got it wrong first: `prop_free_variation` is
 *  Tier-1 and required, but its schema is `oneOf: [string, null]` and 50 of the 67 poses
 *  carry `null` — meaning "this pose needs no prop-free variation", which is an authored
 *  answer, not an omission. Counting those as gaps reported the library as 25.4% complete
 *  when it is in fact complete. So `null` is a gap only where the schema forbids it. */
export function deriveNullableFields(schema) {
  const nullable = new Set()
  for (const [field, subschema] of Object.entries(schema.properties || {})) {
    const branches = subschema.oneOf || subschema.anyOf || [subschema]
    const admitsNull = branches.some(branch => {
      const type = branch?.type
      return type === 'null' || (Array.isArray(type) && type.includes('null'))
    })
    if (admitsNull) nullable.add(field)
  }
  return nullable
}

/** Walk an Ajv instancePath ("/emotional_release_potential/0/emotion") to the value it
 *  points at. Returns undefined if any hop is missing, which is the right answer for a
 *  "required property" error — the path names something that isn't there. */
function resolveInstancePath(data, instancePath) {
  if (!instancePath) return data
  let current = data
  // Ajv escapes ~ and / in JSON-pointer segments; unescape in the documented order.
  for (const raw of instancePath.split('/').slice(1)) {
    const segment = raw.replace(/~1/g, '/').replace(/~0/g, '~')
    if (current === null || typeof current !== 'object') return undefined
    current = current[segment]
  }
  return current
}

function describeValue(value) {
  if (typeof value === 'string') return JSON.stringify(value)
  if (value === undefined) return 'absent'
  if (typeof value === 'object') return Array.isArray(value) ? `an array of ${value.length}` : 'an object'
  return String(value)
}

/** FR-006: an error message that names the offending value and the permitted set.
 *
 *  Ajv's enum message is the bare "must be equal to one of the allowed values" — it names
 *  neither, so the reader has to open the schema to find out what they were allowed to
 *  write and open the pose file to find out what they did write. That is the whole cost of
 *  a typo'd enum, and it is entirely avoidable: err.params.allowedValues carries the set,
 *  and the offending value is reachable through err.instancePath. */
export function formatAjvError(err, data) {
  const where = err.instancePath || '(root)'
  const parts = [`${where} ${err.message}`]

  if (err.keyword === 'enum' && Array.isArray(err.params?.allowedValues)) {
    parts.push(`got ${describeValue(resolveInstancePath(data, err.instancePath))}`)
    parts.push(`allowed: ${err.params.allowedValues.join(', ')}`)
  } else if (err.keyword === 'required') {
    // The instancePath points at the *container*, so name the property Ajv missed.
    parts[0] = `${where} missing required property "${err.params.missingProperty}"`
  } else if (err.instancePath) {
    parts.push(`got ${describeValue(resolveInstancePath(data, err.instancePath))}`)
  }

  return parts.join(' — ')
}

/** FR-007: Tier-1 coverage as a figure, not an assertion.
 *
 *  The gate already fails on a missing Tier-1 field, so why count? Because a gate that
 *  only speaks when it fails cannot show a *partial* regression: 66/67 and 67/67 look
 *  identical in CI output until the day the missing one happens to be a schema error too.
 *  SC-002 wants the drop visible before it reaches zero.
 *
 *  `poses` is an array of parsed pose objects. `nullableFields` is the set from
 *  deriveNullableFields — for anything outside it, an explicit null is a gap wearing a
 *  value's clothes. */
export function tier1Coverage(poses, tier1Fields, nullableFields = new Set()) {
  const isPresent = (pose, field) =>
    pose[field] !== undefined && (pose[field] !== null || nullableFields.has(field))

  const perField = {}
  const gaps = []

  for (const field of tier1Fields) {
    let present = 0
    for (const pose of poses) {
      if (isPresent(pose, field)) {
        present++
      } else {
        gaps.push({ slug: pose.slug ?? '(no slug)', field })
      }
    }
    perField[field] = { present, total: poses.length, ratio: poses.length ? present / poses.length : 1 }
  }

  const complete = poses.filter(pose => tier1Fields.every(field => isPresent(pose, field))).length

  return {
    perField,
    gaps,
    complete,
    total: poses.length,
    // "overall" is pose-complete over poses, not field-present over cells: one pose
    // missing one field is a hole in the library, and averaging over 24 × 67 cells would
    // report it as 99.94% complete, which reads as fine.
    overall: poses.length ? complete / poses.length : 1,
  }
}

/** The FR-007 headline line, and the per-field lines beneath it for anything short of
 *  100%. Returned as an array of strings so the caller owns the I/O. */
export function formatCoverageReport(coverage, tier1Fields) {
  const pct = (coverage.overall * 100).toFixed(1)
  const lines = [
    `Tier-1 coverage: ${coverage.complete}/${coverage.total} poses complete (${pct}%) across ${tier1Fields.length} fields`,
  ]

  for (const field of tier1Fields) {
    const { present, total } = coverage.perField[field]
    if (present < total) {
      const missing = coverage.gaps.filter(gap => gap.field === field).map(gap => gap.slug)
      lines.push(`   ${field}: ${present}/${total} — missing on ${missing.join(', ')}`)
    }
  }

  return lines
}

/** The Tier-1 fields that describe the *shape* of the pose, as distinct from the ones that
 *  describe how it is taught. Only these matter for review staleness: rewording
 *  `breathing_cues` does not invalidate a geometry review, but changing `base_of_support`
 *  or `spinal_action` does — the friction engine reads exactly this kind of field, so a
 *  silent edit here changes what the engine derives. */
export const GEOMETRY_FIELDS = [
  'base_of_support',
  'bilateral',
  'body_position',
  'cog_height',
  'orientation',
  'plane',
  'spinal_action',
  'zone',
]

/** A short, stable fingerprint of a pose's geometry.
 *
 *  Keys are emitted in a fixed order so reformatting the JSON file — reordering
 *  properties, changing indentation — does not read as a geometry change. */
export function geometryFingerprint(pose, hash) {
  const canonical = GEOMETRY_FIELDS.map(field => `${field}=${JSON.stringify(pose[field] ?? null)}`).join('\n')
  return hash(canonical).slice(0, 12)
}

/** Pull the reviewed poses out of docs/design/003-tier1-review.md.
 *
 *  The record is a markdown table because a human maintains it — a reviewer signing off on
 *  a pose should not have to edit JSON. Rows are
 *  `| slug | reviewer | date | verdict | geometry | corrections |`; anything that isn't a
 *  data row (header, separator, prose) is skipped. */
export function parseReviewRecord(markdown) {
  const rows = []
  for (const line of markdown.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed.split('|').slice(1, -1).map(cell => cell.trim())
    if (cells.length < 5) continue
    if (/^-+$/.test(cells[0].replace(/[:\s]/g, '')) || cells[0].toLowerCase() === 'pose') continue
    if (!cells[0] || cells[0].startsWith('_')) continue
    rows.push({
      slug: cells[0].replace(/`/g, ''),
      reviewer: cells[1],
      date: cells[2],
      verdict: cells[3],
      geometry: cells[4].replace(/`/g, ''),
      corrections: cells[5] ?? '',
    })
  }
  return rows
}

/** WARNS, NEVER FAILS. FR-009's review is T027 — owner-blocked, and no script can perform
 *  it. What a script *can* do is notice when a pose's geometry has been edited since the
 *  review that signed off on it, which is the difference between a file someone may
 *  remember to update and a record that says when it went stale.
 *
 *  Returns { stale, unknown } — `unknown` catches a review row naming a pose that no longer
 *  exists, which is the other way this file rots. */
export function findStaleReviews(records, poses, hash) {
  const bySlug = new Map(poses.map(pose => [pose.slug, pose]))
  const stale = []
  const unknown = []

  for (const record of records) {
    const pose = bySlug.get(record.slug)
    if (!pose) {
      unknown.push(record.slug)
      continue
    }
    const current = geometryFingerprint(pose, hash)
    if (record.geometry && record.geometry !== current) {
      stale.push({ slug: record.slug, reviewed: record.geometry, current, date: record.date })
    }
  }

  return { stale, unknown }
}
