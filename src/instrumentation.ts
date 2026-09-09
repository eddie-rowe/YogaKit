import { registerOTel } from '@vercel/otel'
import { normalizeServiceName } from '@/lib/dd-service-name'

const deploymentEnvironment =
  process.env.VERCEL_ENV === 'production'
    ? process.env.DD_ENV || 'prod'
    : process.env.VERCEL_ENV || 'development'

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
      // OTel renamed this semantic convention. Datadog maps the `.name` form to
      // the top-level `env` tag; the legacy key left Vercel spans at
      // `env:production` even when DD_ENV was `prod`.
      'deployment.environment.name': deploymentEnvironment,
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
        // Build/dev traffic used to pollute the service map with localhost, npm, and
        // Next.js telemetry dependencies. They are not production dependencies.
        ignoreUrls: ['localhost', '127.0.0.1', 'registry.npmjs.org', 'telemetry.nextjs.org'],
      },
    },
  })
}
