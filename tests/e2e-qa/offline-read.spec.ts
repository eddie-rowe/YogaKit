import { test, expect } from '@playwright/test'

// RULE-L2/L3/L4 — the "6am test": a flow already read on this device opens with no
// connection and no login. Asserted rather than asserted-about, because the two
// ways this breaks are both silent.
//
// The regression this guards is real and shipped: public/sw.js answered every GET
// cache-first, so a second visit served the previous build's document against the
// current build's hashed chunks. React found markup it did not recognise and never
// hydrated — the page rendered as bare server HTML and nothing was interactive.
// Content-visible is therefore not a sufficient assertion here; the test has to
// prove the page is *alive*. See FRICTION.md, 2026-08-31.

const VINYASA_ID = 'b79a753d-fc7c-42e7-8abc-10181fabdb12'

/** Waits for a service worker to reach `activated` and take control of the page.
 *  Without controller ownership, the next load goes straight to the network and
 *  the offline case is never actually exercised. */
async function waitForServiceWorker(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    async () => {
      if (!('serviceWorker' in navigator)) return false
      const registration = await navigator.serviceWorker.ready
      return registration.active?.state === 'activated' && navigator.serviceWorker.controller !== null
    },
    undefined,
    { timeout: 20_000 }
  )
}

/** Reads every count in one evaluate. Taken as separate Playwright calls they
 *  straddle a render and disagree with each other rather than with the page. */
async function countRendered(page: import('@playwright/test').Page) {
  return page.evaluate(() => ({
    items: document.querySelectorAll('[data-testid^="read-item-"]').length,
    marks: document.querySelectorAll('[data-testid="read-breath-mark"]').length,
    phases: document.querySelectorAll('[data-testid^="read-phase-"]').length,
  }))
}

test('the 6am test: a flow read once opens offline, and is interactive', async ({ page, context }) => {
  const hydrationErrors: string[] = []
  page.on('console', message => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (/hydrat|did not match|Minified React error/i.test(text)) hydrationErrors.push(text)
  })

  // First visit, online: this is what populates both caches — the document in the
  // shell cache, its hashed chunks in the asset cache.
  await page.goto(`/read/${VINYASA_ID}`)
  await expect(page.locator('[data-testid^="read-item-"]').first()).toBeVisible()
  await waitForServiceWorker(page)

  // A second online load, so the worker is unambiguously in control of this URL
  // and the document is in the cache rather than merely on its way there.
  await page.reload()
  await expect(page.locator('[data-testid^="read-item-"]').first()).toBeVisible()

  // The online baseline. Offline should render exactly this, whatever it is —
  // deliberately not a fixed number and not "every item has a breath mark",
  // because that invariant is currently false online too (53 items, 34 marks) and
  // belongs to walk4-read.spec.ts, which is where it already fails. Asserting it
  // here would make an offline regression indistinguishable from that one.
  const online = await countRendered(page)
  expect(online.items).toBeGreaterThan(10)

  await context.setOffline(true)
  await page.reload()

  // 1. The flow is there at all.
  const items = page.locator('[data-testid^="read-item-"]')
  await expect(items.first()).toBeVisible()
  expect(await items.count()).toBeGreaterThan(10)

  // 2. And all of it is there. A cached app shell standing in for the real
  //    document would render the frame with less content, so the comparison is
  //    against what this same URL rendered a moment ago with a network.
  const offline = await countRendered(page)
  expect(offline).toEqual(online)

  // 3. The page is interactive, which is the part the cache bug destroyed while
  //    leaving 1 and 2 looking fine. `read-print` calls window.print() from an
  //    onClick that exists only after hydration, so a stub that never fires means
  //    React never attached.
  await page.evaluate(() => {
    ;(window as unknown as { __printed: boolean }).__printed = false
    window.print = () => {
      ;(window as unknown as { __printed: boolean }).__printed = true
    }
  })
  await page.getByTestId('read-print').click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __printed: boolean }).__printed))
    .toBe(true)

  expect(hydrationErrors).toEqual([])

  await context.setOffline(false)
})

test('hashed assets are cache-first and documents are not', async ({ page }) => {
  await page.goto('/learn')
  await waitForServiceWorker(page)

  const caches = await page.evaluate(() => window.caches.keys())
  // Both caches exist and, critically, the poisoned v2 cache is gone: the activate
  // handler drops anything not in the current set, which is what evicts it from
  // installs already in the wild.
  expect(caches).toContain('krama-shell-v3')
  expect(caches.some(name => name === 'krama-v2')).toBe(false)

  // A navigation must reach the network when there is one — that is what makes a
  // deploy visible instead of requiring a manual cache bump.
  const documentRequests: string[] = []
  page.on('request', request => {
    if (request.resourceType() === 'document') documentRequests.push(request.url())
  })
  await page.reload()
  expect(documentRequests.length).toBeGreaterThan(0)
})
