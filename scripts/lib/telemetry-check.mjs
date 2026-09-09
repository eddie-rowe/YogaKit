/**
 * Telemetry content-free check: the pure half (008 US4, FR-021/SC-007).
 *
 * RULE-L7 has, until this feature, had no automated test — only a compliant
 * configuration that nothing forced to stay compliant. This asserts, over every
 * telemetry call site and every `datadog/` manifest, that no field carrying authored
 * practice content (pose, flow, sequence, note, journal, reflection, mood, energy) is
 * ever passed. Modelled on `scripts/lib/copy-lint.mjs`: an AST walk over call sites
 * rather than a raw-text grep, for the same reason — a grep cannot tell a banned
 * property key from a comment or an unrelated identifier that merely contains the word.
 *
 * No filesystem, no process. The I/O lives in `scripts/check-telemetry-content-free.mjs`.
 */

import ts from 'typescript'

/** Directories scanned for telemetry call sites, relative to the repo root. */
export const SCAN_DIRS = ['src']

export const SCAN_EXTENSIONS = ['.ts', '.tsx']

export const EXCLUDED_PATTERNS = [/\.test\.tsx?$/, /\.spec\.tsx?$/, /\/__tests__\//]

/**
 * Field names that must never reach a telemetry call, wherever the call sits —
 * kept in sync by hand with `src/lib/utils/logger.ts`'s `BANNED_FIELD_NAMES` (that
 * file is TypeScript compiled for the app; this one is a plain `.mjs` static-analysis
 * tool with no build step, so importing across that boundary isn't worth the coupling)
 * plus the practice-content vocabulary RULE-L7 names directly: pose, flow, sequence,
 * and their common field spellings.
 */
export const BANNED_FIELD_NAMES = new Set([
  'note', 'notes', 'journal', 'reflection', 'mood', 'energy',
  'password', 'token', 'raw_token', 'secret', 'email', 'to', 'recipient', 'error',
  'pose', 'pose_name', 'posename', 'pose_slug', 'poseslug', 'pose_title',
  'flow', 'flow_name', 'flowname', 'flow_title', 'flowtitle',
  'sequence', 'sequence_name', 'sequencename', 'sequence_title',
  'cue', 'cues', 'teacher_notes', 'teachernotes',
])

/** `object.method(...)` call sites whose arguments carry telemetry fields. */
const TELEMETRY_CALLEES = new Map([
  ['logger', new Set(['debug', 'info', 'warn', 'error'])],
  ['datadogRum', new Set(['addAction', 'addError', 'setUser', 'setUserProperty', 'setGlobalContextProperty', 'addTiming'])],
])

function calleeMatch(expr) {
  if (!ts.isPropertyAccessExpression(expr)) return null
  const object = ts.isIdentifier(expr.expression) ? expr.expression.text : null
  const method = expr.name.text
  if (object && TELEMETRY_CALLEES.get(object)?.has(method)) return { object, method }
  return null
}

/**
 * Every property key found in an object literal, recursing into nested object
 * literals — a banned field nested under a `context`/`extra` wrapper is exactly as
 * much a leak as a top-level one.
 */
function collectPropertyNames(node, sourceFile, out) {
  if (!ts.isObjectLiteralExpression(node)) return
  for (const prop of node.properties) {
    if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
      const name = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null
      if (name !== null) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(prop.getStart(sourceFile))
        out.push({ name, line: line + 1, column: character + 1 })
      }
      if (ts.isPropertyAssignment(prop) && ts.isObjectLiteralExpression(prop.initializer)) {
        collectPropertyNames(prop.initializer, sourceFile, out)
      }
    } else if (ts.isSpreadAssignment(prop)) {
      // A spread's source fields aren't visible statically — this is a known coverage
      // gap, named in `coverageLimits()` below, same shape as copy-lint's interpolation gap.
    }
  }
}

/**
 * Find every telemetry call site in one source file and the field names passed to it.
 *
 * @returns {Array<{callee: string, method: string, line: number, column: number, fields: Array}>}
 */
export function extractTelemetryCalls(source, filename = 'input.ts') {
  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const found = []

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const match = calleeMatch(node.expression)
      if (match) {
        const fields = []
        for (const arg of node.arguments) collectPropertyNames(arg, sourceFile, fields)
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        found.push({ callee: match.object, method: match.method, line: line + 1, column: character + 1, fields })
      }
    }
    ts.forEachChild(node, visit)
  }

  ts.forEachChild(sourceFile, visit)
  return found
}

/**
 * Check one source file's telemetry call sites for banned field names.
 *
 * @returns {{violations: Array, callsScanned: number}}
 */
export function checkSource(source, filename) {
  const calls = extractTelemetryCalls(source, filename)
  const violations = []
  for (const call of calls) {
    for (const field of call.fields) {
      if (BANNED_FIELD_NAMES.has(field.name.toLowerCase())) {
        violations.push({
          file: filename,
          line: field.line,
          column: field.column,
          callee: `${call.callee}.${call.method}`,
          field: field.name,
        })
      }
    }
  }
  return { violations, callsScanned: calls.length }
}

/**
 * Recursively check a parsed `datadog/` manifest (JSON) for banned keys, anywhere in
 * its structure — a monitor or dashboard query built from a banned field is just as
 * much a leak as a logger call, and manifests are reviewed as JSON diffs, not as code.
 *
 * @returns {Array<{path: string, key: string}>}
 */
export function checkManifestObject(obj, path = '$') {
  const violations = []
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => violations.push(...checkManifestObject(item, `${path}[${i}]`)))
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (BANNED_FIELD_NAMES.has(key.toLowerCase())) {
        violations.push({ path: `${path}.${key}`, key })
      }
      violations.push(...checkManifestObject(value, `${path}.${key}`))
    }
  }
  return violations
}

/** What this check cannot see (FR-018's sibling for this gate). */
export function coverageLimits() {
  return [
    'Spread fields: `logger.info(msg, { ...ctx })` — the keys `ctx` carries are not visible statically.',
    'Dynamic keys: a computed property name (`{ [someVar]: value }`) is not a string literal and is invisible.',
    'Free-text messages: the message argument itself is not scanned — only field names in the fields object.',
    'Indirection: wrapping a banned field one level through a helper function before it reaches logger/RUM is invisible.',
  ]
}

/** The whole report, in the shape `copy-lint`/`validate-poses` established. */
export function formatReport({ violations, manifestViolations, filesScanned, callsScanned }) {
  const out = []
  const total = violations.length + manifestViolations.length

  if (violations.length > 0) {
    out.push(`Telemetry call-site violations (${violations.length}):`)
    for (const v of violations) {
      out.push(`  ${v.file}:${v.line}:${v.column} — ${v.callee}(...) passes field "${v.field}"`)
    }
    out.push('')
  }
  if (manifestViolations.length > 0) {
    out.push(`Manifest violations (${manifestViolations.length}):`)
    for (const v of manifestViolations) {
      out.push(`  ${v.file} — ${v.path}`)
    }
    out.push('')
  }

  out.push(
    total === 0
      ? `✓ telemetry-check: ${callsScanned} call site(s) across ${filesScanned} file(s), no content-bearing fields.`
      : `✗ telemetry-check: ${total} violation(s) across ${filesScanned} file(s).`,
  )
  out.push('')
  out.push('What this check does NOT cover:')
  for (const limit of coverageLimits()) out.push(`  - ${limit}`)

  return out.join('\n')
}
