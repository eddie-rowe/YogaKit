// Krama service worker — offline-first for the app shell, so a flow's read view
// (the 6am case) works with no connection.
const CACHE_VERSION = 'krama-v2'
const CACHE_NAME = CACHE_VERSION
const APP_SHELL = [
  '/',
  '/compose',
  '/flows',
  '/poses',
  '/learn',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  // Take over from any previous version immediately rather than waiting for all
  // tabs to close — deploys shouldn't be served stale indefinitely.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => {
          // Offline and not cached — for a page navigation (e.g. /read/[id]),
          // fall back to the shell rather than a browser error page.
          if (event.request.mode === 'navigate') return caches.match('/')
          return Response.error()
        })
    })
  )
})
