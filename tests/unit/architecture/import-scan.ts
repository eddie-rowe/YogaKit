// Shared by the import-graph guards (engine-isolation, no-supabase-on-read-path), so the
// two cannot drift on which import forms they see. A scanner that misses a form is a guard
// that passes on exactly the code it exists to catch.

// Static `import … from`, `export … from`, bare `import '…'`, dynamic `import('…')`, and
// `require('…')`.
const SPECIFIER =
  /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g

// Comments are stripped first: an apostrophe in `// don't` inside a multi-line import list
// would otherwise end the `[^'"]` run early and hide the whole import from SPECIFIER.
// (Naive: a `//` inside a string literal is also cut. That can only drop text after a
// specifier on the same line, never the specifier itself.)
const COMMENTS = /\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm

export function stripComments(text: string): string {
  return text.replace(COMMENTS, '$1')
}

/** Every module specifier in `text`, in source order, comments ignored. */
export function specifiersOf(text: string): string[] {
  const out: string[] = []
  for (const m of stripComments(text).matchAll(SPECIFIER)) out.push(m[1] ?? m[2] ?? m[3])
  return out
}
