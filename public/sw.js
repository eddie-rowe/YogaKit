// Krama service worker — offline-first for the app shell, so a flow's read view
// (the 6am case) works with no connection.
//
// Strategy is chosen per request type, and the reason is worth stating because the
// obvious simplification is what broke it. A single blanket cache-first handler
// (what this file did through v2) serves a *previous* build's HTML against the
// current build's hashed chunks, or the reverse. React then finds markup it does
// not recognise and never hydrates: the page renders as bare server HTML and
// nothing is interactive. In production the same shape makes a deploy invisible
// until someone bumps the version by hand. See FRICTION.md, 2026-08-31.
//
// So:
//   navigations      → network-first  (a document is only ever stale when offline)
//   /_next/static/*  → cache-first    (content-hashed URLs cannot go stale)
//   other same-origin→ stale-while-revalidate
//   cross-origin/API → not intercepted at all
//
// The two caches are separate on purpose. Hashed assets are keyed by content, so
// they stay valid across deploys and are worth keeping; documents are not, and are
// replaced on every successful navigation. Bumping CACHE_VERSION drops both, which
// is how the poisoned v2 entries get evicted from installs already in the wild.
const CACHE_VERSION = 'v3'
const SHELL_CACHE = `krama-shell-${CACHE_VERSION}`
const ASSET_CACHE = `krama-assets-${CACHE_VERSION}`
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE]

const APP_SHELL = [
  '/',
  '/compose',
  '/flows',
  '/poses',
  '/learn',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL))
  )
  // Take over from any previous version immediately rather than waiting for all
  // tabs to close — deploys shouldn't be served stale indefinitely.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !CURRENT_CACHES.includes(k)).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

/** Only same-origin GETs are ours to cache. Supabase, Datadog and Google Fonts
 *  must reach the network untouched: caching an auth response would serve one
 *  person's session to the next, and RUM is useless replayed from a cache. */
function isCacheable(request, url) {
  return (
    request.method === 'GET' &&
    url.origin === self.location.origin &&
    !url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/auth/')
  )
}

function isHashedAsset(url) {
  return url.pathname.startsWith('/_next/static/')
}

/** Clones synchronously, before the body can be consumed. `response.clone()` after
 *  an await throws once the browser has started reading the original — which is
 *  exactly what happens when the response has already been returned to the page.
 *  Returns the write promise (or null) so the caller can hand it to
 *  event.waitUntil and keep the worker alive until it lands. */
function put(cacheName, request, response) {
  // `basic` excludes opaque cross-origin responses.
  if (!response.ok || response.type !== 'basic') return null
  const clone = response.clone()
  return caches.open(cacheName).then((cache) => cache.put(request, clone))
}

/** Network-first. Used for navigations: online, you always get the document that
 *  matches the deployed build. Offline, you get the last one that succeeded —
 *  whose hashed chunks are still in ASSET_CACHE, because hashed URLs are stable. */
async function networkFirst(event) {
  const request = event.request
  try {
    const response = await fetch(request)
    const write = put(SHELL_CACHE, request, response)
    if (write) event.waitUntil(write)
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    // Not this exact URL, but the shell can still render — better than the
    // browser's offline error page for a flow someone opened at 6am.
    const shell = await caches.match('/')
    return shell ?? Response.error()
  }
}

/** Cache-first, for content-hashed URLs only. A hit is never stale by
 *  construction, which is what makes this safe here and unsafe everywhere else. */
async function cacheFirst(event) {
  const request = event.request
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  const write = put(ASSET_CACHE, request, response)
  if (write) event.waitUntil(write)
  return response
}

/** Stale-while-revalidate: answer from cache immediately, refresh in the
 *  background. For icons, the manifest, and anything else same-origin. */
async function staleWhileRevalidate(event) {
  const request = event.request
  const cached = await caches.match(request)

  const network = fetch(request)
    .then((response) => {
      const write = put(SHELL_CACHE, request, response)
      return write ? write.then(() => response) : response
    })
    .catch(() => null)

  // The revalidation must outlive the response when we answer from cache,
  // otherwise the worker can be shut down before the write completes and the
  // entry never refreshes.
  if (cached) {
    event.waitUntil(network)
    return cached
  }
  const response = await network
  return response ?? Response.error()
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (!isCacheable(event.request, url)) return

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event))
    return
  }
  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(event))
    return
  }
  event.respondWith(staleWhileRevalidate(event))
})
