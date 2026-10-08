# 006 US1 audit — shipped settings/account vs FR-001..FR-007 (T013)

Read-only audit of `src/app/settings/` and `src/app/account/page.tsx` at `main` (2026-10-08).
This is completion, not a rebuild (plan disagreement 1). No source changed.

| FR | Status | Evidence | Closed by |
|----|--------|----------|-----------|
| FR-001 single route, visible index, nothing URL-only | **partial** | Single route `src/app/settings/page.tsx`; `/account` redirects to it (`src/app/account/page.tsx:8`). Index is `nav[data-testid=settings-index]` (`SettingsClient.tsx:60-71`) built from `SECTIONS`. Gap: index filters by the local `visible` set, but section bodies are hand-placed JSX (`SettingsClient.tsx:73-167`), so index and body can drift. The `/org/new` entry (`:136`, `:160`) is reachable from the page but is not an indexed section. | T016 |
| FR-002 fixed section order | **partial** | `SECTIONS` array order matches the spec (`sections/Section.tsx:10-20`) and the index follows it. The body order is separately hard-coded and matches today only by hand. A parallel `visibleSections` exists in `src/lib/settings/sections.ts:44` (T014) but `SettingsClient` does not use it; the two lists name sections differently (`Data export and delete` vs `Your data`, `sections.ts:40`). | T016 |
| FR-003 org memberships absent (not disabled) with no org | **met** | `hasOrgs` gate, section not rendered (`SettingsClient.tsx:38`, `:116`) and filtered out of the index (`:41`). Gap in the shell only: the section has no role-change or leave affordance, see FR-007. | T016 (single source), T018 (shell) |
| FR-004 studio absent unless owner/admin | **met** | `isStudioLead` from `STUDIO_ROLES` (`page.tsx:185`, `:215`); gated in render (`SettingsClient.tsx:146`) and index (`:42`). Role is read once per server render, so a role change takes effect on next load (compatible with FR-039); not asserted by a test. | T019 |
| FR-005 studio names the governed org | **gap** | Studio body is a single `NotYet` paragraph (`SettingsClient.tsx:150-154`); it names no organization. `sections.ts` already carries `governedOrgs` (`:53`) but the UI does not consume it. | T017, T018 |
| FR-006 separation by spacing/hairlines/labels, one accent | **partial** | No second accent colour is used (`SettingsClient.tsx:147-149` comment; `Section` uses only `--muted`). Separation is the shared `space-y-10` only, with no hairline or distinguishing label. | T017 |
| FR-007 immovable settings say why | **partial** | `NotYet` states plain-language reasons for notifications, privacy, data delete, billing, studio (`SettingsClient.tsx:77-155`). No silently inert controls found; `ProfileSection` Save is disabled only while unchanged/saving (`ProfileSection.tsx:108`), which is feedback not an immovable setting. Gaps: notifications, data export/delete and org memberships are placeholders rather than the section shells T018 specifies; org rows show a role but no statement of what the account cannot change. | T018 |

## Cross-cutting notes

- **Two section lists.** `SECTIONS` (UI) and `visibleSections` (pure, tested in T015) must collapse to one; T016 should render from `visibleSections` and delete the local filter.
- **T020 prerequisite.** `page.tsx:190` redirects unauthenticated visitors to sign-in. Settings is a write surface, so this is acceptable, but cached personal preferences (appearance) must still render with defaults when storage is unavailable; `AppearanceSection.tsx` should be checked under T020 (FR-010, FR-036, RULE-L3/L4).
- **Testids.** Existing testids (`settings-index`, `settings-section-*`, `settings-orgs-list`, `settings-org-*`, `settings-org-new`, `settings-data-export`) must not change (US1 gate).
