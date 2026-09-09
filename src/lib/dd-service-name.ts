// Ported from NextMove's src/lib/dd-utils.ts (docs/BEST_PRACTICES_FROM_NEXTMOVE.md
// §B5). Every manifest in datadog/monitors/*.json queries `service:yogakit` — a
// hyphenated DD_SERVICE (e.g. "yoga-kit", which was this app's own Vercel project slug
// until the project was renamed to "yogakit") would silently break every one of those
// queries. Normalizing here, at the one
// place service name reaches the OTel SDK, means the failure mode is a loud warning
// at boot rather than a monitor that quietly never fires.
const DEFAULT_SERVICE_NAME = 'yogakit'

export function normalizeServiceName(raw: string | undefined): string {
  const value = raw || DEFAULT_SERVICE_NAME
  if (value.includes('-')) {
    console.warn(
      `[yogakit] DD_SERVICE="${value}" contains a hyphen — monitors expect "${DEFAULT_SERVICE_NAME}". Using "${DEFAULT_SERVICE_NAME}" as fallback. Fix DD_SERVICE in Vercel.`,
    )
    return DEFAULT_SERVICE_NAME
  }
  return value
}
