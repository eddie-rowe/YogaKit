/**
 * Copy-lint: the pure half (009 US1).
 *
 * No filesystem, no process, no network — every export here is a function of its
 * arguments, so the rules are tested in memory rather than through temp-file fixtures.
 * The I/O lives in `scripts/copy-lint.mjs`. Same split as `scripts/lib/tier1-report.mjs`
 * and `scripts/validate-poses.mjs`, for the same reason.
 *
 * Extraction is done against the TypeScript AST rather than by grepping for quotes.
 * That is what makes FR-014 true rather than approximately true: an AST walk cannot
 * see a comment, an import specifier, or an identifier, because those are not string
 * literal nodes. A regex over the raw file would flag all three.
 *
 * Read `VOICE.md` §6 before trusting this. It states what the check cannot do, and
 * `coverageLimits()` below returns the same list so the script prints it every run.
 */

import ts from 'typescript'

/**
 * Directories scanned, relative to the repo root (FR-014's location-based scoping).
 * `src/lib` is deliberately absent: it holds the friction engine and validator-lite,
 * which author no copy, and scanning them would put lint noise on RULE-H6's path.
 */
export const SCAN_DIRS = ['src/app', 'src/components']

/** Extensions worth parsing. */
export const SCAN_EXTENSIONS = ['.ts', '.tsx']

/** Files excluded by name pattern — tests seed violations on purpose. */
export const EXCLUDED_PATTERNS = [/\.test\.tsx?$/, /\.spec\.tsx?$/, /\/__tests__\//]

/** The FR-016 exception marker. Requires a rule id and a stated reason. */
export const EXCEPTION_MARKER = 'copy-lint-ignore-next-line'

/**
 * JSX attributes whose values are never copy. Note what is *absent*: `alt`,
 * `aria-label`, `placeholder`, `title`, and `label` all carry text a person reads,
 * so they are scanned. Missing one of those is the likeliest way this list goes wrong.
 */
const TECHNICAL_ATTRIBUTES = new Set([
  'className', 'class', 'style', 'id', 'key', 'ref', 'href', 'src', 'srcSet', 'type',
  'name', 'htmlFor', 'role', 'target', 'rel', 'method', 'action', 'as', 'variant',
  'size', 'align', 'side', 'sideOffset', 'data-testid', 'testId', 'value', 'defaultValue',
  'viewBox', 'd', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin',
  'xmlns', 'transform', 'points', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'x2', 'y1', 'y2',
  'width', 'height', 'preserveAspectRatio', 'aria-controls', 'aria-labelledby',
  'aria-describedby', 'aria-hidden', 'autoComplete', 'inputMode', 'charSet', 'content',
])

/** Property/variable names whose string values are never copy. */
const TECHNICAL_IDENTIFIERS = new Set([
  'className', 'class', 'style', 'id', 'key', 'href', 'src', 'testId', 'slug', 'path',
  'route', 'url', 'icon', 'color', 'variant', 'type', 'kind', 'name', 'field', 'table',
  'column', 'event', 'method', 'selector', 'query', 'redirectTo', 'next',
])

/** Call expressions whose string arguments are class names, not copy. */
const TECHNICAL_CALLEES = new Set(['cn', 'clsx', 'classNames', 'cva', 'twMerge', 'require'])

/**
 * JSX text cannot contain a bare apostrophe — `react/no-unescaped-entities` requires
 * `&apos;` or `&rsquo;` — so without this every pattern containing an apostrophe would
 * silently never fire on the surface where most copy actually lives. Found by seeding a
 * violation and watching only half of it match.
 */
const ENTITIES = {
  '&apos;': "'", '&#39;': "'", '&rsquo;': '\u2019', '&lsquo;': '\u2018',
  '&quot;': '"', '&ldquo;': '\u201c', '&rdquo;': '\u201d',
  '&amp;': '&', '&nbsp;': ' ', '&mdash;': '\u2014', '&ndash;': '\u2013', '&hellip;': '\u2026',
}

export function decodeEntities(text) {
  return text.replace(/&(?:apos|#39|rsquo|lsquo|quot|ldquo|rdquo|amp|nbsp|mdash|ndash|hellip);/g,
    (m) => ENTITIES[m])
}

/**
 * Does this string look like prose a person reads, rather than a token?
 *
 * Two words minimum, each carrying at least two letters. Deliberately loose: the rule
 * patterns in `data/voice/voice-rules.json` are narrow phrases that a Tailwind class
 * string will not match anyway, so this gate exists mainly to keep the scanned-string
 * count in the report honest rather than to prevent false positives.
 */
export function looksLikeProse(text) {
  const trimmed = text.trim()
  if (trimmed.length < 4) return false
  if (/^[A-Z0-9_]+$/.test(trimmed)) return false
  if (/^(?:https?:|\/|\.\/|\.\.\/|#|@|data:)/.test(trimmed)) return false
  const words = trimmed.split(/\s+/).filter((w) => /[A-Za-z]{2}/.test(w))
  return words.length >= 2
}

function isTechnicalContext(node) {
  // `createSourceFile(..., setParentNodes = true)` guarantees a parent on every node
  // the walk reaches, so there is no null case to guard.
  const parent = node.parent

  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true
  if (ts.isModuleDeclaration(parent)) return true
  if (ts.isLiteralTypeNode(parent)) return true

  if (ts.isJsxAttribute(parent)) {
    return TECHNICAL_ATTRIBUTES.has(parent.name.getText())
  }
  if (ts.isJsxExpression(parent) && parent.parent && ts.isJsxAttribute(parent.parent)) {
    return TECHNICAL_ATTRIBUTES.has(parent.parent.name.getText())
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    const key = ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name)
      ? parent.name.text
      : null
    return key !== null && TECHNICAL_IDENTIFIERS.has(key)
  }
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return TECHNICAL_IDENTIFIERS.has(parent.name.text)
  }
  if (ts.isCallExpression(parent)) {
    const callee = parent.expression
    const calleeName = ts.isIdentifier(callee)
      ? callee.text
      : ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : null
    return calleeName !== null && TECHNICAL_CALLEES.has(calleeName)
  }
  // A property key is never copy, however it is written.
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true
  if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) return true

  return false
}

/**
 * Pull every user-facing string out of one TS/TSX source.
 *
 * @returns {Array<{text: string, line: number, column: number, kind: string}>}
 *   `line` is 1-based, to match every other tool a reader will paste it into.
 */
export function extractCopy(source, filename = 'input.tsx') {
  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const found = []

  const record = (raw, pos, kind) => {
    const text = decodeEntities(raw)
    if (!looksLikeProse(text)) return
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos)
    found.push({ text: text.trim(), line: line + 1, column: character + 1, kind })
  }

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      record(node.text, node.pos, 'jsx-text')
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isTechnicalContext(node)) record(node.text, node.getStart(sourceFile), 'string')
    } else if (ts.isTemplateExpression(node)) {
      // Only the literal fragments are visible. What the `${}` holes evaluate to is
      // exactly the coverage gap VOICE.md §6.1 names, and it is not guessed at here.
      if (!isTechnicalContext(node)) {
        record(node.head.text, node.head.getStart(sourceFile), 'template')
        for (const span of node.templateSpans) {
          record(span.literal.text, span.literal.getStart(sourceFile), 'template')
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  ts.forEachChild(sourceFile, visit)
  return found
}

/**
 * Find FR-016 exception markers.
 *
 * `// copy-lint-ignore-next-line VOICE-AI-TELLS — why this string is genuinely fine`
 *
 * A marker with no rule id, or no reason, is itself reported: an unexplained silence is
 * the failure mode an exception mechanism is supposed to prevent, not create.
 *
 * @returns {{exceptions: Map<number, {ruleId: string, reason: string}>, malformed: Array}}
 */
export function parseExceptions(source) {
  const exceptions = new Map()
  const malformed = []
  const lines = source.split('\n')

  lines.forEach((raw, index) => {
    const at = raw.indexOf(EXCEPTION_MARKER)
    if (at === -1) return
    const before = raw.slice(0, at)
    if (!/(?:\/\/|\/\*|\{\s*\/\*)\s*$/.test(before)) return

    const rest = raw.slice(at + EXCEPTION_MARKER.length).replace(/\*\/\s*\}?\s*$/, '').trim()
    const match = /^([A-Z][A-Z0-9-]+)\s+[—:-]?\s*(.+)$/.exec(rest)
    const line = index + 1

    if (!match) {
      malformed.push({
        line,
        reason: rest.length === 0
          ? 'marker has no rule id and no reason'
          : `marker must read "${EXCEPTION_MARKER} RULE-ID — reason", got "${rest}"`,
      })
      return
    }
    const [, ruleId, reason] = match
    if (reason.trim().length < 10) {
      malformed.push({ line, reason: `exception for ${ruleId} needs a real reason, got "${reason.trim()}"` })
      return
    }
    // Applies to the next line, hence 1-based `line + 1`.
    exceptions.set(line + 1, { ruleId, reason: reason.trim() })
  })

  return { exceptions, malformed }
}

/**
 * Turn the JSON rule set into matchers. Kept separate from `lintSource` so a caller
 * compiles once and lints many files, and so a malformed pattern surfaces immediately
 * rather than on whichever file happens to reach it first.
 */
export function compileRules(ruleSet) {
  return ruleSet.rules.map((rule) => {
    const patterns = (rule.patterns ?? []).map((p) => new RegExp(p, 'i'))
    const co = rule.coOccurrence
      ? {
          left: rule.coOccurrence.left.map((p) => new RegExp(p, 'i')),
          right: rule.coOccurrence.right.map((p) => new RegExp(p, 'i')),
        }
      : null

    return {
      id: rule.id,
      source: rule.source,
      title: rule.title,
      match(raw) {
        // Typographic apostrophes are the same word to a reader, so they are the same
        // word to the rules. The patterns are written with the straight form only.
        const text = raw.replace(/[\u2018\u2019]/g, "'")
        for (const re of patterns) {
          const m = re.exec(text)
          if (m) return m[0]
        }
        if (co) {
          const left = co.left.map((re) => re.exec(text)).find(Boolean)
          const right = co.right.map((re) => re.exec(text)).find(Boolean)
          if (left && right) return `${left[0]} … ${right[0]}`
        }
        return null
      },
    }
  })
}

/**
 * Lint one source file.
 *
 * @returns {{violations: Array, scanned: number, suppressed: Array, malformed: Array}}
 */
export function lintSource(source, filename, compiledRules) {
  const strings = extractCopy(source, filename)
  const { exceptions, malformed } = parseExceptions(source)
  const violations = []
  const suppressed = []

  for (const found of strings) {
    for (const rule of compiledRules) {
      const matched = rule.match(found.text)
      if (!matched) continue

      const exception = exceptions.get(found.line)
      if (exception && exception.ruleId === rule.id) {
        suppressed.push({ file: filename, ...found, ruleId: rule.id, reason: exception.reason })
        continue
      }
      violations.push({
        file: filename,
        line: found.line,
        column: found.column,
        ruleId: rule.id,
        ruleSource: rule.source,
        ruleTitle: rule.title,
        matched,
        text: found.text,
      })
    }
  }

  return { violations, scanned: strings.length, suppressed, malformed: malformed.map((m) => ({ file: filename, ...m })) }
}

/** One violation, formatted for a terminal (FR-013): where, which rule, and the words. */
export function formatViolation(v) {
  const quoted = v.text.length > 100 ? `${v.text.slice(0, 97)}…` : v.text
  return [
    `  ${v.file}:${v.line}:${v.column}`,
    `    ${v.ruleId} (${v.ruleSource}) — ${v.ruleTitle}`,
    `    matched: "${v.matched}"`,
    `    in:      "${quoted}"`,
  ].join('\n')
}

/**
 * What this check does not cover (FR-018). Printed on every run, pass or fail — a gate
 * trusted for more than it does is worse than no gate, and the only defence against that
 * is for the gate to say so out loud every time somebody watches it go green.
 */
export function coverageLimits() {
  return [
    'Interpolated copy: only the literal fragments of a template are read. A string assembled from variables is invisible.',
    'Location: only src/app and src/components are scanned. data/poses (authored content), migrations, and emails are not.',
    'Tone: condescension, false cheer, hedging, and second-person diagnosis all pass. Those are VOICE.md §1–§3b, enforced in review.',
    'Structure: a screen built from individually compliant strings can still read as a countdown. RULE-C2 is about experience, not substrings.',
    'Language: English only. Localised copy is entirely uncovered.',
  ]
}

/** The whole report, in the shape `validate-poses` established. */
export function formatReport({ violations, filesScanned, stringsScanned, suppressed, malformed, ruleCount }) {
  const out = []

  if (malformed.length > 0) {
    out.push(`Malformed exception markers (${malformed.length}):`)
    for (const m of malformed) out.push(`  ${m.file}:${m.line} — ${m.reason}`)
    out.push('')
  }

  if (violations.length > 0) {
    out.push(`Voice violations (${violations.length}):`)
    out.push('')
    for (const v of violations) {
      out.push(formatViolation(v))
      out.push('')
    }
  }

  out.push(
    violations.length === 0 && malformed.length === 0
      ? `✓ copy-lint: ${stringsScanned} strings in ${filesScanned} files, ${ruleCount} rules, no violations.`
      : `✗ copy-lint: ${violations.length} violation(s) and ${malformed.length} malformed marker(s) across ${filesScanned} files.`,
  )
  if (suppressed.length > 0) {
    out.push(`  ${suppressed.length} suppressed by an explicit, reasoned exception.`)
  }

  out.push('')
  out.push('What this check does NOT cover (VOICE.md §6):')
  for (const limit of coverageLimits()) out.push(`  - ${limit}`)

  return out.join('\n')
}
