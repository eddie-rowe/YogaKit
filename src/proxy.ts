import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { getEnv } from '@/lib/env'

// Session refresh (docs/design/002-schema.md §F). NOT middleware.ts.
//
// Next.js 16 renamed Middleware to Proxy; `proxy.ts` is the canonical filename
// (Next 16.2.9 still recognizes `middleware.ts` too, but the wrong filename
// fails SILENTLY — no build error, no runtime error, just no session refresh,
// and Server Components quietly start rendering as anonymous). This file is
// the one place in the app that name has to be right.
//
// Two rules that matter here:
//   1. Call `getUser()`, never `getSession()`. Only getUser() revalidates the
//      JWT against Supabase and actually triggers a cookie refresh; getSession()
//      just trusts whatever is already in the cookie.
//   2. Return the SAME mutated `response` object that `setAll` wrote cookies
//      onto, not a fresh `NextResponse.next()` — a fresh response drops the
//      refreshed Set-Cookie header.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const env = getEnv()

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // Revalidates the JWT and refreshes the session cookie as a side effect.
  // Deliberately ignoring the return value here — this proxy only refreshes
  // the session; per-route auth gating (redirecting an unauthenticated user
  // away from a protected page) belongs to the route itself, not this file,
  // per the Proxy docs' guidance against using it as a full auth solution.
  await supabase.auth.getUser()

  return response
}

export const config = {
  // Run on every route except static assets and Next's internal image
  // pipeline — anywhere a Server Component might read the session needs a
  // fresh cookie by the time it renders.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
