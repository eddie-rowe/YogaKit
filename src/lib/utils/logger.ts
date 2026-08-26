// Structured logger — ported pattern, per specs/002-auth-tenancy-billing/research.md.
//
// RULE-L7 (constitution v3.0.0, Principle VI): telemetry carries page views, errors,
// and web vitals only — never pose/flow/note/journal content. This logger is the
// single chokepoint for server-side structured logs in the auth/tenancy/billing
// paths, so that constraint is enforced by convention here rather than re-derived at
// every call site: log event *types* and IDs, never user-authored text.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogFields {
  [key: string]: string | number | boolean | null | undefined
}

// Fields that must never appear in a log payload, checked defensively at the call
// site boundary — a caller passing one of these keys almost certainly meant to log
// user content, which this logger refuses to do.
const BANNED_FIELD_NAMES = new Set([
  'note',
  'notes',
  'journal',
  'reflection',
  'mood',
  'password',
  'token',
  'raw_token',
  'secret',
])

function assertSafeFields(fields: LogFields | undefined) {
  if (!fields) return
  for (const key of Object.keys(fields)) {
    if (BANNED_FIELD_NAMES.has(key.toLowerCase())) {
      throw new Error(
        `logger: refusing to log field "${key}" — looks like user content or a secret. ` +
          'RULE-L7 forbids transmitting pose/flow/note/journal content or credentials via telemetry.',
      )
    }
  }
}

function write(level: LogLevel, message: string, fields?: LogFields) {
  assertSafeFields(fields)
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  }
  // Plain JSON line — matched by Datadog log collection when deployed; readable
  // as-is in local dev.
  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => write('debug', message, fields),
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields) => write('error', message, fields),
}
