// Shared by the import-graph guards (engine-isolation, no-supabase-on-read-path), so the
// two cannot drift on which import forms they see. A scanner that misses a form is a guard
// that passes on exactly the code it exists to catch.

/** Remove comments, leaving string and template literals intact.
 *
 *  This is a small lexer, not a regex, on purpose. A regex cannot tell `'image/*'` from the
 *  start of a block comment, so it deletes real code up to the next comment close and hides every
 *  import in between. The same goes for `'//cdn'`. Walking the text and skipping over
 *  literals is the only way a comment marker inside a string stays a string.
 *
 *  Known limit: a regex literal containing a quote (`/'/`) is read as opening a string.
 *  Nothing in the guarded directories does that, and the failure is a missed specifier
 *  after it on the same statement, not a crash. */
export function stripComments(text: string): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]
    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++
    } else if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2)
      i = end === -1 ? text.length : end + 2
      out += ' '
    } else if (ch === "'" || ch === '"' || ch === '`') {
      const start = i++
      while (i < text.length && text[i] !== ch) {
        if (text[i] === '\\') i++
        // An unterminated '…' or "…" ends at the line break; only a template spans lines.
        else if (text[i] === '\n' && ch !== '`') break
        i++
      }
      out += text.slice(start, ++i)
    } else {
      out += ch
      i++
    }
  }
  return out
}

// Static `import … from`, `export … from`, bare `import '…'`, dynamic `import('…')`, and
// `require('…')`. Quotes may be ', " or `. The dynamic forms do not require the closing
// paren, so `import('x', { with: … })` is seen. `\b` rather than `\s` after the keyword, so
// `import{a}from'x'` is seen too.
const SPECIFIER =
  /\b(?:import|export)\b[^'"`]*?\bfrom\s*['"`]([^'"`]+)['"`]|\bimport\s*['"`]([^'"`]+)['"`]|\b(?:import|require)\s*\(\s*['"`]([^'"`]+)['"`]/g

/** Every module specifier in `text`, in source order, comments ignored.
 *
 *  Not seen, by construction: a specifier that is not a literal (`import(name)`,
 *  `import('a' + 'b')`), and an import list that itself contains a quoted name
 *  (`import { 'a-b' as c } from '…'`). */
export function specifiersOf(text: string): string[] {
  const out: string[] = []
  for (const m of stripComments(text).matchAll(SPECIFIER)) out.push(m[1] ?? m[2] ?? m[3])
  return out
}
