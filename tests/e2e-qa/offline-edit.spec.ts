import { test, expect } from '@playwright/test'

// The write half of the 6am test (004 US2, scenarios 1, 6 and 7).
//
// `offline-read.spec.ts` proves a flow already on the device can be *read* with no
// connection. This proves the other direction: a teacher can still *change* one, the
// change survives a reload that never touched a network, and — the part that is easy to
// get wrong while building a sync feature — none of it produces sync chrome for someone
// who has no account for anything to sync to.
//
// The suite runs signed out, which is not a gap here but the case worth pinning. Decision
// 3 of the plan says a signed-out edit enqueues nothing at all: the outbox exists only for
// authenticated sessions, and work made without an account is claimed at sign-in instead.
// If that ever stops holding, this test goes red — the label appears for someone with no
// account, telling them truthfully and uselessly that their work is unsynced.

/** Waits for a service worker to own the page. Without controller ownership the next
 *  navigation goes straight to the network and the offline case is never exercised. */
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

test('a flow can be edited offline, and the edit is there after an offline reload', async ({
  page,
  context,
}) => {
  const title = `Offline edit ${Date.now()}`
  const editedTitle = `${title} — changed`

  // Warm both documents online. /flows is where the edit is read back, so its shell has
  // to be cached before the connection goes away.
  await page.goto('/flows')
  await expect(page.getByTestId('flows-list')).toBeVisible()
  await waitForServiceWorker(page)
  // A second online load, so the worker is unambiguously in control of this URL and the
  // document is in the cache rather than merely on its way there. The first load raced
  // the worker's activation and so was never cached.
  await page.reload()
  await expect(page.getByTestId('flows-list')).toBeVisible()

  await page.goto('/compose')
  await page.waitForSelector('[data-testid="compose-search-input"]')

  await page.getByTestId('compose-search-input').fill('mountain')
  const result = page.locator('[data-testid^="compose-add-pose-"]').first()
  await expect(result).toBeVisible({ timeout: 5000 })
  await result.click()

  await page.getByTestId('compose-title-input').fill(title)
  await page.getByTestId('compose-save-button').click()
  await expect(page.getByTestId('compose-save-button')).toHaveText('Saved')

  // ---- From here on there is no network. ----
  await context.setOffline(true)

  await page.getByTestId('compose-title-input').fill(editedTitle)
  // Not clicked: the debounced autosave is what a teacher actually relies on, and it is
  // the path that has to work with the connection gone.
  await expect(page.getByTestId('compose-save-button')).toHaveText('Saved', { timeout: 10_000 })
  await expect(page.getByTestId('compose-save-error')).toHaveCount(0)

  // The edit is durable, not merely on screen. A reload with no connection is the only
  // assertion that distinguishes those two.
  await page.goto('/flows')
  await expect(page.getByTestId('flows-list')).toBeVisible()
  await expect(page.getByText(editedTitle)).toBeVisible()
  await expect(page.getByText(title, { exact: true })).toHaveCount(0)

  // Scenarios 6 and 7: nothing to say, so nothing said. No label, no banner, no spinner —
  // signed out, there is no account for the work to be behind on.
  await expect(page.getByTestId('sync-label')).toHaveCount(0)
  await expect(page.getByTestId('sync-failure-notice')).toHaveCount(0)

  // Back online, with no user action at all. The edit stays, and still nothing appears.
  await context.setOffline(false)
  await page.reload()
  await expect(page.getByText(editedTitle)).toBeVisible()
  await expect(page.getByTestId('sync-label')).toHaveCount(0)
  await expect(page.getByTestId('sync-failure-notice')).toHaveCount(0)
})
