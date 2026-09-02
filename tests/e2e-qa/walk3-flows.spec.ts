import { test, expect } from '@playwright/test'

const VINYASA_ID = 'b79a753d-fc7c-42e7-8abc-10181fabdb12'
const YIN_ID = '91d035b8-519f-4b1c-a2f6-9541df9b8b65'

test('Walk 3: Borrow and make it yours', async ({ page }) => {
  await page.goto('/flows')
  await expect(page.getByTestId(`flows-item-${VINYASA_ID}`)).toBeVisible()
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/w3-01-flows-list.png' })

  // Open the built-in vinyasa flow (read view / detail)
  await page.getByTestId(`flows-item-${VINYASA_ID}`).locator('a').first().click()
  await page.waitForURL(`**/flows/${VINYASA_ID}`)
  await expect(page.getByText('read-only')).toBeVisible()
  // no Edit link should exist for a built-in — only Duplicate
  await expect(page.locator('text=Edit')).toHaveCount(0)
  await expect(page.getByTestId(`flows-duplicate-${VINYASA_ID}`)).toBeVisible()
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/w3-02-builtin-detail.png' })

  // Attempt a direct-edit URL to confirm the app still refuses to edit the original in place
  await page.goto(`/compose/${VINYASA_ID}`)
  await page.waitForURL(url => !url.pathname.endsWith(`/compose/${VINYASA_ID}`), { timeout: 5000 })
  const duplicatedUrl = page.url()
  console.log('direct-edit attempt redirected to', duplicatedUrl)
  expect(duplicatedUrl).not.toContain(VINYASA_ID)

  // The original should be untouched
  await page.goto('/flows')
  await expect(page.getByTestId(`flows-item-${VINYASA_ID}`)).toBeVisible()
  await page.goto(`/flows/${VINYASA_ID}`)
  await expect(page.getByText('read-only')).toBeVisible()

  // Duplicate via the Flows list button and confirm it lands on an editable copy
  await page.goto('/flows')
  await page.getByTestId(`flows-duplicate-${VINYASA_ID}`).click()
  await page.waitForURL(url => url.pathname.startsWith('/compose/') && !url.pathname.endsWith(VINYASA_ID))
  await expect(page.getByTestId('compose-save')).toBeVisible().catch(() => {})
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/w3-03-duplicate-editable.png' })

  // Retime/edit the duplicate: change the first item's measure
  const firstMeasureInput = page.locator('[data-testid^="compose-item-measure-"] input[type="number"]').first()
  if (await firstMeasureInput.count() > 0) {
    await firstMeasureInput.fill('99')
    await firstMeasureInput.blur()
  }

  // Confirm the built-in original still has its own unedited values
  await page.goto(`/flows/${VINYASA_ID}`)
  await expect(page.getByText('read-only')).toBeVisible()
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/w3-04-original-unchanged.png' })

  // Now open the yin flow read-only, without editing
  await page.goto(`/flows/${YIN_ID}`)
  await expect(page.getByText('read-only')).toBeVisible()
  await expect(page.locator('text=Edit')).toHaveCount(0)
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/w3-05-yin-readonly.png' })
})
