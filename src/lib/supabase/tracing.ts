import { SpanKind, SpanStatusCode, trace, type Attributes } from '@opentelemetry/api'

const tracer = trace.getTracer('yogakit.supabase', '1.0.0')

// Database identifiers are code-owned schema, so they are safe telemetry. Keep an
// allow-list anyway: a future dynamic `.from(value)` must not turn user-authored text
// into an APM resource name or tag.
const DATABASE_RESOURCES = new Set([
  'claimed_flows',
  'entitlements',
  'flows',
  'integration_connections',
  'invitations',
  'memberships',
  'organizations',
  'profile_cards',
  'profiles',
])

const DATABASE_RPCS = new Set([
  'app_accept_invitation',
  'app_create_invitation',
  'app_create_organization',
  'app_delete_flow',
  'app_save_flow',
])

const METHOD_OPERATIONS: Record<string, string> = {
  DELETE: 'DELETE',
  GET: 'SELECT',
  HEAD: 'SELECT',
  PATCH: 'UPDATE',
  POST: 'INSERT',
  PUT: 'UPSERT',
}

interface SupabaseRequestDescription {
  name: string
  attributes: Attributes
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase()
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase()
  return 'GET'
}

function isUpsert(input: RequestInfo | URL, init?: RequestInit): boolean {
  const headers = new Headers(
    typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
  )
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value))
  }
  return headers.get('prefer')?.includes('resolution=merge-duplicates') ?? false
}

function safeResource(candidate: string | undefined, allowed: Set<string>): string {
  return candidate && allowed.has(candidate) ? candidate : 'unknown'
}

/**
 * Converts a Supabase Data API request into low-cardinality, content-free span data.
 * Query strings, bodies, object paths, auth headers, and response bodies are never
 * inspected or attached.
 */
export function describeSupabaseRequest(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  supabaseUrl: string,
): SupabaseRequestDescription | null {
  const base = new URL(supabaseUrl)
  const url = new URL(requestUrl(input), base)
  if (url.origin !== base.origin) return null

  const method = requestMethod(input, init)
  const common: Attributes = {
    'server.address': url.hostname,
    'http.request.method': method,
  }

  const rpcMatch = url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)/)
  if (rpcMatch) {
    const resource = safeResource(rpcMatch[1], DATABASE_RPCS)
    return {
      name: `supabase.postgrest CALL ${resource}`,
      attributes: {
        ...common,
        'supabase.component': 'postgrest',
        'db.system.name': 'postgresql',
        'db.namespace': 'postgres',
        'db.operation.name': 'CALL',
        'db.stored_procedure.name': resource,
      },
    }
  }

  const relationMatch = url.pathname.match(/^\/rest\/v1\/([^/]+)/)
  if (relationMatch) {
    const resource = safeResource(relationMatch[1], DATABASE_RESOURCES)
    const operation = method === 'POST' && isUpsert(input, init)
      ? 'UPSERT'
      : METHOD_OPERATIONS[method] ?? 'QUERY'
    return {
      name: `supabase.postgrest ${operation} ${resource}`,
      attributes: {
        ...common,
        'supabase.component': 'postgrest',
        'db.system.name': 'postgresql',
        'db.namespace': 'postgres',
        'db.operation.name': operation,
        'db.collection.name': resource,
      },
    }
  }

  const component = url.pathname.match(/^\/(auth|functions|realtime|storage)\/v1(?:\/|$)/)?.[1]
  if (!component) return null

  return {
    name: `supabase.${component} ${method}`,
    attributes: { ...common, 'supabase.component': component },
  }
}

/** Wraps the server-side Supabase transport in a child span of the active Next span. */
export function createTracedSupabaseFetch(supabaseUrl: string): typeof fetch {
  return async (input, init) => {
    const description = describeSupabaseRequest(input, init, supabaseUrl)
    if (!description) return fetch(input, init)

    return tracer.startActiveSpan(
      description.name,
      { kind: SpanKind.CLIENT, attributes: description.attributes },
      async (span) => {
        try {
          const response = await fetch(input, init)
          span.setAttribute('http.response.status_code', response.status)
          if (!response.ok) span.setStatus({ code: SpanStatusCode.ERROR })
          return response
        } catch (error) {
          // Do not record the exception message: fetch errors may contain a URL with
          // private query/path content. The stable constructor name is sufficient.
          span.setAttribute('error.type', error instanceof Error ? error.name : typeof error)
          span.setStatus({ code: SpanStatusCode.ERROR })
          throw error
        } finally {
          span.end()
        }
      },
    )
  }
}
