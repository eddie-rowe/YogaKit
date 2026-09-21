# Generate Checklists

Generates additional quality checklists for a spec: security, UX, ops, performance.

**Spec**: $ARGUMENTS (folder name like `001-daily-priority-briefing`, or empty for most recent)

---

## Steps

### 1. Read inputs

Read:
- `specs/$ARGUMENTS/spec.md`
- `specs/$ARGUMENTS/plan.md`
- `specs/$ARGUMENTS/data-model.md`
- `specs/$ARGUMENTS/contracts/*.md`
- `.specify/memory/constitution.md`
- `.specify/templates/checklist.md`
- `specs/$ARGUMENTS/checklists/` (existing checklists — do not regenerate what's there)

### 2. Generate `checklists/security.md`

```markdown
# Checklist: Security — {{feature}}

## Authentication & Authorization
- [ ] All new routes are protected by Supabase Auth (or explicitly public with rationale)
- [ ] RLS is enabled on every new table
- [ ] `get_user_business_id()` is used in all RLS policies (no bare `auth.uid()`)
- [ ] No business data is accessible without a valid `business_id` match

## Data handling
- [ ] No email body content is stored (only sender, subject, timestamp, thread metadata)
- [ ] OAuth tokens are encrypted at rest using `services/integrations/crypto.ts`
- [ ] Action tokens are opaque (32-byte base64url) — no PII in the token
- [ ] Expired/invalid tokens return a generic error page (no queue data leaked)
- [ ] All new `raw_data` JSONB columns exclude sensitive user content

## Input validation
- [ ] All new API endpoints validate input types and sizes
- [ ] Phone numbers are E.164-validated before storage
- [ ] Webhook payloads are HMAC-verified (Shopify, Stripe)

## Deletion & data rights
- [ ] Integration disconnect triggers cascade delete within 24h
- [ ] Owner account deletion triggers cascade delete of all business data
- [ ] Dismissed actions are restorable for 7 days, then permanently deleted
```

### 3. Generate `checklists/ux.md`

```markdown
# Checklist: UX — {{feature}}

## Interaction model (constitution Principle II)
- [ ] Every AI-generated recommendation implements all five parts: headline, narrative, evidence, folded justification, next step
- [ ] Evidence slot is text-first (amounts, dates, confidence) — charts only if temporal pattern cannot be expressed in prose
- [ ] Folded justification is collapsed by default and does not block the action

## Decision-first (constitution Principle I)
- [ ] Owner can identify what to do first within 10 seconds of opening the briefing (SC-010)
- [ ] No feature defaults to a data view when an action view is available
- [ ] Every briefing item includes a one-tap action button with a deep link

## Empty states
- [ ] "All clear" state shows a graceful message (not an empty list)
- [ ] Empty data day (< 4 weeks history): "still learning" footer shown
- [ ] No item state: does not fabricate low-value items

## Actionability
- [ ] All action buttons work without login (signed action tokens)
- [ ] Deep links land on the correct record in the source system
- [ ] Graceful fallback shown when deep link target has been deleted

## Mobile / PWA
- [ ] All interactive elements are tap-target compliant (≥ 44×44px)
- [ ] Swipe gestures work correctly on iOS Safari and Android Chrome
- [ ] PWA install prompt appears at the right moment (not immediately on first load)
- [ ] Briefing email renders correctly in Gmail mobile, Apple Mail, Outlook
```

### 4. Generate `checklists/ops.md`

```markdown
# Checklist: Ops — {{feature}}

## Observability (constitution Principle VI)
- [ ] Every new Inngest function wraps `logScope({ business_id, user_id, fn })`
- [ ] Every new provider call emits a Datadog metric tagged `provider:X outcome:success|failure`
- [ ] Failed briefing delivery pages on-call within 5 minutes
- [ ] All cron jobs emit structured logs: business_id, user_id, fn name, duration, outcome

## Reliability
- [ ] GPT-4o calls have a 30s timeout with a deterministic fallback template
- [ ] Email delivery retries up to 3 times before paging on-call
- [ ] Inngest function steps are ≤ 5 minutes each (constitutional constraint)
- [ ] Integration token refresh is automatic; disconnection is surfaced in-app not silently swallowed

## Deployment
- [ ] All new environment variables are documented in `.env.example`
- [ ] New Supabase migrations follow the naming convention: `YYYYMMDDHHMMSS_verb_noun.sql`
- [ ] Migrations are immutable (no `ALTER` of existing migration files)
- [ ] Datadog monitors exist for all new cron jobs

## Billing gates (constitution Principle VII)
- [ ] Free tier limits are enforced (2 integrations, weekly digest only)
- [ ] Pro features are unlocked immediately on successful Stripe payment
- [ ] Trial expiry reverts to Free (no lockout, no data loss)
```

### 5. Generate `checklists/performance.md`

```markdown
# Checklist: Performance — {{feature}}

## Pipeline
- [ ] Per-business pipeline (extract → score → narrate → render) completes within 60s p95
- [ ] Each Inngest step completes within 5 minutes
- [ ] Nightly sync is fan-out (parallel per business), not sequential

## Email delivery
- [ ] Morning briefing delivered within ±5 minutes of configured delivery time (SC-007)
- [ ] Email delivery retries are bounded (max 3) with exponential backoff

## PWA
- [ ] Time-to-Interactive < 3s on 4G (measure with Lighthouse)
- [ ] Action queue renders without waiting for fresh data (stale-while-revalidate pattern)
- [ ] Cash position snapshot loads from cache if fresh data is unavailable

## Database
- [ ] All FK columns are indexed
- [ ] `business_signals` queries filter on `business_id` first (uses the index)
- [ ] `action_queue` queries filter on `business_id` + `status` (compound index)
- [ ] No N+1 queries in the scoring or delivery layers
```

### 6. Report

Output the list of checklist files created. Note any items that are already marked as [x] based on what you read in the spec/plan (pre-fill where certain).

Suggested next command: `/tools:speckit:analyze $ARGUMENTS`
