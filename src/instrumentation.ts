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
      'service.version':
        process.env.DD_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || '0.1.0',
      'deployment.environment': process.env.DD_ENV || process.env.NODE_ENV || 'development',
    },
    instrumentationConfig: {
      fetch: {
        // Third parties reject an unrecognized `traceparent` header outright rather
        // than ignoring it — a lesson recorded in NextMove's instrumentation.ts.
        // Every outbound integration this app calls goes here.
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
