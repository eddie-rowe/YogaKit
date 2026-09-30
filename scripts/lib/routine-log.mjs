// Pure validation for docs/planning/routine-log.md (007 T009, FR-030/FR-035). The
// filesystem is injected so the rules can be tested by handing in a string; the CLI in
// scripts/validate-routine-log.mjs supplies the real one. See the CLI header for why
// the #48 guardrail exists and what it cannot catch.

// One entry per routine that self-reports a run in routine-log.md. `artifacts` returns
// candidate paths (repo-root-relative) for a given date; the line passes if at least
// one exists. Kept in sync with docs/planning/routines.md's File layout convention.
// `reflections` is the list of per-issue reflection files for that date (/autodev's
// Step 3 artifact), supplied by the caller.
export const ROUTINE_ARTIFACTS = {
  autoobs: date => [`docs/observation/autoobs/${date}.md`],
  autopm: date => [`docs/planning/autopm/${date}.md`],
  autoretro: date => [`docs/planning/retro/${date}.md`],
  // Either the handoff file (autodev.md Step 5) or a per-issue reflection (Step 3) is
  // acceptable first-party evidence.
  autodev: (date, reflections) => [`docs/planning/autopm/autodev-handoff-${date}.md`, ...reflections],
}

export const ROUTINE_LINE = /^(\d{4}-\d{2}-\d{2})(?: \d{2}:\d{2})? \/(\w+) \[/
// A manual/interactive-session correction line — annotated as such, not a routine
// self-report, so it is exempt from the artifact check.
export const ANNOTATION_LINE = /^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})? \[/

/**
 * @param {{ text: string | null, exists: (p: string) => boolean, reflectionsFor: (date: string) => string[] }} input
 *   `text` is null when the log file does not exist.
 * @returns {{ errors: string[], warnings: string[], lineCount: number, missing?: boolean }}
 */
export function validateRoutineLog({ text, exists, reflectionsFor }) {
  if (text === null) return { errors: [], warnings: [], lineCount: 0, missing: true }

  const lines = text
    .split('\n')
    .map((line, i) => ({ text: line, num: i + 1 }))
    .filter(({ text: t }) => /^\d{4}-\d{2}-\d{2}/.test(t)) // only dated entries; skip prose/header

  const errors = []
  const warnings = []

  for (const { text: line, num } of lines) {
    if (ANNOTATION_LINE.test(line)) continue

    const match = ROUTINE_LINE.exec(line)
    if (!match) {
      errors.push(
        `❌ routine-log.md:${num}: does not match the documented run format or the annotation format:\n   ${line}`
      )
      continue
    }

    const [, date, routine] = match
    const candidatesFor = ROUTINE_ARTIFACTS[routine]
    if (!candidatesFor) {
      // Unknown routine name — flagged so a typo'd or renamed routine doesn't silently
      // stop being checked.
      warnings.push(
        `⚠️  routine-log.md:${num}: unrecognized routine "/${routine}" — add it to ROUTINE_ARTIFACTS or fix the name.`
      )
      continue
    }

    const paths = candidatesFor(date, reflectionsFor(date))
    if (!paths.some(exists)) {
      errors.push(
        [
          `❌ routine-log.md:${num}: /${routine} claims a run on ${date} but none of its first-party artifacts exist:`,
          ...paths.map(p => `   - ${p}`),
          `   This is the #48 guardrail — no routine may be credited with a run it has no evidence for.`,
        ].join('\n')
      )
    }
  }

  return { errors, warnings, lineCount: lines.length }
}
