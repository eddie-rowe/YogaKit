# Contract: Auth Flows

Two distinct entry points, deliberately not unified (research.md item 3).

## `GET /auth/callback` — OAuth / PKCE (Google sign-in)

**Query params**: `code` (PKCE authorization code), `next` (optional post-auth redirect path).

**Behavior**:
1. Exchange `code` via `exchangeCodeForSession(code)` on the server client.
2. Validate `next`: MUST start with `/` and MUST NOT start with `//` (protocol-relative
   host bypass). Any other value → ignore and fall back to `/`.
3. On success: redirect to `next` (or `/`). On failure: redirect to `/auth/sign-in?error=…`
   with a generic error code, never the raw Supabase error text (avoids leaking
   implementation details to the client).

**Failure modes**: expired/invalid code → generic error redirect. Missing `code` →
400-equivalent redirect to sign-in.

## `GET /auth/confirm` — Email OTP link

**Query params**: `token_hash`, `type` (`email` | `recovery` | `invite`), `next` (optional).

**Behavior**:
1. Call `verifyOtp({ token_hash, type })` — never `exchangeCodeForSession` (research.md
   item 3: calling the wrong verifier fails silently, does not error visibly).
2. Same `next`-redirect validation as `/auth/callback`.
3. On success: session cookie is set by the server client; redirect to `next` (or `/`).
4. On failure: redirect to `/auth/sign-in?error=link_expired` (or similar generic code).

## Session refresh (`src/proxy.ts`)

Not a route handler — runs on every matching request.

**Behavior**:
1. Build the Supabase server client bound to the incoming request's cookies.
2. Call `getUser()` (never `getSession()` — see research.md item 2).
3. Return the **same** `response` object the Supabase client mutated with refreshed
   `Set-Cookie` headers — never construct a fresh `NextResponse`.

**Contract obligation for every consumer**: reading a saved flow from the IndexedDB cache
(the "6am test," RULE-L4) MUST NOT depend on this refresh succeeding. Session refresh
failure degrades write-capable UI (e.g., hides "save"), never blocks a read-only render.

**Verification**: a smoke test asserting the actual cookie value differs before/after a
request that crosses the refresh boundary — a green build proves nothing about this path
(research.md item 2).

## Sign-out

**Behavior**: standard Supabase `signOut()`, plus a client-side obligation (owned by a
later feature's IndexedDB layer, called out here since this is where sign-out is
initiated): clear all user-scoped IndexedDB stores on sign-out, so a shared/studio device
does not leak the previous user's cached data to the next session.
