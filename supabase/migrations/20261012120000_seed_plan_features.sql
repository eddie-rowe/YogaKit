-- T060: seed plan_features. Until this lands, `plan_features` is empty, and
-- `src/app/billing/checkout/route.ts:41` returns `unknown_plan` for *every*
-- plan_key — so checkout has never been reachable, for any plan.
--
-- The plan keys are the two the contract already names
-- (`specs/002-auth-tenancy-billing/contracts/entitlements-api.md:14-15`):
-- `pro` for an individual subscription, `org_seat` for a seat an organization
-- provides. Nothing here invents a third.
--
-- The feature keys are the four the constitution already enumerates as
-- gateable in RULE-O7: "composing, cloud sync, teacher dashboards, org seats".
-- That rule is also the boundary: it gates application *features* only, never
-- the pose/meridian/quote data files and never a person's ability to read a
-- flow or practice record they already own (RULE-O6/O7). So there is
-- deliberately no `pose_library` or `read_own_flows` feature key — those are
-- not purchasable, and a feature key existing for them would invite exactly
-- the gate the constitution forbids.
--
-- `org_seats` is the org's own capability to provision seats, so it belongs to
-- the plan an org buys, not to the seat a member receives. A seat-holder gets
-- composing, cloud sync and the teacher dashboard; it cannot re-provision
-- further seats.
--
-- Features are data precisely so a tier can be re-cut without a deploy
-- (`docs/design/002-schema.md:189-190`). Re-cutting is an INSERT/DELETE here,
-- not a code change.

insert into plan_features (plan_key, feature_key) values
  ('pro',      'composing'),
  ('pro',      'cloud_sync'),
  ('org_seat', 'composing'),
  ('org_seat', 'cloud_sync'),
  ('org_seat', 'teacher_dashboard')
on conflict (plan_key, feature_key) do nothing;
