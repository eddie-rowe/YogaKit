# Quickstart: Auth, Tenancy & Billing Foundation

## Local setup

```bash
# 1. Install deps (adds @supabase/supabase-js, @supabase/ssr, stripe, zod)
npm install

# 2. Start local Supabase (config.toml is committed — no manual project setup)
npx supabase start

# 3. Apply migrations
npx supabase db reset   # applies supabase/migrations/*.sql in order, from empty

# 4. Generate types and verify no drift
npm run db:types        # supabase gen types typescript > src/types/database.ts
npm run db:types:check  # CI-equivalent drift check, run it locally before committing

# 5. Env vars (see src/lib/env.ts for the full zod schema — fails fast at boot if missing)
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
# SUPABASE_SECRET_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, ENCRYPTION_KEY

# 6. Run the app
npm run dev
```

## RLS assertion suite (the thing that must not be wrong)

```bash
npm run test:rls   # scripts/verify-migrations.sh — applies migrations to a scratch
                    # Postgres, then runs assertions as SET ROLE authenticated with a
                    # forged request.jwt.claim.sub, asserting cross-tenant isolation
```

Run this before every migration-touching commit — it's the ported-and-hardened version
of NextMove's `scripts/verify-migrations.sh`, extended for the many-to-many org graph.

## Walking the One Om acceptance loop locally

1. Sign up as `owner@oneom.example` (email OTP or Google).
2. `app_create_organization('One Om School of Yoga', ARRAY['certifying_body'])`.
3. Create a cohort (`kind = 'ytt_200'`) under that org.
4. Invite `student@example.com` to the org with `roles = '{student}'` — grab the raw
   token from the dev email log (local Supabase's Inbucket UI, `http://localhost:54324`).
5. Sign up/sign in as `student@example.com`, visit `/org/invitations/accept?token=…`.
6. As the owner, call `app_grant_ytt_completion(cohort_id, student_user_id)` from the
   cohort roster UI — verify a `entitlement_grants` row appears with
   `ends_at = now() + 90 days`.
7. As the student, call `app_entitlements(student_user_id)` (via the app, not directly)
   — verify the grant appears in `sources`.
8. As the student, `app_revoke_signal_sharing(enrollment_id)` — verify the owner's
   cohort roster query for that student's signals returns zero rows immediately after.

## Solo-user regression check (must not break)

A v0.1 user with existing local IndexedDB flows and no organization:
1. Sign up with no org creation step.
2. Confirm the "claim your existing flows" prompt appears exactly once, and declining or
   accepting both leave the app usable afterward (FR-020).
3. Confirm reading an already-saved flow works with the network disabled (RULE-L4, the
   "6am test") — this must be true even for a brand-new account, since the account has
   the pre-migration local flows immediately.

## Stripe webhook local testing

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
stripe trigger checkout.session.completed   # fire the same event type twice — confirm
                                             # the SECOND delivery has a different event ID
                                             # (Stripe CLI doesn't replay the same ID; to
                                             # test true duplicate delivery, resend the
                                             # exact same payload+signature via curl)
```
