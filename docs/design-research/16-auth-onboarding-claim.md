# Auth, Onboarding & Local-Data Claim

**YogaKit surface:** `src/app/auth/sign-in/SignInClient.tsx`, `src/app/auth/callback/route.ts`, `src/app/auth/confirm/route.ts`, `src/app/onboarding/ClaimFlowsPrompt.tsx`, `src/lib/auth/redirect.ts`
**Status:** built (Google OAuth + email OTP magic-link, PKCE callback, "claim your local flows" prompt); no sign-out button, no account/profile screen, auth absent from nav

## The interaction problem
An app that works fully offline before sign-up accumulates real, meaningful state (files, progress, drawings, streaks) tied to a device, not an identity. The moment a user finally signs up, that state becomes ambiguous: is it theirs now, was it always theirs, or is it about to vanish? The interaction has exactly one correct shape — ask explicitly, never assume — and most products get it wrong by either forcing the account first (killing the local-first promise) or merging/discarding silently (breaking trust).

## Best in class

### 1. Excalidraw — web app, verified current
- **What they do:** Drawings live in browser LocalStorage/IndexedDB with zero account. On upgrading to Excalidraw+, the app "auto-imports your Excalidraw.com scene to your new workspace" automatically; if it doesn't find it, the user can manually trigger the import via Menu → Save to → Excalidraw+.
- **Why it works:** the common case (one local scene, one new account) is handled without a prompt at all, but the mechanism is never silent-and-final — there's a visible, discoverable manual path when auto-detection misses, so nothing is unrecoverable.
- **Source:** https://plus.excalidraw.com/how-to-start

### 2. Linear — SaaS web/desktop, verified current (2026 docs)
- **What they do:** "Continue with Email" sends a login link and *also* surfaces a numeric code from the same email that can be pasted into an "Enter code" field on the original device — a built-in fallback for the classic magic-link failure mode (link opened on a different device than the one waiting to be signed in). Linear also offers passkeys as a first-class alternative to magic link, selectable per-workspace by admins.
- **Why it works:** it treats "check your email" as a moment with two recovery paths (click vs. paste-code), not one fragile one, and it doesn't force a single passwordless method — it offers a menu.
- **Source:** https://linear.app/docs/login-methods

### 3. Anytype — local-first workspace app, verified current (2026)
- **What they do:** Full account creation happens *without* email or phone — a 12-word recovery phrase generated on-device is the identity. Data stays local-first by default; cloud sync is additive, not a precondition for use, and canceling a subscription does not delete server-held content — it's retained until the user explicitly requests deletion.
- **Why it works:** ownership and reversibility are structural, not just a UI courtesy — the product cannot silently strand or delete a user's data because the architecture never made the server the source of truth.
- **Source:** https://doc.anytype.io/anytype/data/privacy-and-encryption

### 4. Duolingo — mobile app, anti-pattern reference (model knowledge, not independently verified against 2026 support docs beyond the search below)
- **What they do:** Guest/unauthenticated progress has no official, guaranteed claim-into-account flow. Support guidance is reactive ("contact support with a timeline and device type") rather than a first-class in-app "bring your progress in" moment, and there is no account-merge feature at all.
- **Why it's instructive as a negative example:** it shows what YogaKit's `ClaimFlowsPrompt` is deliberately avoiding — treating the claim decision as a support ticket instead of a first-run UI moment removes agency exactly when trust is most fragile.
- **Source:** https://duolingoguides.us/can-you-transfer-duolingo-progress-to-another-account/ (secondary/community source; Duolingo has no first-party page documenting this, which is itself the finding)

## Cross-cutting patterns
- The claim/merge decision is offered once, explicitly, with a visible yes/no — never inferred from context (Excalidraw's silent auto-import is the one exception, and it's reversible/discoverable, not destructive).
- Passwordless flows increasingly pair a link with a fallback (Linear's code, OTP-first designs elsewhere) because "click the link" fails silently across devices — a bare magic link with no recovery path is now considered incomplete UX, not sufficient.
- Local-first products (Anytype, and implicitly Obsidian's vault model) treat "no account required to read/use" as an architectural guarantee, not a launch feature that erodes once monetization arrives.
- The safest default when in doubt is defer-not-decide: a dismissible "not now" that can resurface later beats a forced binary choice blocking the rest of the app.
- Cross-device magic-link confusion ("I clicked it on my phone, my laptop still shows the login screen") is a known, named failure mode across passwordless implementations — worth an explicit UI state, not just an error page. (Model-knowledge synthesis from search summaries, not a single verified source.)

## Anti-patterns observed
- Silent discard or silent auto-adopt of local/guest state at sign-up (Duolingo's lack of any first-class claim flow is the clearest real-world example).
- Forcing account creation before any local value has been demonstrated — the opposite of what Excalidraw and Anytype both protect against structurally.
- A magic link with exactly one recovery path (click-only), leaving users stuck when the email is opened on a different device than the one waiting.

## Fold into YogaKit
- Add a **sign-out control** and minimal account surface — right now there is no way back out of a session anywhere in the nav. `quick win`
- In `SignInClient.tsx`, the email OTP path currently only shows "Check your email for a sign-in link" (line 87-89) with no fallback if the email doesn't arrive or is opened on another device; add a resend affordance and, longer-term, an OTP-code paste fallback like Linear's. `quick win` (resend) / `spec 006` (code fallback)
- `ClaimFlowsPrompt.tsx`'s "Not now" (`decide()`, lines 35-38) permanently sets `krama-claim-flows-decided` in `localStorage` with no way to revisit the decision later if the user changes their mind — add a settings-page re-entry point once an account screen exists. `spec 006`
- Consider Excalidraw's auto-import model for the *no-conflict* case (zero flows already in the account, flows only local): skip the prompt and just claim silently, reserving the explicit ask for when both local and remote flows already exist and could conflict. `needs decision` — this trades "never silent" for "silent-only-when-harmless," a real tension with the existing DECISIONS.md commitment to never auto-adopt.
- Surface auth entry points in the nav itself (sign-in/sign-out), not just as a standalone route — currently discoverable only by direct navigation. `spec 006`

## Constitution check
The claim flow already honors RULE-L3/L4: `ClaimFlowsPrompt` only *offers* to write to `claimed_flows` post sign-in and never blocks reading cached flows pre-signup, so the 6am test survives as built. Adding a sign-out button and account screen (spec 006) must preserve this — signing out must never clear or hide the IndexedDB-cached flows that were working offline before any account existed. The current copy ("Your practice stays yours — signing in just keeps it in sync") and the claim prompt's plain, solo-facing language ("this device," "your account") already avoid org/teacher language, which must hold as spec 002's tenancy model gets exposed in a future account UI — a personal practitioner should never see "workspace" or "team" framing. The proposed silent-auto-import shortcut above is the one idea here that cuts against the recorded "never silent adoption" decision and needs explicit sign-off, not a unilateral implementation, before it ships.
