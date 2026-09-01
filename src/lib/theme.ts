// Theme choice (006 FR-032/033).
//
// The palette must be right on *first paint*, and the constraint that shapes
// everything here is that src/app/layout.tsx is a synchronous server component
// that never calls cookies(). That is load-bearing: it keeps the 67 pose pages,
// /sequences/[id], /learn and /dimensions statically rendered and
// service-worker-cacheable, which is what the offline read path (RULE-L2/L3/L4)
// rests on. Reading the cookie server-side would make every page dynamic.
//
// So the cookie is read in the browser, by an inline script that runs before the
// body paints (PRE_PAINT_SCRIPT below), and the CSS in globals.css is written so
// that the *absence* of a stamped attribute is the correct, working default.

export type ThemeChoice = 'light' | 'dark' | 'system'

export const THEME_COOKIE = 'krama-theme'

/** A year. A theme preference has no reason to expire, and re-asking is worse
 *  than remembering. Not `Secure`, because it must also work on localhost, and
 *  not httpOnly, because the pre-paint script is the entire point. */
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system']

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === 'string' && (CHOICES as readonly string[]).includes(value)
}

/** FR-033: anything unrecognised — a stale value, a truncated cookie, someone
 *  editing it by hand — resolves to 'system', never to a broken palette. */
export function readThemeCookie(cookieString: string): ThemeChoice {
  const match = /(?:^|;\s*)krama-theme=([^;]*)/.exec(cookieString)
  if (!match) return 'system'
  let value: string
  try {
    value = decodeURIComponent(match[1])
  } catch {
    return 'system'
  }
  return isThemeChoice(value) ? value : 'system'
}

/** Stamps the document and persists the choice. 'system' *removes* the attribute
 *  rather than setting it, so the prefers-color-scheme media query in globals.css
 *  takes over again and keeps tracking the OS live. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement
  if (choice === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', choice)
  }
  document.cookie = `${THEME_COOKIE}=${choice}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`
}

/** Runs synchronously at the top of <body>, before anything paints. Deliberately
 *  tiny and dependency-free — it is inlined into the HTML, not bundled. The
 *  try/catch matters: a browser with cookies disabled throws on document.cookie
 *  access in some configurations, and a theme preference is never worth a blank
 *  page. */
export const PRE_PAINT_SCRIPT = `try{var m=/(?:^|;\\s*)krama-theme=([^;]*)/.exec(document.cookie);var v=m&&decodeURIComponent(m[1]);if(v==='dark'||v==='light')document.documentElement.setAttribute('data-theme',v)}catch(e){}`
