import { z } from 'zod'

// Environment schema — fails fast at boot, never logs values. A missing/malformed
// env var should be a loud startup crash with a clear message, not a runtime
// `undefined` surfacing three layers deep in a Supabase call.
// Ported pattern, per specs/002-auth-tenancy-billing/research.md ("Client & auth
// setup") and docs/design/002-schema.md §F.
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  // 32-byte key for the AES-256-GCM envelope in src/lib/crypto.ts, hex-encoded (64
  // chars) — not base64. Hex has one canonical form; base64 has multiple (+/ vs -_)
  // that can silently decode to the wrong byte length, per NextMove's crypto.ts.
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i, 'must be 64 hex characters (32 bytes)'),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | undefined

// Validates and returns process.env against the schema above. Throws synchronously
// on any missing/invalid variable — call this once, early, so a misconfigured
// deploy fails at boot rather than at first request. Deliberately never logs
// values: only field names go into the thrown message.
export function getEnv(): Env {
  if (cached) return cached
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const missingOrInvalid = parsed.error.issues.map((issue) => issue.path.join('.'))
    throw new Error(
      `Invalid environment configuration. Missing or invalid: ${missingOrInvalid.join(', ')}. ` +
        'See .env.example for the full list of required variables.',
    )
  }
  cached = parsed.data
  return cached
}
