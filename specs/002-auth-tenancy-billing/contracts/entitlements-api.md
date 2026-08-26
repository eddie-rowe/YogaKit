# Contract: Entitlement Resolution

## `app_entitlements(user_id uuid) → jsonb`

The single resolver every call site uses — no app code hand-rolls the union
(research.md item 6, Appendix D).

**Signature returns** (shape, not final column list):
```json
{
  "user_id": "uuid",
  "active": true,
  "sources": [
    { "type": "subscription", "plan_key": "pro", "current_period_end": "2026-09-26T00:00:00Z" },
    { "type": "seat", "org_id": "uuid", "plan_key": "org_seat" },
    { "type": "grant", "source": "cohort_graduation", "ends_at": "2026-11-24T00:00:00Z" }
  ],
  "features": ["compose.unlimited_flows", "sadhana.teacher_dashboard"]
}
```

**Auth (the escalation trap, research.md item 6)**: raises `insufficient_privilege`
unless `user_id = (SELECT auth.uid())` OR the calling role is `service_role`. This is
the single most safety-critical line in this feature and gets a dedicated CI assertion
(`tests/integration/rls/entitlements.test.ts` or equivalent SQL assertion in
`scripts/verify-migrations.sh`): a second authenticated user calling
`app_entitlements('<other-uuid>')` MUST fail, not return empty.

**Resolution logic** (union, per Appendix D):
1. An active `subscriptions` row for `user_id` (`status = 'active'` and
   `current_period_end > now()`, or `status = 'active'` mid-cycle per Stripe's model).
2. An active `seat_assignments` row for `user_id`.
3. Any `entitlement_grants` row for `user_id` where `now() BETWEEN starts_at AND ends_at`.

`features` is derived from `plan_features` rows matching whichever `plan_key`s are active
— data, not a code branch, so a tier can be re-cut without a deploy.

## Application wrapper — `src/lib/entitlements/index.ts`

**Contract**: wraps the RPC call in React `cache()` so a single request only pays for one
round trip regardless of how many components ask. Never caches across requests, and never
caches for enforcement purposes offline (Appendix D: "entitlements are never cached
offline for enforcement" — the DB policy is authoritative; a cached copy is UI-only,
and an offline user keeps their last-synced state rather than being locked out).

**Non-bypassable limits**: any limit that must not be exceeded by a forged request
(e.g., a free-tier flow-count cap) is NOT enforced only in this wrapper — it's also
encoded directly in the relevant table's `WITH CHECK` clause (owned by feature `004`,
called out here since the entitlement contract is what that check reads).

## Open-data guarantee (RULE-O6/O7, FR-017/FR-018)

**Never gated by `app_entitlements()` or any entitlement check**:
- Reading `data/poses/*.json` / the generated `poses` mirror table.
- Reading a flow the caller already owns (`user_id = (SELECT auth.uid())`), from cache
  or from Postgres.
- Any meridian/quote/open-data file under `data/`.

**CI assertion**: a test asserting the pose-library read path and the "read my own flow"
path never reference `app_entitlements` or any table gated by a plan/subscription check.
