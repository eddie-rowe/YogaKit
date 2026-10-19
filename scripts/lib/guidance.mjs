// Pure validation for the guidance corpus in data/guidance/*.md (005 US6, T059/T060,
// FR-036..FR-038). Files are injected as `{ file, text }` so the rules can be tested by
// handing in a string; the CLI in scripts/validate-guidance.mjs supplies the real ones.
//
// This validates structure only. No entry body is authored until the tone contract
// (contracts/guidance-tone.md, T007) is signed off, so an empty corpus is valid.

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function unquote(v) {
  return v.replace(/^(["'])(.*)\1$/, '$2')
}

/** The frontmatter lines of a file, or null when there is no closed `---` block. */
function frontmatter(text) {
  const lines = text.split(/\r?\n/)
  if (lines[0] !== '---') return null
  const end = lines.indexOf('---', 1)
  return end === -1 ? null : lines.slice(1, end)
}

/**
 * @param {{ file: string, text: string }[]} entries
 * @returns {{ errors: string[], count: number }}
 */
export function validateGuidance(entries) {
  const errors = []
  const priorityOwners = new Map() // priority -> files

  for (const { file, text } of entries) {
    const fm = frontmatter(text)
    if (!fm) {
      errors.push(`${file}: no frontmatter block (expected --- ... --- at the top)`)
      continue
    }

    const triggerValues = []
    let multi = false // a `triggers` key, or a list under `trigger`
    let priority
    for (let i = 0; i < fm.length; i++) {
      const m = /^([A-Za-z_]+):\s*(.*)$/.exec(fm[i])
      if (!m) continue
      const [, key, raw] = m
      const value = unquote(raw.trim())
      if (key === 'triggers') multi = true
      else if (key === 'trigger') {
        if (value === '' && /^\s+-/.test(fm[i + 1] ?? '')) multi = true
        else triggerValues.push(value)
      } else if (key === 'priority') priority = value
    }

    const named = triggerValues.filter(v => v !== '')
    if (multi || triggerValues.length > 1 || named.some(v => v.includes(','))) {
      errors.push(`${file}: an entry needs exactly one trigger (FR-036)`)
    } else if (named.length === 0) {
      errors.push(`${file}: trigger is missing (FR-036)`)
    } else if (!KEBAB.test(named[0])) {
      errors.push(`${file}: trigger "${named[0]}" must be a kebab-case identifier`)
    }

    if (priority === undefined || priority === '') {
      errors.push(`${file}: priority is missing (FR-037)`)
    } else if (!/^\d+$/.test(priority)) {
      errors.push(`${file}: priority "${priority}" must be a non-negative integer`)
    } else {
      const n = Number(priority)
      priorityOwners.set(n, [...(priorityOwners.get(n) ?? []), file])
    }
  }

  for (const [n, files] of priorityOwners) {
    if (files.length > 1) errors.push(`duplicate priority ${n}: ${files.join(', ')} (FR-038)`)
  }

  return { errors, count: entries.length }
}
