import { registerOTel } from '@vercel/otel'
import { normalizeServiceName } from '@/lib/dd-service-name'

// Boot-time setup. register() runs once per server instance before requests are
// served — 008 US2: OpenTelemetry tracing so `dd.trace_id` in structured logs
// (src/lib/utils/logger.ts) correlates to a real span, and so the read-view
// availability SLO (datadog/slos/read-view-availability.json) measures something
// server-side rather than only what RUM sees client-side.
export async function register() {
  registerOTel({
    serviceName: normalizeServiceName(process.env.DD_SERVICE),
    attributes: {
      'service.version': process.env.DD_VERSION || '1.0.0',
      'deployment.environment': process.env.DD_ENV || process.env.NODE_ENV || 'development',
    },
    instrumentationConfig: {
      fetch: {
        // Do not leak request context to third-party APIs. Supabase is traced by the
        // content-free wrapper in src/lib/supabase/tracing.ts; PostgREST does not carry
        // an incoming traceparent through to the SQL it generates, so propagation here
        // would not produce DBM correlation.
        dontPropagateContextUrls: [
          'api.stripe.com',
          'api.anthropic.com',
          'api.resend.com',
          'supabase.co',
        ],
        ignoreUrls: [],
      },
    },
  })
}
