# 006 US1 audit — shipped settings vs FR-001..FR-007 (T013)

Read-only audit of `src/app/settings/`, `src/app/account/page.tsx`, `src/lib/settings/sections.ts`
on `main` at `eebaa15`. No behaviour change; no testid changed.

| FR | Verdict | Evidence |
|----|---------|----------|
| FR-001 single route, visible index, no URL-only section | **Pass** | One route `src/app/settings/page.tsx`; index `<nav data-testid="settings-index">` built from `visibleSections` at `SettingsClient.tsx:176-187`; `/account` redirects to `/settings` (`account/page.tsx:9`). Every rendered section has an index anchor. |
| FR-002 fixed order | **Pass** | Order comes from `ALWAYS` + pushes in `src/lib/settings/sections.ts:34-55`; render loop `SettingsClient.tsx:189-191` iterates the same array, so index and body cannot drift. |
| FR-003 memberships only with ≥1 org, absent otherwise | **Pass** | `sections.ts:46-48`; solo account gets a plain "Teaching a group?" link instead (`SettingsClient.tsx:195-202`), not a disabled section. |
| FR-004 studio only for owner/admin | **Pass** | `sections.ts:49-54`. `roleOf` (`SettingsClient.tsx:43-47`) maps owner > admin > member. |
| FR-005 studio names the governed org(s) | **Gap** | The studio block rendered in `SettingsClient.tsx:150-160` is a static `NotYet` paragraph and ignores `governedOrgs`. The shell that does name the org (`sections/StudioSection.tsx:7-9`) is not imported by `SettingsClient`. Maps to **T017**. |
| FR-006 studio separation by spacing/hairlines/labels only, no second accent | **Partial** | No accent colour is introduced anywhere (only `var(--muted)`). The hairline treatment exists only in the unused `StudioSection.tsx:7` (`borderBottom`). Inline block has no hairline. Maps to **T017**. |
| FR-007 uneditable control states why | **Partial** | Inline `NotYet` text exists for notifications, privacy, data, billing, studio (`SettingsClient.tsx:77-159`). Shells `NotificationsSection`, `DataSection`, `OrgMembershipsSection`, `StudioSection` exist with `*-why` testids and unit tests (`tests/unit/settings/section-shells.test.tsx`) but are dead code in the shipped page, so the tested copy differs from the rendered copy. Maps to **T018**. |

## Other observations (no new issue needed)

- `sections/Section.tsx:9-20` exports a `SECTIONS` table whose ids (`security`, `orgs`) differ from
  `lib/settings/sections.ts` `SectionId`; `SettingsClient` bridges with `ANCHOR`
  (`SettingsClient.tsx:30`). Harmless; T018 should keep the DOM ids stable.
- `SettingsClient.tsx:70-161` has inconsistent indentation inside `rendered`; cosmetic.

## Gap → task map

- FR-005, FR-006 → T017 (#165)
- FR-007 → T018 (#166)
- No further follow-up issues required.
