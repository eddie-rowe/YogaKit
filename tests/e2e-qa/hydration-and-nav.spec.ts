import { test, expect } from '@playwright/test'

// #50 — encodes the three manual verifications #42/#43/#44 deferred (see
// docs/planning/routine-log.md 2026-09-22 manual-intake line). They were run once by
// hand and never made durable, so the same gap could reopen silently. This makes them
// permanent, CI-enforced checks instead.
//
// #44 rewrote storage-derived initial state (localStorage/sessionStorage/searchParams
// -> useState lazy initializers) across 9 client components, touching the same
// read/hydration path RULE-L3/L4 protects (see offline-read.spec.ts). A regression
// there would show up as a hydration-flash: a default/empty render followed by a
// second render once the stored value is read. React logs that mismatch to the
// console, so collecting console errors is the same durable signal
// offline-read.spec.ts already uses at :42-46,96.
const ROUTES_TOUCHED_BY_STORAGE_DERIVED_STATE = ['/sequence', '/flows', '/dimensions', '/compose']

function collectHydrationErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = []
  page.on('console', message => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (/hydrat|did not match|Minified React error/i.test(text)) errors.push(text)
  })
  return errors
}

for (const route of ROUTES_TOUCHED_BY_STORAGE_DERIVED_STATE) {
  test(`no hydration-flash on ${route}`, async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page)
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    // A blank/white screen would also pass a "no console error" check, so also assert
    // the page actually rendered something rather than nothing.
    expect((await page.textContent('body'))?.trim().length ?? 0).toBeGreaterThan(0)
    expect(hydrationErrors).toEqual([])
  })
}

// #43 swapped a raw <a> for next/link on PosesClient.tsx's Home link. A raw <a> and a
// next/link both change the URL, so only a full-page-reload check tells them apart. A
// window-scoped marker set before the click survives a client-side navigation but is
// wiped by a full reload.
test('PosesClient.tsx Home link is a client-side navigation, not a full reload', async ({ page }) => {
  await page.goto('/poses')
  await page.evaluate(() => {
    ;(window as unknown as { __noReloadMarker: boolean }).__noReloadMarker = true
  })

  await page.getByRole('link', { name: /home/i }).first().click()
  await page.waitForURL('**/')

  const markerSurvived = await page.evaluate(
    () => (window as unknown as { __noReloadMarker?: boolean }).__noReloadMarker === true
  )
  expect(markerSurvived).toBe(true)
})
