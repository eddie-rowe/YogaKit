import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

// public/sw.js is not importable — it is a classic service-worker script served
// verbatim, with no module boundary and no seam. So it is loaded into a fake
// worker global instead, which is enough to assert the thing that actually broke.
//
// This is deliberately a unit test rather than a Playwright one. The regression
// (FRICTION.md, 2026-08-31) is a *cross-build* mismatch: a document cached from
// build A served against build B's hashed chunks. A browser test in a fresh
// context only ever has one build, so it cannot reproduce it — tests/e2e-qa/
// offline-read.spec.ts passes against the old cache-first worker too, and was
// verified to. What distinguishes the two workers is the strategy per request
// type, and that is what is asserted here.

const SW_SOURCE = readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8')

const ORIGIN = 'https://krama.test'

interface FakeCache {
  store: Map<string, string>
  match: (request: FakeRequest) => Promise<string | undefined>
  put: (request: FakeRequest, response: unknown) => Promise<void>
  addAll: (urls: string[]) => Promise<void>
}

interface FakeRequest {
  url: string
  method: string
  mode: string
}

function request(url: string, init: Partial<FakeRequest> = {}): FakeRequest {
  return { url: `${ORIGIN}${url}`, method: 'GET', mode: 'no-cors', ...init }
}

/** Boots sw.js against a fake worker global and returns the captured listeners
 *  plus the fakes, so a test can drive one event and inspect the fallout. */
function bootWorker(options: {
  caches?: Record<string, string[]>
  fetch?: (request: FakeRequest) => Promise<unknown>
} = {}) {
  const cacheStores = new Map<string, FakeCache>()

  function makeCache(name: string): FakeCache {
    const store = new Map<string, string>()
    for (const url of options.caches?.[name] ?? []) store.set(`${ORIGIN}${url}`, `cached:${url}`)
    const cache: FakeCache = {
      store,
      match: async req => store.get(req.url),
      put: async (req, response) => {
        store.set(req.url, `put:${(response as { body: string }).body}`)
      },
      addAll: async urls => {
        for (const url of urls) store.set(`${ORIGIN}${url}`, `precached:${url}`)
      },
    }
    return cache
  }

  for (const name of Object.keys(options.caches ?? {})) cacheStores.set(name, makeCache(name))

  const cachesApi = {
    open: vi.fn(async (name: string) => {
      if (!cacheStores.has(name)) cacheStores.set(name, makeCache(name))
      return cacheStores.get(name)!
    }),
    keys: vi.fn(async () => [...cacheStores.keys()]),
    delete: vi.fn(async (name: string) => cacheStores.delete(name)),
    match: vi.fn(async (req: FakeRequest | string) => {
      const url = typeof req === 'string' ? `${ORIGIN}${req}` : req.url
      for (const cache of cacheStores.values()) {
        const hit = cache.store.get(url)
        if (hit) return hit
      }
      return undefined
    }),
  }

  const fetchMock = vi.fn(
    options.fetch ??
      (async (req: FakeRequest) => ({
        ok: true,
        type: 'basic',
        body: req.url,
        clone: () => ({ body: req.url }),
      }))
  )

  const listeners = new Map<string, (event: unknown) => void>()
  const self = {
    addEventListener: (name: string, handler: (event: unknown) => void) => listeners.set(name, handler),
    location: { origin: ORIGIN },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  }

  const ResponseStub = { error: () => ({ ok: false, type: 'error', body: 'ERROR' }) }

  new Function('self', 'caches', 'fetch', 'Response', 'URL', SW_SOURCE)(
    self,
    cachesApi,
    fetchMock,
    ResponseStub,
    URL
  )

  return { listeners, cachesApi, fetchMock, cacheStores, self }
}

/** Drives a fetch event and returns what the worker chose to respond with, or
 *  `undefined` when it declined to intercept at all. */
async function handleFetch(
  worker: ReturnType<typeof bootWorker>,
  req: FakeRequest
): Promise<{ intercepted: boolean; response?: unknown }> {
  const handler = worker.listeners.get('fetch')!
  let responded: Promise<unknown> | undefined
  const waits: Promise<unknown>[] = []
  handler({
    request: req,
    respondWith: (value: Promise<unknown>) => {
      responded = value
    },
    waitUntil: (value: Promise<unknown>) => {
      waits.push(value)
    },
  })
  if (!responded) return { intercepted: false }
  const response = await responded
  await Promise.all(waits)
  return { intercepted: true, response }
}

describe('service worker strategy', () => {
  it('serves a navigation from the network even when a cached copy exists', async () => {
    // The regression, stated as a test: with cache-first, a cached document wins
    // and the page gets build A's HTML against build B's chunks.
    const worker = bootWorker({ caches: { 'krama-shell-v3': ['/read/abc'] } })
    const { intercepted, response } = await handleFetch(
      worker,
      request('/read/abc', { mode: 'navigate' })
    )

    expect(intercepted).toBe(true)
    expect(worker.fetchMock).toHaveBeenCalledOnce()
    expect((response as { body: string }).body).toBe(`${ORIGIN}/read/abc`)
    expect(response).not.toBe('cached:/read/abc')
  })

  it('falls back to the cached document when the network is gone — the 6am test', async () => {
    const worker = bootWorker({
      caches: { 'krama-shell-v3': ['/read/abc'] },
      fetch: async () => {
        throw new Error('offline')
      },
    })
    const { response } = await handleFetch(worker, request('/read/abc', { mode: 'navigate' }))
    expect(response).toBe('cached:/read/abc')
  })

  it('falls back to the app shell for an uncached page when offline', async () => {
    const worker = bootWorker({
      caches: { 'krama-shell-v3': ['/'] },
      fetch: async () => {
        throw new Error('offline')
      },
    })
    const { response } = await handleFetch(worker, request('/read/never-seen', { mode: 'navigate' }))
    expect(response).toBe('cached:/')
  })

  it('serves a hashed asset from cache without touching the network', async () => {
    const worker = bootWorker({ caches: { 'krama-assets-v3': ['/_next/static/chunks/main.js'] } })
    const { response } = await handleFetch(worker, request('/_next/static/chunks/main.js'))

    expect(response).toBe('cached:/_next/static/chunks/main.js')
    expect(worker.fetchMock).not.toHaveBeenCalled()
  })

  it('puts a fetched hashed asset in the asset cache, not the shell cache', async () => {
    const worker = bootWorker()
    await handleFetch(worker, request('/_next/static/chunks/main.js'))

    expect(worker.cacheStores.get('krama-assets-v3')?.store.size).toBe(1)
    expect(worker.cacheStores.get('krama-shell-v3')).toBeUndefined()
  })

  it.each([
    ['an API route', '/api/generate'],
    ['an auth route', '/auth/callback'],
  ])('does not intercept %s', async (_label, pathname) => {
    const worker = bootWorker()
    const { intercepted } = await handleFetch(worker, request(pathname))
    expect(intercepted).toBe(false)
  })

  it('does not intercept a cross-origin request', async () => {
    const worker = bootWorker()
    const { intercepted } = await handleFetch(worker, {
      url: 'https://xyz.supabase.co/auth/v1/user',
      method: 'GET',
      mode: 'cors',
    })
    expect(intercepted).toBe(false)
  })

  it('does not intercept a non-GET request', async () => {
    const worker = bootWorker()
    const { intercepted } = await handleFetch(worker, request('/flows', { method: 'POST' }))
    expect(intercepted).toBe(false)
  })

  it('never caches a failed or opaque response', async () => {
    const worker = bootWorker({
      fetch: async () => ({ ok: false, type: 'basic', body: 'nope', clone: () => ({ body: 'nope' }) }),
    })
    await handleFetch(worker, request('/manifest.json'))
    for (const cache of worker.cacheStores.values()) expect(cache.store.size).toBe(0)
  })

  it('evicts the poisoned krama-v2 cache on activate, and keeps the current two', async () => {
    const worker = bootWorker({
      caches: { 'krama-v2': ['/'], 'krama-shell-v3': ['/'], 'krama-assets-v3': [] },
    })
    const waits: Promise<unknown>[] = []
    worker.listeners.get('activate')!({ waitUntil: (p: Promise<unknown>) => waits.push(p) })
    await Promise.all(waits)

    expect(worker.cachesApi.delete).toHaveBeenCalledWith('krama-v2')
    expect(worker.cachesApi.delete).not.toHaveBeenCalledWith('krama-shell-v3')
    expect(worker.cachesApi.delete).not.toHaveBeenCalledWith('krama-assets-v3')
  })

  it('precaches the app shell on install', async () => {
    const worker = bootWorker()
    const waits: Promise<unknown>[] = []
    worker.listeners.get('install')!({ waitUntil: (p: Promise<unknown>) => waits.push(p) })
    await Promise.all(waits)

    const shell = worker.cacheStores.get('krama-shell-v3')!
    expect(shell.store.has(`${ORIGIN}/`)).toBe(true)
    expect(shell.store.has(`${ORIGIN}/poses`)).toBe(true)
    expect(worker.self.skipWaiting).toHaveBeenCalled()
  })
})
