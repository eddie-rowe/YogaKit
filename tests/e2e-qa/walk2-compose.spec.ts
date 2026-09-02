import { test, expect } from '@playwright/test'

test('Walk 2: Build a short class from scratch', async ({ page }) => {
  await page.goto('/compose')
  await page.waitForSelector('[data-testid="compose-search-input"]')
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/05-compose-empty.png' })

  async function addPose(query: string) {
    await page.getByTestId('compose-search-input').fill(query)
    await page.waitForTimeout(300)
    const result = page.locator('[data-testid^="compose-add-pose-"]').first()
    await expect(result).toBeVisible({ timeout: 5000 })
    await result.click()
  }

  // Add several poses spanning different geometry (to trigger friction variety)
  await addPose('mountain')
  await addPose('down dog')
  await addPose('savasana')
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/06-compose-items-added.png' })

  const items = page.locator('[data-testid^="compose-item-"][data-testid*="compose-item-0"], [data-testid="compose-item-0"], [data-testid="compose-item-1"], [data-testid="compose-item-2"]')
  await expect(page.getByTestId('compose-item-0')).toBeVisible()
  await expect(page.getByTestId('compose-item-1')).toBeVisible()
  await expect(page.getByTestId('compose-item-2')).toBeVisible()

  // set breaths on item 0, seconds on item 1
  const measure0 = page.getByTestId('compose-item-measure-0')
  await measure0.locator('select').selectOption('breaths')
  await measure0.locator('input[type="number"]').fill('4')

  const measure1 = page.getByTestId('compose-item-measure-1')
  await measure1.locator('select').selectOption('seconds')
  await measure1.locator('input[type="number"]').fill('90')

  await expect(page.getByTestId('compose-total-duration')).toBeVisible()
  const totalText1 = await page.getByTestId('compose-total-duration').innerText()

  // seam indicators driven by real friction data — check tier attr differs per seam or at least exists
  const seams = page.locator('[data-testid^="compose-seam-"]')
  const seamCount = await seams.count()
  expect(seamCount).toBeGreaterThanOrEqual(2)
  const seam0Tier = await seams.nth(0).getAttribute('data-tier')
  const seam1Tier = await seams.nth(1).getAttribute('data-tier')
  console.log('seam tiers', seam0Tier, seam1Tier)
  expect(seam0Tier).toBeTruthy()

  // reorder by button: move item 2 (savasana) up
  await page.getByTestId('compose-item-reorder-up-2').click()
  await page.waitForTimeout(150)
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/07-compose-reordered.png' })

  // re-fetch total after reorder to confirm it recalculates/stays live
  const totalText2 = await page.getByTestId('compose-total-duration').innerText()
  console.log('totals', totalText1, totalText2)

  // Add stillness button
  const addStillnessBtn = page.getByRole('button', { name: /add stillness/i })
  await expect(addStillnessBtn).toBeVisible()
  await addStillnessBtn.click()
  await page.waitForTimeout(150)

  // Now end the flow on a non-stillness pose to trigger validator note — actually savasana
  // was moved earlier; check for validator warnings appearing (amber note)
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/08-compose-with-stillness.png' })

  const warnings = page.locator('[data-testid^="validator-warning-"]')
  const warningCount = await warnings.count()
  console.log('warning count after adding stillness at end:', warningCount)

  // Force the no-closing-stillness warning: add a non-stillness pose last
  await addPose('triangle')
  await page.waitForTimeout(200)
  const warnings2 = page.locator('[data-testid^="validator-warning-"]')
  const warningCount2 = await warnings2.count()
  console.log('warning count after ending on non-stillness pose:', warningCount2)
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/09-compose-validator-warning.png' })
  expect(warningCount2).toBeGreaterThan(0)

  // Save should not be blocked
  const saveBtn = page.getByRole('button', { name: /^save$|^saved$/i })
  await saveBtn.click()
  await page.waitForTimeout(300)
  await expect(saveBtn).toHaveText(/saved/i)
})
