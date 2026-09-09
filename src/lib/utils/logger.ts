// Structured logger — ported pattern, per specs/002-auth-tenancy-billing/research.md.
//
// RULE-L7 (constitution v3.0.0, Principle VI): telemetry carries page views, errors,
// and web vitals only — never pose/flow/note/journal content. This logger is the
// single chokepoint for server-side structured logs in the auth/tenancy/billing
// paths, so that constraint is enforced by convention here rather than re-derived at
// every call site: log event *types* and IDs, never user-authored text.
//
// 008 US2 extends this with two things a Datadog-connected routine needs to read
// production health unattended: `dd.trace_id`/`dd.span_id` so a log line correlates
// to the OTel span registered in src/instrumentation.ts, and a top-level `error.*`
// shape (`error(...)` below) rather than fields nested under a generic bucket —
// NextMove's issue #77 found that nested error fields produce a log line but no
// Datadog Error Tracking issue.

import { trace } from '@opentelemetry/api'
import { scrubErrorMessage, scrubErrorStack } from '@/lib/telemetry/scrub'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogFields {
  [key: string]: string | number | boolean | null | undefined
}

export interface LoggedError {
  kind: string
  message: string
  stack?: string
}

// Pulls trace/span IDs off the currently active OTel span, if any. Returns an empty
// object outside a traced request (e.g. a local script) — never throws, since a
// logger call must never be the reason a request fails.
function traceContext(): LogFields {
  const span = trace.getActiveSpan()
  if (!span) return {}
  const ctx = span.spanContext()
  return { 'dd.trace_id': ctx.traceId, 'dd.span_id': ctx.spanId }
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
  'email',
  'to',
  'recipient',
  'error',
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

function write(level: LogLevel, message: string, fields?: LogFields, error?: LoggedError) {
  assertSafeFields(fields)
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'yogakit',
    env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
    version:
      process.env.DD_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || '0.1.0',
    ...traceContext(),
    ...fields,
    // Top-level, not nested — Datadog Error Tracking only groups an error.* shape
    // it finds at the root of the log payload.
    ...(error ? { error } : {}),
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

// Builds the top-level error.* shape from a caught value. `kind` is the
// constructor/error-name identifier — never the message of an arbitrary thrown
// value, which could carry user content and is exactly what assertSafeFields exists
// to catch if passed as a regular field instead.
function toLoggedError(err: unknown): LoggedError {
  if (err instanceof Error) {
    return {
      kind: err.name,
      message: scrubErrorMessage(err.message),
      stack: scrubErrorStack(err.stack),
    }
  }
  return { kind: 'UnknownError', message: '[redacted]' }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => write('debug', message, fields),
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields, err?: unknown) =>
    write('error', message, fields, err !== undefined ? toLoggedError(err) : undefined),
}
