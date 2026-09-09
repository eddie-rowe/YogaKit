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
      // ...but the rename alone was not enough. Vercel's OTel collector injects a
      // literal `env` attribute derived from VERCEL_ENV, and Datadog's OTel mapping
      // ranks a literal `env` above `deployment.environment.name` — so every span
      // landed on `env:production` while `custom.deployment.environment.name` read
      // `prod`. That split every APM query from RUM, whose tag is `env:prod`, and it
      // is what `npm run datadog:validate-live` reports as "metric has no env:prod
      // series". Setting `env` here is the only key that reaches the tag Datadog
      // actually filters on. `env:prod` is load-bearing in every manifest under
      // `datadog/` (see docs/OBSERVABILITY.md §2), so one environment must have
      // exactly one env value.
      env: deploymentEnvironment,
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
        // Build/dev traffic used to pollute the service map with localhost, npm, and
        // Next.js telemetry dependencies. They are not production dependencies.
        ignoreUrls: ['localhost', '127.0.0.1', 'registry.npmjs.org', 'telemetry.nextjs.org'],
      },
    },
  })
}
