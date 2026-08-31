# Advisory Warnings

**YogaKit surface:** `src/app/compose/ComposeClient.tsx` (rendering), `src/lib/validator/lite.ts` (pure check logic); also reused for the same-class error state in `src/app/flows/FlowsClient.tsx` (`importError`). Testids: `validator-warning-laterality`, `validator-warning-closing-stillness`.
**Status:** built (Compose only)

## The interaction problem
Creation tools increasingly need to flag things that are *probably* wrong without asserting authority over the creator's intent — the tool can see a pattern (unbalanced sides, missing background contrast, a formula referencing an empty range) but not the creator's actual goal. The hard problem is making the flag legible and actionable at the moment it matters without training people to tune it out, and without the warning masquerading as a hard stop when it isn't one. Get the weight wrong in either direction — too loud and it reads as an error; too quiet and it's dead pixels — and the warning stops doing its job.

## Best in class

### 1. Grammarly — writing assistant, browser/desktop/Docs surface (current 2026 UI)
- **What they do:** Issues render as an underline in the flowing text itself, not a popup. The suggestion card only appears on hover/click of the underline, and offers three explicit actions: Accept, Dismiss, "Turn off suggestions like this." A count badge in the corner aggregates everything so the writer can batch-review instead of being interrupted per-issue.
- **Why it works:** The warning lives at the site of the problem (not a separate panel), stays silent until invited, and gives the user a durable way to lower the volume of a category they've decided not to care about — this is what prevents fatigue over long sessions.
- **Source:** https://support.grammarly.com/hc/en-us/articles/360003474732-Grammarly-Editor-user-guide

### 2. Figma — accessibility contrast checks via native tooling and plugins (2026)
- **What they do:** Contrast/WCAG failures are flagged in the color picker and via plugins (Stark, axe for Designers) as annotations layered on the canvas or handoff doc — never a blocking dialog. Designers can ship a frame with a failing contrast ratio; the flag persists as metadata for review rather than gating the save/export action.
- **Why it works:** Separating "this fails a rule" from "you may not proceed" lets craft and compliance review happen on their own timeline (e.g., at handoff or audit), matching how design work is actually reviewed — in passes, not gates.
- **Source:** https://medium.com/design-bootcamp/accessibility-checker-how-i-built-a-figma-plugin-to-audit-my-designs-9add0b60c1f4

### 3. VS Code + Error Lens — editor diagnostics, squiggle severity model (2026)
- **What they do:** Diagnostics render as colored squiggles (red = error, yellow/orange = warning, subtle dotted = hint) inline in the source, with Error Lens surfacing the message text at end-of-line so no hover is needed. Severity is configurable per-linter and per-viewer; none of it blocks compilation or running the code.
- **Why it works:** A three-tier visual vocabulary (error/warning/hint) lets the same channel carry different stakes without lying about which ones are blocking — the visual weight itself communicates "this is optional to fix," which keeps trust in the signal.
- **Source:** https://dev.to/_d7eb1c1703182e3ce1782/vs-code-extensions-for-productivity-in-2026-the-complete-developer-guide-2579

### 4. Google Sheets — data-validation "Show warning" vs "Reject input" (2026)
- **What they do:** Sheets' data-validation rules explicitly offer two enforcement modes: "Reject input" (hard block) and "Show warning" (an orange corner triangle appears, the value is kept, entry proceeds). This is a first-class, named distinction in the product, not an implementation detail.
- **Why it works:** Naming the non-blocking mode as a deliberate first-class option (rather than a degraded error) tells the user the tool *intends* for them to have final say — the mechanism itself communicates the constitution-style "the human decides" contract explicitly, which is the same guarantee validator-lite is trying to make implicit.
- **Source:** https://support.google.com/docs/thread/52689157

## Cross-cutting patterns
- Warnings render at the site of the problem (inline underline, cell corner, canvas annotation), not in a separate modal or toast that requires context-switching.
- A visual vocabulary distinguishes severity (error/warning/hint; reject/warn) so the same UI channel never has to lie about whether it blocks.
- Every best-in-class example gives a durable "quiet this" action (dismiss, turn off category, accept anyway) — warnings that can't be muted are the ones users learn to hate.
- Aggregation/batching (Grammarly's counter badge, Sheets keeping the flag on the cell) lets review happen later, on the creator's schedule, rather than forcing an interrupt now.
- None of the leading examples use red for a non-blocking warning; red is reserved for actual blocking failure, and warning color sits one notch down.

## Anti-patterns observed
- Excel/Sheets' native red-triangle error indicators are visually near-identical to the orange "Show warning" validation triangle in some themes, and users report not being able to tell the two apart or turn either off cell-by-cell — https://www.autovbax.com/learn/how-to/red-triangle-google-sheets.html — collapsing "this may be wrong" and "this is broken" into one visual class is exactly the failure mode validator-lite must avoid.
- Many linter setups ship every ESLint rule at `error` severity by default, so VS Code renders style nitpicks with the same red squiggle as a real bug — teams have had to file requests to shift severities down a notch (github.com/microsoft/vscode-eslint#1199) because the default made real errors indistinguishable from taste preferences, training developers to ignore red squiggles altogether.
- Grammarly's older per-issue popup-on-every-underline pattern (before hover-to-reveal cards) is widely cited as a canonical case of suggestion fatigue — enough flags fire per paragraph that users learn to click Accept/Dismiss reflexively rather than reading, which defeats the purpose of the check. *(This specific fatigue characterization is drawn from general product-writing on Grammarly's history rather than a single verified 2026 source — flagged as model knowledge, not confirmed by the searches above.)*

## Fold into YogaKit
- Give the two warning strings a visual channel distinct from `compose-save-error` (currently both use `.kk-warning` in `src/app/globals.css`) so a real save failure and an advisory craft note are never rendered identically — `quick win`.
- Add a per-warning dismiss (session-scoped, not persisted) so a teacher who's deliberately ending on a non-stillness pose isn't shown the same note every re-render of `ComposeClient.tsx`; `validateLite` in `src/lib/validator/lite.ts` would need to accept an ack-list or the component would filter by `w.code` client-side — `spec 00X` (needs a small interaction-state decision, likely 004-sequencing-composer).
- Render the warning at the flow item it concerns (anchor to `w.itemId`, e.g. a small marker beside the affected pose row) in addition to — or instead of — the current flat list above `sortedItems`, matching the "flag at the site of the problem" pattern from Grammarly/VS Code — `spec 00X`.
- Decide whether a second, lower-weight tier (a "hint" below "warning") is ever needed as validator-lite grows past two checks — `needs decision`, since constitution's one-accent rule constrains how many visually distinct non-blocking tiers YogaKit can support at all.

## Constitution check
- **Warnings-never-block (Principle III, RULE-S2):** current implementation already satisfies this — `validateLite` is a pure function with no gating return value, and the render comment in `ComposeClient.tsx` states "never block save" explicitly. Any dismiss/anchor change above must preserve that save/export paths never read `warnings`.
- **No-guilt/no-shame copy (Principle VII):** the two message strings ("...may be missing," "does not close on a stillness pose") are descriptive, not evaluative — this holds, but a per-item anchor UI (proposed above) must not add urgency language (e.g. no "fix this before sharing") when surfaced closer to the affected pose.
- **One-accent, typography-first design; no red/amber semantic colors beyond the one exception:** `.kk-warning` already uses a dedicated `--warning` token, which appears to be the codebase's one sanctioned exception — introducing a second visual tier (hint) or a distinct color for advisory-vs-error (bullet 1 above) needs explicit constitution sign-off, since it would add a second semantic color beyond that exception. `needs decision`.
- **≤200ms no-bounce motion:** not currently a concern since warnings render via plain `useMemo`-driven list diffing with no transition; a dismiss interaction (proposed above) must animate removal within that budget and without overshoot/bounce easing.
- **Testid contract:** `validator-warning-laterality` / `validator-warning-closing-stillness` are stable in `docs/krama-guardrails.md` and must survive any dismiss/anchor refactor — new markup (e.g., a per-item marker) should add new testids rather than repurposing these.
